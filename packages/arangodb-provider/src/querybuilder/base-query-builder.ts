import { AqlQuery } from 'arangojs/aql';
import {
  ArangoDocumentQueryOptions,
  ArangoEdgeQueryOptions,
  Filter,
  FilterObj,
  Primitive,
} from '../types/arango-query-options.interface';

export type BindVars = Record<string, Primitive | Primitive[]>;

export class ArangoBaseQueryBuilder {
  protected bindVars: BindVars = {};

  // eslint-disable-next-line no-use-before-define
  protected additionalQueries: Map<string, ArangoBaseQueryBuilder> = new Map();

  protected withClause = '';

  protected selector = '';

  protected filter = '';

  protected sort = '';

  protected limit = '';

  protected doc = 'doc';

  protected returnClause = 'doc';

  protected inlineQueries = '';

  private _isRootQuery = true;

  private _tick = 0;

  // eslint-disable-next-line no-use-before-define
  private _parent: ArangoBaseQueryBuilder | undefined = undefined;

  constructor(protected options: ArangoDocumentQueryOptions | ArangoEdgeQueryOptions) {}

  public prepareQuery(): AqlQuery {
    this.buildEverything();

    let query = '';

    if (this.options.withCount) {
      query +=
        `${this.withClause}LET total = FIRST(${this.selector}${this.filter}COLLECT WITH COUNT INTO length RETURN length) ` +
        `LET docs = (${this.selector}${this.filter}${this.sort}${this.limit}${this.inlineQueries}RETURN ${this.returnClause}) ` +
        'RETURN { docs, total }';
    } else {
      query += `${this.withClause}${this.selector}${this.filter}${this.sort}${this.limit}${this.inlineQueries}RETURN ${this.returnClause}`;
    }

    return { query, bindVars: this.bindVars };
  }

  public setDocSelector(doc: string) {
    this.checkSafe(doc);
    this.doc = doc;
    return this;
  }

  public getDocSelector() {
    return this.doc;
  }

  public addAdditionalQuery(varName: string, q: ArangoBaseQueryBuilder) {
    this.checkSafe(varName);
    if (varName === this.doc) throw new Error('Additional query variable name cannot be same with doc selector');
    q.setParentQuery(this);
    this.additionalQueries.set(varName, q);
    return this;
  }

  protected buildSelector() {
    throw new Error('Override this method');
  }

  protected buildFilter() {
    if (this.options.filterBy) {
      const filters = this.extractFilters(this.options.filterBy.filter);
      this.filter = `FILTER ${filters.map((e) => e.query).join(' && ')} `;
      for (let filter of filters) {
        this.bindVars = { ...filter.bindVars, ...this.bindVars };
      }
    }
  }

  protected buildSort() {
    if (this.options.sortBy) {
      const sortFieldKeyName = `sortField_${this.getNextGlobalTick()}`;
      const sortOrderKeyName = `sortOrder_${this.getNextGlobalTick()}`;
      this.sort = `SORT ${this.doc}.@${sortFieldKeyName} @${sortOrderKeyName} `;
      this.bindVars[sortFieldKeyName] = this.options.sortBy.field.split('.');
      this.bindVars[sortOrderKeyName] = this.options.sortBy.order;
    }
  }

  protected buildLimit() {
    if (this.options.limitBy) {
      const offsetKeyName = `limitByOffset_${this.getNextGlobalTick()}`;
      const limitKeyName = `limitByLimit_${this.getNextGlobalTick()}`;
      this.limit = `LIMIT @${offsetKeyName}, @${limitKeyName} `;
      this.bindVars[offsetKeyName] = this.options.limitBy.offset;
      this.bindVars[limitKeyName] = this.options.limitBy.limit;
    }
  }

  protected buildWithClause() {
    if (this._isRootQuery) {
      const targets = this.gatherRelatedCollectionsRecursively();

      if (targets.length > 0) {
        this.withClause = `WITH ${this.handleCommaSeparated(targets, 'target')} `;
      }
    }
  }

  protected gatherRelatedCollectionsRecursively(): string[] {
    let targets: string[] = [];
    if ((this.options as ArangoEdgeQueryOptions).relatedCollections) {
      targets = this.concatArrays(targets, (this.options as ArangoEdgeQueryOptions).relatedCollections);
    }

    for (let elem of this.additionalQueries) {
      targets = this.concatArrays(targets, elem[1].gatherRelatedCollectionsRecursively());
    }

    return targets;
  }

  protected buildReturnClause() {
    if (this.additionalQueries.size === 0) {
      this.returnClause = this.doc;
      return;
    }

    this.returnClause = `MERGE(${this.doc}, { ${Array.from(this.additionalQueries.keys()).join(', ')} })`;
  }

  protected buildAdditionalQueries() {
    if (this.additionalQueries.size === 0) {
      return;
    }

    const queries: string[] = [];

    for (let elem of this.additionalQueries) {
      const innerAqlQuery = elem[1].prepareQuery();
      queries.push(
        `LET ${elem[0]} = ${elem[1].options.withCount || elem[1].options.limitBy?.limit === 1 ? 'FIRST' : ''}(${
          innerAqlQuery.query
        }) `,
      );
      this.bindVars = { ...innerAqlQuery.bindVars, ...this.bindVars };
    }

    this.inlineQueries = queries.join('');
  }

