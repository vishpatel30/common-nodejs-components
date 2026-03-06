import ApiError, { ResourceNotFoundError } from '@dataverse/errors';
import { Config as LoggerConfig, getLogger, Logger } from '@dataverse/logger';
import { aql, Database } from 'arangojs';
import { AqlQuery } from 'arangojs/aql';
import { ArrayCursor } from 'arangojs/cursor';
import { QueryOptions } from 'arangojs/database';
import { DocumentMetadata as DocumentMetadataImported, EdgeMetadata as EdgeMetadataImported } from 'arangojs/documents';
import httpStatus from 'http-status';
import { ArangoDocumentQueryBuilder } from './querybuilder/document-query-builder';
import { ArangoEdgeQueryBuilder } from './querybuilder/edge-query-builder';
import ArangoConfig from './types/arango-config.interface';
import { ArangoDocumentQueryOptions, ArangoEdgeQueryOptions } from './types/arango-query-options.interface';
import { WithCount } from './types/with-count.type';
import { WithRelatedWithCount } from './types/with-related-with-count.type';
import { WithRelated } from './types/with-related.type';

export class ArangoError extends ApiError {
  constructor(error: Error) {
    super(
      error.message,
      {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        isPublic: false,
      },
      error,
    );
  }
}

export class RevisionNotMatchingError extends ApiError {
  constructor(id: string, error: Error) {
    super(
      `conflict, _rev values do not match for resource: ${id}`,
      {
        status: httpStatus.PRECONDITION_FAILED,
        code: 'error.resource.revision-not-matching',
        isPublic: true,
      },
      error,
    );
  }
}

export type DocumentMetadata = DocumentMetadataImported;
export type EdgeMetadata = EdgeMetadataImported;

export class ArangoDBProvider {
  private db!: Database;

  private logger?: Logger;

  private config: ArangoConfig;

  private shouldWaitForViewUpdate: boolean;

  constructor(config: ArangoConfig, loggerConfig?: LoggerConfig) {
    this.config = config;
    this.logger = loggerConfig ? getLogger(loggerConfig) : undefined;
    if (process.env.NODE_ENV === 'test') {
      this.shouldWaitForViewUpdate = true;
    } else {
      this.shouldWaitForViewUpdate = false;
    }
  }

  public async initializeDBConnection(username: string, password: string, dbName?: string) {
    this.db = new Database({
      url: this.config.uri,
      databaseName: dbName ?? this.config.dbName,
      auth: { username, password },
    });
    try {
      await this.db.exists();
      this.logger?.info(`Connected DB successfully on ${this.config.uri}`);
    } catch (err) {
      this.logger?.error(err instanceof Error ? err.message : err);
      throw err;
    }
  }

  public disconnectDB(cb?: Function): void {
    this.db.close();
    if (cb) {
      cb(null);
    }
    this.logger?.info('Closed DB successfully');
  }

  public async removeDB(databaseName: string = this.config.dbName): Promise<void> {
    await this.db.dropDatabase(databaseName);
    this.logger?.info(`Dropped DB ${databaseName} successfully`);
  }

  public async addDB(databaseName: string = this.config.dbName): Promise<Database> {
    const newDb = await this.db.createDatabase(databaseName);
    this.logger?.info(`Created DB ${databaseName} successfully`);
    return newDb;
  }

  public async switchDB(database: string | Database, username?: string, password?: string): Promise<void> {
    if (database instanceof Database) {
      this.db = database;
    } else {
      if (!username || !password) throw new Error('Please provide username and password');
      return this.initializeDBConnection(username, password, database);
    }
  }

  public async createCollection(collectionName: string): Promise<void> {
    await this.db.createCollection(collectionName);
    this.logger?.info(`Created the ${collectionName} collection successfully`);
  }

  public async createEdgeCollection(collectionName: string): Promise<void> {
    await this.db.createEdgeCollection(collectionName);
    this.logger?.info(`Created the ${collectionName} edge collection successfully`);
  }

  public async createView(viewName: string, collectionName: string): Promise<void> {
    const view = await this.db.createView(viewName);
    const link = {
      analyzers: ['identity', 'text_en'],
      fields: {},
      includeAllFields: true,
      primarySortCompression: 'lz4',
      storeValues: 'id',
      trackListPositions: false,
    };
    const props: Record<string, any> = { links: {} };
    props.links[collectionName] = link;
    await view.updateProperties(props);
    this.logger?.info(`Created the ${viewName} view successfully`);
  }

