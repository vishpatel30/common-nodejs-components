import { ArangoEdgeQueryOptions, Direction } from '../types/arango-query-options.interface';
import { ArangoBaseQueryBuilder } from './base-query-builder';

export class ArangoEdgeQueryBuilder extends ArangoBaseQueryBuilder {
  protected doc = 'vertex';

  protected returnClause = 'vertex';

  private edges = '';

  private rootDoc = '';

  private startingVertexId = '';

  constructor(protected options: ArangoEdgeQueryOptions) {
    super(options);
    this.options.depth ??= 1;
    this.options.direction ??= Direction.Any;
  }

  public setRootDocSelector(doc: string) {
    this.checkSafe(doc);
    this.rootDoc = doc;
    return this;
  }

  protected buildSelector(): void {
    this.buildEdges();
    this.buildStartingVertexId();
    const depthKeyName = `depth_${this.getNextGlobalTick()}`;
    this.selector = `FOR ${this.doc} IN 1..@${depthKeyName} ${this.options.direction} ${this.startingVertexId} ${this.edges} `;
    this.bindVars[depthKeyName] = this.options.depth!;
  }

  private buildEdges() {
    const edgeCollections = Array.isArray(this.options.edgeCollections)
      ? this.options.edgeCollections
      : [this.options.edgeCollections];
    this.edges = this.handleCommaSeparated(edgeCollections, 'edge');
  }

  private buildStartingVertexId() {
    if (this.options.startingVertexId) {
      if (!/^[A-Za-z][A-Za-z0-9\-_]*\/[A-Za-z0-9\-_]+$/.test(this.options.startingVertexId)) {
        throw new Error(
          'startingVertexId must be an ArangoDB document ID. For example: manifest/2df48bfb-48ab-4a95-84cc-0802c7f842b9',
        );
      }

      const id = `starting_vertex_${this.getNextGlobalTick()}`;
      this.startingVertexId = `@${id}`;
      this.bindVars[id] = this.options.startingVertexId;
      return;
    }

    if (!this.rootDoc) {
      const parent = this.getTopmostParentQuery();
      if (parent === this) {
        throw new Error('You must provide startingVertexId in options');
      }

      this.rootDoc = parent.getDocSelector();
    }

    this.startingVertexId = `${this.rootDoc}._id`;
  }
}