  protected buildEverything() {
    this.buildSelector();
    this.buildFilter();
    this.buildSort();
    this.buildLimit();
    this.buildWithClause();
    this.buildReturnClause();
    this.buildAdditionalQueries();
  }

  private isFilterPrimitiveType(filter: any) {
    const checkPrimitive = function (input: any): boolean {
      return (
        typeof input === 'string' ||
        typeof input === 'number' ||
        typeof input === 'boolean' ||
        input === undefined ||
        input === null
      );
    };

    if (!Array.isArray(filter)) {
      return checkPrimitive(filter);
    }

    return filter.every((elem) => checkPrimitive(elem));
  }

  private isFilterProperFilterObject(filter: any) {
    return (
      filter.hasOwnProperty('@value') &&
      this.isFilterPrimitiveType(filter['@value']) &&
      (filter.hasOwnProperty('@operator') || filter.hasOwnProperty('@docNameToFilter'))
    );
  }

  /**
   * Flattens the provided filter object and returns an array with dot notation representation.
   * @example
   * ```js
   * // Given object:
   * const filter = {
   *   gitRepoInfo: {
   *     webhook: 12,
   *     owner: {
   *       name: 'Tospaa',
   *     }
   *   },
   *   state: 'InTest',
   * }
   * // Expected output:
   * [
   *   {
   *     query: 'doc.gitRepoInfo.webhook == \@docgitRepoInfowebhook',
   *     vars: {
   *       bindVarName: 'docgitRepoInfowebhook',
   *       value: 12
   *     }
   *   },
   *   {
   *     query: 'doc.gitRepoInfo.owner.name == \@docgitRepoInfoownername',
   *     vars: {
   *       bindVarName: 'docgitRepoInfoownername',
   *       value: 'Tospaa'
   *     }
   *   },
   *   {
   *     query: 'doc.gitRepoInfo.state == \@docgitRepoInfostate',
   *     vars: {
   *       bindVarName: 'docgitRepoInfostate',
   *       value: 'InTest'
   *     }
   *   }
   * ]
   * ```
   * @param filter Object provided to be flattened.
   * @param prevKey For recursive use only
   * @returns An array of filters
   */
  protected extractFilters(filter: Filter, prevKey?: string): AqlQuery[] {
    prevKey ??= '';
    const filters: AqlQuery[] = [];
    for (let key in filter) {
      if (this.isFilterPrimitiveType(filter[key]) || this.isFilterProperFilterObject(filter[key])) {
        const objectKey = `${prevKey}${key}`;
        const docPath = `path_${this.getNextGlobalTick()}`;
        const bindVarName = `filter_${this.getNextGlobalTick()}`;
        const query = `${(filter[key] as FilterObj)['@docNameToFilter'] ?? this.doc}.@${docPath} ${
          (filter[key] as FilterObj)['@operator'] ?? '=='
        } @${bindVarName}`;
        const bindVars: BindVars = {
          [docPath]: objectKey.split('.'),
          [bindVarName]: (filter[key] as FilterObj)['@value'] ?? (filter[key] as Primitive | Primitive[]),
        };
        filters.push({ query, bindVars });

        continue;
      }

      prevKey += `${key}.`;
      filters.push(...this.extractFilters(filter[key] as Filter, prevKey));
    }
    return filters;
  }

  protected handleCommaSeparated(values: string[], keyNameInput: string) {
    this.checkSafe(keyNameInput);
    if (values.length === 0) return '';

    let statement = '';

    for (let i = 0; i < values.length; i++) {
      const keyName = `${keyNameInput}_${this.getNextGlobalTick()}`;
      statement += `@@${keyName}`;
      if (i + 1 !== values.length) statement += ', ';
      this.bindVars[`@${keyName}`] = values[i];
    }

    return statement;
  }

  protected checkSafe(phrase: string) {
    if (!/^[A-Za-z][A-Za-z0-9\-_]*$/.test(phrase))
      throw new Error('This phrase does not seem safe and cannot be used in the query: ' + phrase);
  }

  protected concatArrays(array1: string[], array2: string | string[]): string[] {
    if (Array.isArray(array2)) {
      return array1.concat(array2);
    }

    array1.push(array2);
    return array1;
  }

  protected isRootQuery(): boolean {
    return this._isRootQuery;
  }

  protected setParentQuery(parent: ArangoBaseQueryBuilder): void {
    this._isRootQuery = false;
    this._parent = parent;
  }

  protected getParentQuery(): ArangoBaseQueryBuilder | undefined {
    return this._parent;
  }

  protected getTopmostParentQuery(): ArangoBaseQueryBuilder {
    if (this._parent === undefined) return this;
    if (this._parent.isRootQuery()) return this._parent;

    let parent = this._parent;
    while (true) {
      const localParent = parent.getParentQuery();
      if (!localParent) {
        return parent;
      }

      if (localParent.isRootQuery()) {
        return localParent;
      }

      parent = localParent;
    }
  }

  protected getNextTick(): number {
    this._tick += 1;
    return this._tick;
  }

  protected getNextGlobalTick(): number {
    return this.getTopmostParentQuery().getNextTick();
  }
}