  public async cleanCollection(collectionName: string): Promise<void> {
    const collection = this.db.collection(collectionName);
    await collection.truncate();
  }

  public async addToCollection(collectionName: string, item: any): Promise<DocumentMetadata> {
    this.logger?.debug(`AddToCollection collectionName: %s, with item: %s`, collectionName, item);
    const collection = this.db.collection(collectionName);
    const doc = await collection.save(item, { returnNew: true });
    return doc;
  }

  public async updateDocumentInCollection(
    collectionName: string,
    id: string,
    docPatch: any,
    rev?: string,
  ): Promise<DocumentMetadata & { new?: any }> {
    this.logger?.debug(
      'Update DocumentCollection collectionName: %s, with docId: %s and docPatch: %o',
      collectionName,
      id,
      docPatch,
    );
    const collection = this.db.collection(collectionName);
    try {
      if (rev) {
        return await collection.update(
          id,
          { _rev: rev, ...docPatch },
          { returnNew: true, ignoreRevs: false, keepNull: false },
        );
      }
      return await collection.update(id, docPatch, { returnNew: true, keepNull: false });
    } catch (error: any) {
      if (error.code === 404) {
        throw new ResourceNotFoundError(id, error);
      }
      if (error.code === 412) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw new RevisionNotMatchingError(id, error);
      }
      throw error;
    }
  }

  public async deleteDocumentInCollection(collectionName: string, id: string): Promise<DocumentMetadata> {
    this.logger?.debug('Delete DocumentCollection collectionName: %s, with docId: %s', collectionName, id);
    const collection = this.db.collection(collectionName);
    try {
      return await collection.remove(id);
    } catch (error: any) {
      if (error.code === 404) {
        throw new ResourceNotFoundError(id, error);
      }
      if (error.code === 412) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw new RevisionNotMatchingError(id, error);
      }
      throw error;
    }
  }

  public async getByIdFromCollection<T = any>(collectionName: string, id: string): Promise<DocumentMetadata & T> {
    const collection = this.db.collection(collectionName);
    try {
      const doc = await collection.document(id);
      return doc;
    } catch (error: any) {
      throw new ResourceNotFoundError(id, error);
    }
  }

  public async getLinksFromViewForId(
    edgeCollectionViewName: string,
    linkedCollectionName: string,
    id: string,
  ): Promise<any> {
    const view = this.db.view(edgeCollectionViewName);

    const aqlQuery = aql`
      FOR edge in ${view}
      SEARCH edge._from == ${linkedCollectionName + '/' + id}
      OPTIONS { waitForSync: ${this.shouldWaitForViewUpdate} }
      RETURN edge
    `;

    this.logger?.debug(`Fetch query %s, with params: %s`, aqlQuery.query, aqlQuery.bindVars);

    const cursor = await this.db.query(aqlQuery);
    return cursor.all();
  }

  public async getLinksFromViewForToId(
    edgeCollectionViewName: string,
    linkedCollectionName: string,
    id: string,
  ): Promise<any> {
    const view = this.db.view(edgeCollectionViewName);

    const aqlQuery = aql`
      FOR edge in ${view}
      SEARCH edge._to == ${linkedCollectionName + '/' + id}
      OPTIONS { waitForSync: ${this.shouldWaitForViewUpdate} }
      RETURN edge._from
    `;

    this.logger?.debug(`Fetch query %s, with params: %s`, aqlQuery.query, aqlQuery.bindVars);

    const cursor = await this.db.query(aqlQuery);
    return cursor.all();
  }

  public async getOutBoundDocumentsForEntityId(
    edgeCollectionViewName: string,
    entityName: string,
    entityId: any,
    collectionName: string,
  ): Promise<Array<any>> {
    const view = this.db.view(edgeCollectionViewName);
    const collection = this.db.collection(collectionName);

    const entityValue = entityName + '/' + entityId;

    const aqlQuery = aql`FOR edge IN ${view}
      OPTIONS { waitForSync: ${this.shouldWaitForViewUpdate} }
      FOR doc IN ${collection}
      FILTER edge._from == ${entityValue} && doc._id == edge._to
      FILTER doc.deleted == false || doc.deleted == null
      RETURN doc`;

    this.logger?.debug(`Fetch query %s, with params: %s`, aqlQuery.query, aqlQuery.bindVars);
    const cursor = await this.db.query(aqlQuery);
    return cursor.all();
  }

  /**
   * @deprecated Please use getDocuments method instead of getFromCollection
   */
  public getFromCollection(
    collectionName: string,
    sortField: string,
    sortOrder: string,
    limit: number,
    offset: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filter?: any,
  ): Promise<ArrayCursor<any>> {
    const collection = this.db.collection(collectionName);
    let aqlQuery;
    const filters = [];

    if (filter) {
      filters.push(aql`FILTER ${filter}`);
    }

    aqlQuery = aql` FOR doc IN ${collection} SORT doc.${sortField} ${sortOrder}
     ${aql.join(filters)}
    LIMIT ${offset}, ${limit} RETURN doc`;

    this.logger?.debug(`Fetch query %s, with params: %s`, aqlQuery.query, aqlQuery.bindVars);

    return this.db.query(aqlQuery);
  }

  public getByFieldNameFromCollection(
    collectionName: string,
    fieldName: string,
    value: any,
  ): Promise<ArrayCursor<any>> {
    const collection = this.db.collection(collectionName);
    const aqlQuery = aql`
      FOR doc IN ${collection}
          FILTER doc.${fieldName} == ${value}
          RETURN doc
    `;

    this.logger?.debug(`Fetch query %s, with params: %s`, aqlQuery.query, aqlQuery.bindVars);

    return this.db.query(aqlQuery);
  }

  public async executeRawQuery<T = any>(aqlQuery: AqlQuery, options?: QueryOptions) {
    this.logger?.debug('Query %s, with params: %O', aqlQuery.query, aqlQuery.bindVars);
    const cur = await this.db.query(aqlQuery, options);
    return cur.all() as Promise<Array<T>>;
  }

  /**
   * Just a shortcut method for returning the first result from the query result set
   * ```js
   * const resultSet = await this.executeRawQuery<T>(query, options);
   * return resultSet[0];
   * ```
   */
  public async executeRawQueryReturnFirst<T = any>(aqlQuery: AqlQuery, options?: QueryOptions) {
    const resultSet = await this.executeRawQuery<T>(aqlQuery, options);
    return resultSet[0];
  }

  public async addToCollectionWithRelatedDocument<T = any, R = any>(inputArgs: {
    rootDocCollectionName: string;
    rootDoc: object;
    edgeCollectionName: string;
    relatedCollectionName: string;
    relatedDoc: object;
    additionalLinkData?: object;
  }) {
    const aqlQuery = {
      query: `LET rootDoc = FIRST(INSERT @rootDoc INTO @@rootDocCollectionName RETURN NEW)
      LET related = FIRST(INSERT @relatedDoc INTO @@relatedCollectionName RETURN NEW)
      INSERT MERGE({
        _from: rootDoc._id,
        _to: related._id,
        _key: UUID()
      }, @additionalLinkData) into @@edgeCollectionName
      RETURN { rootDoc, related }`,
      bindVars: {
        '@rootDocCollectionName': inputArgs.rootDocCollectionName,
        '@relatedCollectionName': inputArgs.relatedCollectionName,
        '@edgeCollectionName': inputArgs.edgeCollectionName,
        rootDoc: inputArgs.rootDoc,
        relatedDoc: inputArgs.relatedDoc,
        additionalLinkData: inputArgs.additionalLinkData ?? {},
      },
    };

    return this.executeRawQueryReturnFirst<{ rootDoc: T & DocumentMetadata; related: R & DocumentMetadata }>(aqlQuery);
  }

  public async addRelatedDocument<T = any>(inputArgs: {
    rootDocCollectionName: string;
    rootDocId: string;
    edgeCollectionName: string;
    relatedCollectionName: string;
    relatedDoc: object;
    additionalLinkData?: object;
  }) {
    const aqlQuery = {
      query: `LET related = FIRST(INSERT @relatedDoc INTO @@relatedCollectionName RETURN NEW)
      INSERT MERGE({
        _from: @fromId,
        _to: related._id,
        _key: UUID()
      }, @additionalLinkData) into @@edgeCollectionName
      RETURN related`,
      bindVars: {
        '@relatedCollectionName': inputArgs.relatedCollectionName,
        '@edgeCollectionName': inputArgs.edgeCollectionName,
        fromId: `${inputArgs.rootDocCollectionName}/${inputArgs.rootDocId}`,
        relatedDoc: inputArgs.relatedDoc,
        additionalLinkData: inputArgs.additionalLinkData ?? {},
      },
    };

    return this.executeRawQueryReturnFirst<T & DocumentMetadata>(aqlQuery);
  }

  /**
   * Basic query with options.
   *
   * @example
   * ```js
   * // This query will return all documents matches the given example
   * const results = await this.db.getDocuments('manifest', {
   *   filterBy: {
   *     filter: {
   *       gitRepoInfo: {
   *         owner: 'Tospaa',
   *       },
   *     },
   *   },
   * });
   * return results;
   *
   * // This query will return the first document matches the given example
   * const results = await this.db.getDocuments('git_account', {
   *   limitBy: {
   *     offset: 0,
   *     limit: 1,
   *   },
   *   sortBy: {
   *     field: 'dateTs',
   *     order: 'DESC',
   *   },
   *   filterBy: {
   *     filter: {
   *       cognitoUsername: '26fcf457-e31a-4219-91e0-878ed039024c',
   *       status: 'active',
   *     },
   *   },
   * });
   * return results[0];
   *
   * // This query will return all the documents in the given collection
   * const results = await this.db.getDocuments('git_repo');
   * return results;
   * ```
   * @param collectionName The name of the collection
   * @param options Arango Query Options
   * @returns All results matching the given criteria
   */
  public async getDocuments<T = any>(options: ArangoDocumentQueryOptions) {
    if (options.withCount) {
      this.logger?.warn('Consider using getDocumentsWithCount method if you need the total count for type safety');
    }

    const builder = new ArangoDocumentQueryBuilder(options);

    return this.executeRawQuery<T & DocumentMetadata>(builder.prepareQuery());
  }

  public async getDocumentsWithCount<T = any>(options: ArangoDocumentQueryOptions) {
    options.withCount = true;

    const builder = new ArangoDocumentQueryBuilder(options);

    return this.executeRawQueryReturnFirst<WithCount<T & DocumentMetadata>>(builder.prepareQuery());
  }

  public async getDocumentWithRelatedDocuments<T = any, R = any>(
    collectionName: string,
    rootDocId: string,
    options: ArangoEdgeQueryOptions,
  ) {
    if (options.withCount) {
      this.logger?.warn(
        'Consider using getDocumentWithRelatedDocumentsWithCount method if you need the total count for type safety',
      );
    }

    const rootDoc = 'rootDoc';
    const builder = new ArangoDocumentQueryBuilder({
      documentCollection: collectionName,
      filterBy: { filter: { _key: rootDocId } },
    })
      .setDocSelector(rootDoc)
      .addAdditionalQuery('related', new ArangoEdgeQueryBuilder(options).setRootDocSelector(rootDoc));

    return this.executeRawQueryReturnFirst<WithRelated<T & DocumentMetadata, R & DocumentMetadata>>(
      builder.prepareQuery(),
    );
  }

  public async getDocumentWithRelatedDocumentsWithCount<T = any, R = any>(
    collectionName: string,
    rootDocId: string,
    options: ArangoEdgeQueryOptions,
  ) {
    options.withCount = true;

    const rootDoc = 'rootDoc';
    const builder = new ArangoDocumentQueryBuilder({
      documentCollection: collectionName,
      filterBy: { filter: { _key: rootDocId } },
    })
      .setDocSelector(rootDoc)
      .addAdditionalQuery('related', new ArangoEdgeQueryBuilder(options).setRootDocSelector(rootDoc));

    return this.executeRawQueryReturnFirst<WithRelatedWithCount<T & DocumentMetadata, R & DocumentMetadata>>(
      builder.prepareQuery(),
    );
  }

  public registerFunction = (name: string, code: string) => {
    return this.db.createFunction(name, code);
  };
}

export default ArangoDBProvider;
