import { ArangoDocumentQueryOptions } from '../types/arango-query-options.interface';
import { ArangoBaseQueryBuilder } from './base-query-builder';

export class ArangoDocumentQueryBuilder extends ArangoBaseQueryBuilder {
  protected doc = 'doc';

  protected returnClause = 'doc';

  constructor(protected options: ArangoDocumentQueryOptions) {
    super(options);
  }

  protected buildSelector(): void {
    this.checkSafe(this.options.documentCollection);
    const collectionKey = `collection_${this.getNextGlobalTick()}`;
    this.selector = `FOR ${this.doc} IN @@${collectionKey} `;
    this.bindVars[`@${collectionKey}`] = this.options.documentCollection;
  }
}
