import { Config as LoggerConfig } from '@dataverse/logger';
import { AqlValue, GeneratedAqlQuery } from 'arangojs/aql';
import { DocumentMetadata } from 'arangojs/documents';
import ArangoDBProvider, { ArangoError } from '..';
import ArangoConfig from '../types/arango-config.interface';

const doc: DocumentMetadata = {
  _key: 'key',
  _id: 'id',
  _rev: 'rev',
};
const query: GeneratedAqlQuery = {
  _source: function (): { strings: string[]; args: AqlValue[] } {
    throw new Error('Function not implemented.');
  },
  query: '',
  bindVars: {},
};
const queryResult = {
  all: () => ['result'],
};
const view = {
  updateProperties: jest.fn(),
};
const mockExists = jest.fn();
const mockClose = jest.fn();
const mockDropDatabase = jest.fn();
const mockCreateDatabase = jest.fn();
const mockCreateCollection = jest.fn();
const mockCreateEdgeCollection = jest.fn();
const mockCreateView = jest.fn().mockResolvedValue(view);
const mockSave = jest.fn().mockResolvedValue(doc);
const mockQuery = jest.fn().mockResolvedValue(queryResult);
const mockDocument = jest.fn().mockResolvedValue(doc);
const mockTruncate = jest.fn();

jest.mock('arangojs', () => {
  const aql = function () {
    return query;
  };

  aql.join = jest.fn();

  return {
    Database: function () {
      return {
        exists: mockExists,
        close: mockClose,
        dropDatabase: mockDropDatabase,
        createDatabase: mockCreateDatabase,
        createCollection: mockCreateCollection,
        createEdgeCollection: mockCreateEdgeCollection,
        createView: mockCreateView,
        collection: () => {
          return {
            save: mockSave,
            document: mockDocument,
            truncate: mockTruncate,
          };
        },
        view: () => {
          return {};
        },
        query: mockQuery,
      };
    },
    aql: aql,
  };
});

