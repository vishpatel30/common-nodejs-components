import { ArangoDocumentQueryOptions } from '../types/arango-query-options.interface';
import { ArangoBaseQueryBuilder } from './base-query-builder';

export class ArangoViewQueryBuilder extends ArangoBaseQueryBuilder {
  protected doc = 'res';

  protected returnClause = 'res';

  constructor(protected options: ArangoDocumentQueryOptions) {
    super(options);
  }

  // TODO: Implement view query builder
}
