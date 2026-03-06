export interface SortBy {
  field: string;
  order: 'ASC' | 'DESC';
}

export interface LimitBy {
  offset: number;
  limit: number;
}

export type Primitive = string | number | boolean | undefined | null;
export type FilterObj = {
  '@value': Primitive | Primitive[];
  '@operator'?: '==' | '!=' | '<' | '>' | '<=' | '>=';
  '@docNameToFilter'?: string;
};
export type FinalFilter = Primitive | Primitive[] | FilterObj;
export interface Filter {
  [key: string]: FinalFilter | Filter;
}

export interface FilterBy {
  filter: Filter;
}

export interface SearchBy {
  search: {
    identity?: any;
    text_en?: any;
  };
}

export interface ArangoQueryOptions {
  sortBy?: SortBy;
  limitBy?: LimitBy;
  filterBy?: FilterBy;
  searchBy?: SearchBy;
  withCount?: boolean;
}

export enum Direction {
  Outbound = 'OUTBOUND',
  Inbound = 'INBOUND',
  Any = 'ANY',
}

export interface ArangoDocumentQueryOptions extends ArangoQueryOptions {
  documentCollection: string;
}

export interface ArangoEdgeQueryOptions extends ArangoQueryOptions {
  edgeCollections: string | Array<string>;
  relatedCollections: string | Array<string>;
  startingVertexId?: string;
  depth?: number;
  direction?: Direction;
}