describe('@dataverse/arangodb', () => {
  let testObject: ArangoDBProvider;
  const username = 'user';
  const password = 'password';
  const viewName = 'collection';
  const collectionName = 'collection';
  const id = 'id';
  const edgeViewName = 'edge_wiew';
  const edgeCollectionName = 'edge_collection';
  const relatedCollectionName = 'related_collection';
  const entityName = 'entity';

  beforeEach(() => {
    const config: ArangoConfig = {
      dbName: 'database',
      uri: 'uri',
    };

    const loggerConfig: LoggerConfig = {
      appName: 'test-app-name',
      moduleName: 'arangodb-test',
      logLevel: 'info',
      logStyle: 'cli',
    };

    testObject = new ArangoDBProvider(config, loggerConfig);
    mockClose.mockClear();
    mockQuery.mockClear();
  });

  it('should construct the arangodb with arango config and logger config option', () => {
    // assert
    expect(testObject).toBeDefined();
  });

  it('should throw error when db.exists throws error', async () => {
    // arrange
    mockExists.mockRejectedValueOnce(new Error());
    let thrown = null;

    // act
    try {
      await testObject.initializeDBConnection(username, password);
    } catch (e) {
      thrown = e;
    }

    // assert
    expect(thrown).not.toBeNull();
    expect(mockExists).toBeCalled();
  });

  it('should not throw error when initializeDBConnection is called', async () => {
    // arrange
    let thrown = null;

    // act
    try {
      await testObject.initializeDBConnection(username, password);
    } catch (e) {
      thrown = e;
    }

    // assert
    expect(thrown).toBeNull();
    expect(mockExists).toBeCalled();
  });

  it('should call close when disconnectDB', async () => {
    // arrange
    const mockCallback = jest.fn();

    // act
    await testObject.initializeDBConnection(username, password);
    testObject.disconnectDB(mockCallback);

    // assert
    expect(mockCallback).toBeCalled();
    expect(mockClose).toBeCalled();
  });

  it('should throw given db is not initialized when disconnectDB', async () => {
    // arrange
    const mockCallback = jest.fn();

    // act & assert
    expect(() => testObject.disconnectDB(mockCallback)).toThrowError(TypeError);
  });

  it('should call dropDatabase when removeDB', async () => {
    // act
    await testObject.initializeDBConnection(username, password);
    await testObject.removeDB();

    // assert
    expect(mockDropDatabase).toBeCalled();
  });

  it('should call createDatabase when addDB', async () => {
    // act
    await testObject.initializeDBConnection(username, password);
    await testObject.addDB();

    // assert
    expect(mockCreateDatabase).toBeCalled();
  });

  it('should call createCollection when createCollection called', async () => {
    // act
    await testObject.initializeDBConnection(username, password);
    await testObject.createCollection(collectionName);

    // assert
    expect(mockCreateCollection).toBeCalled();
  });

  it('should call edgeCollection when createEdgeCollection', async () => {
    // act
    await testObject.initializeDBConnection(username, password);
    await testObject.createEdgeCollection(collectionName);

    // assert
    expect(mockCreateEdgeCollection).toBeCalled();
  });

  it('should call createView when createView called', async () => {
    // act
    await testObject.initializeDBConnection(username, password);
    await testObject.createView(viewName, collectionName);

    // assert
    expect(mockCreateView).toBeCalled();
  });

  it('should call save when addToCollection', async () => {
    // act
    await testObject.initializeDBConnection(username, password);
    const result = await testObject.addToCollection(collectionName, {});

    // assert
    expect(mockSave).toBeCalled();
    expect(result).toBe(doc);
  });

  it('should call query when cleanCollection', async () => {
    // act
    await testObject.initializeDBConnection(username, password);
    await testObject.cleanCollection(collectionName);

    // assert
    expect(mockTruncate).toBeCalled();
  });

  it('should call document when getByIdFromCollection', async () => {
    // act
    await testObject.initializeDBConnection(username, password);
    const result = await testObject.getByIdFromCollection(collectionName, id);

    // assert
    expect(mockDocument).toBeCalled();
    expect(result).toBe(doc);
  });

  it('should throw error given docment throws error when getByIdFromCollection', async () => {
    // arrange
    mockDocument.mockRejectedValueOnce(new Error());
    let thrown = null;

    // act
    await testObject.initializeDBConnection(username, password);
    try {
      await testObject.getByIdFromCollection(collectionName, id);
    } catch (e) {
      thrown = e;
    }

    // assert
    expect(mockDocument).toBeCalled();
    expect(thrown).not.toBeNull();
  });

  it('should call query when getByFieldNameFromCollection', async () => {
    // act
    await testObject.initializeDBConnection(username, password);
    const result = await testObject.getByFieldNameFromCollection(collectionName, 'field', 'value');

    // assert
    expect(mockQuery).toBeCalled();
    expect(result).toBe(queryResult);
  });

  it('should call query when getByFieldNameFromCollection', async () => {
    // act
    await testObject.initializeDBConnection(username, password);
    const result = await testObject.getFromCollection(collectionName, 'order', 'sort', 1, 0);

    // assert
    expect(mockQuery).toBeCalled();
    expect(result).toBe(queryResult);
  });

  it('should call query given filter when getByFieldNameFromCollection', async () => {
    // arrange
    const filter = 'doc.someProperty == "some value"';

    // act
    await testObject.initializeDBConnection(username, password);
    const result = await testObject.getFromCollection(collectionName, 'order', 'sort', 1, 0, filter);

    // assert
    expect(mockQuery).toBeCalled();
    expect(result).toBe(queryResult);
  });

  it('should create an instance with error parameter', () => {
    const errorMessage = 'SomeError';
    const error = new Error(errorMessage);
    const testedError = new ArangoError(error);

    expect(testedError.message).toBe(errorMessage);
    expect(testedError.code).toBe('error.unexpected');
    expect(testedError.name).toBe('ArangoError');
    expect(testedError.status).toBe(500);
    expect(testedError.isPublic).toBe(false);
  });

  it('should create query object with the given options', async () => {
    // arrange
    await testObject.initializeDBConnection(username, password);

    // act
    const results = await testObject.getDocuments({
      documentCollection: 'manifest',
      limitBy: {
        offset: 0,
        limit: 1,
      },
      sortBy: {
        field: 'manifest.discoveryPort.createdDateTime',
        order: 'DESC',
      },
      filterBy: {
        filter: {
          gitRepoInfo: {
            owner: 'Tospaa',
          },
          status: 'InTest',
        },
      },
    });

    // assert
    expect(results).not.toBeNull();
    expect(mockQuery).toHaveBeenCalledWith(
      {
        query:
          'FOR doc IN @@collection_1 FILTER doc.@path_2 == @filter_3 && doc.@path_4 == @filter_5 SORT doc.@sortField_6 @sortOrder_7 LIMIT @limitByOffset_8, @limitByLimit_9 RETURN doc',
        bindVars: {
          '@collection_1': 'manifest',
          filter_3: 'Tospaa',
          filter_5: 'InTest',
          limitByLimit_9: 1,
          limitByOffset_8: 0,
          path_2: ['gitRepoInfo', 'owner'],
          path_4: ['gitRepoInfo', 'status'],
          sortField_6: ['manifest', 'discoveryPort', 'createdDateTime'],
          sortOrder_7: 'DESC',
        },
      },
      undefined,
    );
  });

  it('should call query when getDocumentsWithCount', async () => {
    // arrange
    await testObject.initializeDBConnection(username, password);

    // act
    const results = await testObject.getDocumentsWithCount({ documentCollection: 'manifest' });

    // assert
    expect(results).not.toBeNull();
    expect(mockQuery).toHaveBeenCalledWith(
      {
        query:
          'LET total = FIRST(FOR doc IN @@collection_1 COLLECT WITH COUNT INTO length RETURN length) LET docs = (FOR doc IN @@collection_1 RETURN doc) RETURN { docs, total }',
        bindVars: {
          '@collection_1': 'manifest',
        },
      },
      undefined,
    );
  });

  it('should call query when executeRawQuery', async () => {
    // arrange
    const queryLocal = 'FOR doc IN @@coll';
    const bindVars = {
      '@coll': collectionName,
    };

    // act
    await testObject.initializeDBConnection(username, password);
    const result = await testObject.executeRawQuery({ query: queryLocal, bindVars });

    // assert
    expect(mockQuery).toBeCalled();
    expect(result).toStrictEqual(['result']);
  });

  it('should call query when executeRawQueryReturnFirst', async () => {
    // arrange
    const queryLocal = 'FOR doc IN @@coll';
    const bindVars = {
      '@coll': collectionName,
    };

    // act
    await testObject.initializeDBConnection(username, password);
    const result = await testObject.executeRawQueryReturnFirst({ query: queryLocal, bindVars });

    // assert
    expect(mockQuery).toBeCalled();
    expect(result).toStrictEqual('result');
  });

  it('should call query when getOutBoundDocumentsForEntityId', async () => {
    // act
    await testObject.initializeDBConnection(username, password);
    const result = await testObject.getOutBoundDocumentsForEntityId(edgeViewName, entityName, id, collectionName);

    // assert
    expect(mockQuery).toBeCalled();
    expect(result).toStrictEqual(['result']);
  });

  it('should call query when getLinksFromViewForToId', async () => {
    // act
    await testObject.initializeDBConnection(username, password);
    const result = await testObject.getLinksFromViewForToId(edgeViewName, collectionName, id);

    // assert
    expect(mockQuery).toBeCalled();
    expect(result).toStrictEqual(['result']);
  });

  it('should call query when getLinksFromViewForId', async () => {
    // act
    await testObject.initializeDBConnection(username, password);
    const result = await testObject.getLinksFromViewForId(edgeViewName, collectionName, id);

    // assert
    expect(mockQuery).toBeCalled();
    expect(result).toStrictEqual(['result']);
  });

  it('should call query when addToCollectionWithRelatedDocument', async () => {
    // arrange
    await testObject.initializeDBConnection(username, password);

    // act
    const result = await testObject.addToCollectionWithRelatedDocument({
      rootDocCollectionName: 'upper_collection',
      relatedDoc: {
        data: 'value',
      },
      edgeCollectionName: 'edge_collection',
      relatedCollectionName: 'related_collection',
      rootDoc: {
        data: 'this is related doc',
      },
    });

    // assert
    expect(mockQuery).toHaveBeenCalledWith(
      {
        bindVars: {
          '@edgeCollectionName': 'edge_collection',
          '@relatedCollectionName': 'related_collection',
          '@rootDocCollectionName': 'upper_collection',
          additionalLinkData: {},
          relatedDoc: {
            data: 'value',
          },
          rootDoc: {
            data: 'this is related doc',
          },
        },
        query: `LET rootDoc = FIRST(INSERT @rootDoc INTO @@rootDocCollectionName RETURN NEW)
      LET related = FIRST(INSERT @relatedDoc INTO @@relatedCollectionName RETURN NEW)
      INSERT MERGE({
        _from: rootDoc._id,
        _to: related._id,
        _key: UUID()
      }, @additionalLinkData) into @@edgeCollectionName
      RETURN { rootDoc, related }`,
      },
      undefined,
    );
    expect(result).toStrictEqual('result');
  });

  it('should call query when addRelatedDocument', async () => {
    // arrange
    await testObject.initializeDBConnection(username, password);

    // act
    const result = await testObject.addRelatedDocument({
      rootDocCollectionName: 'upper_collection',
      relatedDoc: {
        data: 'value',
      },
      edgeCollectionName: 'edge_collection',
      relatedCollectionName: 'related_collection',
      rootDocId: 'some-uuid',
    });

    // assert
    expect(mockQuery).toHaveBeenCalledWith(
      {
        bindVars: {
          '@edgeCollectionName': 'edge_collection',
          '@relatedCollectionName': 'related_collection',
          fromId: 'upper_collection/some-uuid',
          additionalLinkData: {},
          relatedDoc: {
            data: 'value',
          },
        },
        query: `LET related = FIRST(INSERT @relatedDoc INTO @@relatedCollectionName RETURN NEW)
      INSERT MERGE({
        _from: @fromId,
        _to: related._id,
        _key: UUID()
      }, @additionalLinkData) into @@edgeCollectionName
      RETURN related`,
      },
      undefined,
    );
    expect(result).toStrictEqual('result');
  });

  it('should call query when getDocumentWithRelatedDocuments', async () => {
    // arrange
    await testObject.initializeDBConnection(username, password);

    // act
    const result = await testObject.getDocumentWithRelatedDocuments(collectionName, id, {
      edgeCollections: edgeCollectionName,
      relatedCollections: relatedCollectionName,
    });

    // assert
    expect(mockQuery).toHaveBeenCalledWith(
      {
        bindVars: {
          '@collection_1': 'collection',
          '@edge_5': 'edge_collection',
          '@target_4': 'related_collection',
          depth_6: 1,
          filter_3: 'id',
          path_2: ['_key'],
        },
        query:
          'WITH @@target_4 FOR rootDoc IN @@collection_1 FILTER rootDoc.@path_2 == @filter_3 LET related = (FOR vertex IN 1..@depth_6 ANY rootDoc._id @@edge_5 RETURN vertex) RETURN MERGE(rootDoc, { related })',
      },
      undefined,
    );
    expect(result).toStrictEqual('result');
  });

  it('should call query when getDocumentWithRelatedDocumentsWithCount', async () => {
    // arrange
    await testObject.initializeDBConnection(username, password);

    // act
    const result = await testObject.getDocumentWithRelatedDocumentsWithCount(collectionName, id, {
      edgeCollections: [edgeCollectionName, 'other_edge_collection'],
      relatedCollections: [relatedCollectionName, 'other_related_collection'],
    });

    // assert
    expect(mockQuery).toHaveBeenCalledWith(
      {
        bindVars: {
          '@collection_1': 'collection',
          '@edge_6': 'edge_collection',
          '@edge_7': 'other_edge_collection',
          '@target_4': 'related_collection',
          '@target_5': 'other_related_collection',
          depth_8: 1,
          filter_3: 'id',
          path_2: ['_key'],
        },
        query:
          'WITH @@target_4, @@target_5 FOR rootDoc IN @@collection_1 FILTER rootDoc.@path_2 == @filter_3 LET related = FIRST(LET total = FIRST(FOR vertex IN 1..@depth_8 ANY rootDoc._id @@edge_6, @@edge_7 COLLECT WITH COUNT INTO length RETURN length) LET docs = (FOR vertex IN 1..@depth_8 ANY rootDoc._id @@edge_6, @@edge_7 RETURN vertex) RETURN { docs, total }) RETURN MERGE(rootDoc, { related })',
      },
      undefined,
    );
    expect(result).toStrictEqual('result');
  });
});
