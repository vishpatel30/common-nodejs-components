import { ArangoBaseQueryBuilder } from '../querybuilder/base-query-builder';
import { ArangoDocumentQueryBuilder } from '../querybuilder/document-query-builder';
import { ArangoEdgeQueryBuilder } from '../querybuilder/edge-query-builder';
import { Direction } from '../types/arango-query-options.interface';

describe('@dataverse/arangodb/querybuilder', () => {
  it('should prepare query when complex related query 1', () => {
    // arrange
    const builder = new ArangoDocumentQueryBuilder({
      documentCollection: 'manifest',
      filterBy: { filter: { gitRepoInfo: { owner: 'Tospaa' } } },
    })
      .addAdditionalQuery(
        'one_data_source',
        new ArangoDocumentQueryBuilder({ documentCollection: 'data_sources', limitBy: { limit: 1, offset: 0 } }),
      )
      .addAdditionalQuery(
        'related',
        new ArangoEdgeQueryBuilder({
          edgeCollections: 'tospaa',
          relatedCollections: 'afyon',
          startingVertexId: 'deneme/1-2',
          limitBy: {
            limit: 2,
            offset: 3,
          },
          sortBy: {
            field: 'foo.bar',
            order: 'ASC',
          },
          withCount: true,
        }),
      );

    // act
    const query = builder.prepareQuery();

    // assert
    expect(query).toStrictEqual({
      bindVars: {
        '@collection_1': 'manifest',
        '@collection_5': 'data_sources',
        '@edge_8': 'tospaa',
        '@target_4': 'afyon',
        depth_10: 1,
        filter_3: 'Tospaa',
        limitByLimit_14: 2,
        limitByLimit_7: 1,
        limitByOffset_13: 3,
        limitByOffset_6: 0,
        path_2: ['gitRepoInfo', 'owner'],
        sortField_11: ['foo', 'bar'],
        sortOrder_12: 'ASC',
        starting_vertex_9: 'deneme/1-2',
      },
      query:
        'WITH @@target_4 FOR doc IN @@collection_1 FILTER doc.@path_2 == @filter_3 LET one_data_source = FIRST(FOR doc IN @@collection_5 LIMIT @limitByOffset_6, @limitByLimit_7 RETURN doc) LET related = FIRST(LET total = FIRST(FOR vertex IN 1..@depth_10 ANY @starting_vertex_9 @@edge_8 COLLECT WITH COUNT INTO length RETURN length) LET docs = (FOR vertex IN 1..@depth_10 ANY @starting_vertex_9 @@edge_8 SORT vertex.@sortField_11 @sortOrder_12 LIMIT @limitByOffset_13, @limitByLimit_14 RETURN vertex) RETURN { docs, total }) RETURN MERGE(doc, { one_data_source, related })',
    });
  });

  it('should prepare query when complex related query 2', () => {
    // arrange
    const builder = new ArangoDocumentQueryBuilder({
      documentCollection: 'manifest',
      filterBy: { filter: { gitRepoInfo: { owner: 'Tospaa' } } },
    }).addAdditionalQuery(
      'last_execution',
      new ArangoEdgeQueryBuilder({
        edgeCollections: 'related_execution_infos',
        relatedCollections: 'execution_info',
        limitBy: {
          limit: 1,
          offset: 0,
        },
        sortBy: {
          field: 'createdTs',
          order: 'DESC',
        },
      }),
    );

    // act
    const query = builder.prepareQuery();

    // assert
    expect(query).toStrictEqual({
      bindVars: {
        '@collection_1': 'manifest',
        '@edge_5': 'related_execution_infos',
        '@target_4': 'execution_info',
        depth_6: 1,
        filter_3: 'Tospaa',
        limitByLimit_10: 1,
        limitByOffset_9: 0,
        path_2: ['gitRepoInfo', 'owner'],
        sortField_7: ['createdTs'],
        sortOrder_8: 'DESC',
      },
      query:
        'WITH @@target_4 FOR doc IN @@collection_1 FILTER doc.@path_2 == @filter_3 LET last_execution = FIRST(FOR vertex IN 1..@depth_6 ANY doc._id @@edge_5 SORT vertex.@sortField_7 @sortOrder_8 LIMIT @limitByOffset_9, @limitByLimit_10 RETURN vertex) RETURN MERGE(doc, { last_execution })',
    });
  });

  it('should throw when startingVertexId is not ArangoID', () => {
    // arrange
    const builder = new ArangoEdgeQueryBuilder({
      depth: 2,
      direction: Direction.Outbound,
      relatedCollections: 'related',
      edgeCollections: 'edge',
      startingVertexId: 'invalid',
    });

    // act & assert
    expect(() => builder.prepareQuery()).toThrowError(
      'startingVertexId must be an ArangoDB document ID. For example: manifest/2df48bfb-48ab-4a95-84cc-0802c7f842b9',
    );
  });

  it('should throw when no parent and no root doc nor startingVertexId is set', () => {
    // arrange
    const builder = new ArangoEdgeQueryBuilder({
      relatedCollections: 'related',
      edgeCollections: 'edge',
    });

    // act & assert
    expect(() => builder.prepareQuery()).toThrowError('You must provide startingVertexId in options');
  });

  it('should throw when using base class', () => {
    // arrange
    const builder = new ArangoBaseQueryBuilder({ documentCollection: 'some' });

    // act & assert
    expect(() => builder.prepareQuery()).toThrowError('Override this method');
  });

  it('should throw when using same variable name with the root doc selector', () => {
    // arrange
    const builder = new ArangoDocumentQueryBuilder({ documentCollection: 'some' });

    // act & assert
    expect(() =>
      builder.addAdditionalQuery('doc', new ArangoDocumentQueryBuilder({ documentCollection: 'other' })),
    ).toThrowError('Additional query variable name cannot be same with doc selector');
  });

  it('should prepare query when only edge query', () => {
    // arrange
    const builder = new ArangoEdgeQueryBuilder({
      edgeCollections: 'related_execution_infos',
      relatedCollections: ['execution_info', 'data_sources'],
      filterBy: { filter: { gitRepoInfo: { owner: 'Tospaa' } } },
      startingVertexId: 'deneme/1-2',
      direction: Direction.Outbound,
      depth: 4,
    });

    // act
    const query = builder.prepareQuery();

    // assert
    expect(query).toStrictEqual({
      bindVars: {
        '@edge_1': 'related_execution_infos',
        '@target_6': 'execution_info',
        '@target_7': 'data_sources',
        depth_3: 4,
        filter_5: 'Tospaa',
        path_4: ['gitRepoInfo', 'owner'],
        starting_vertex_2: 'deneme/1-2',
      },
      query:
        'WITH @@target_6, @@target_7 FOR vertex IN 1..@depth_3 OUTBOUND @starting_vertex_2 @@edge_1 FILTER vertex.@path_4 == @filter_5 RETURN vertex',
    });
  });

  it('should throw when trying to set unsafe doc selector', () => {
    // arrange
    const builder = new ArangoDocumentQueryBuilder({ documentCollection: 'some' });

    // act & assert
    expect(() => builder.setDocSelector('doc//')).toThrowError(
      'This phrase does not seem safe and cannot be used in the query: doc//',
    );
  });

  it('should prepare query when complex related query 2', () => {
    // arrange
    const builder = new ArangoDocumentQueryBuilder({
      documentCollection: 'manifest',
      filterBy: { filter: { gitRepoInfo: { owner: 'Tospaa' } } },
    }).addAdditionalQuery(
      'executions',
      new ArangoDocumentQueryBuilder({
        documentCollection: 'execution_info',
        limitBy: {
          limit: 1,
          offset: 0,
        },
        sortBy: {
          field: 'createdTs',
          order: 'DESC',
        },
      })
        .setDocSelector('doc2')
        .addAdditionalQuery(
          'inner',
          new ArangoEdgeQueryBuilder({
            edgeCollections: 'inner_edge',
            relatedCollections: 'inner_related',
          }).addAdditionalQuery(
            'innermost',
            new ArangoEdgeQueryBuilder({
              edgeCollections: 'innermost_edge',
              relatedCollections: 'innermost_related',
              sortBy: { field: 'dateCreated', order: 'ASC' },
            }).setDocSelector('doc3'),
          ),
        ),
    );

    // act
    const query = builder.prepareQuery();

    // assert
    expect(query).toStrictEqual({
      bindVars: {
        '@collection_1': 'manifest',
        '@collection_6': 'execution_info',
        '@edge_11': 'inner_edge',
        '@edge_13': 'innermost_edge',
        '@target_4': 'inner_related',
        '@target_5': 'innermost_related',
        depth_12: 1,
        depth_14: 1,
        filter_3: 'Tospaa',
        limitByLimit_10: 1,
        limitByOffset_9: 0,
        path_2: ['gitRepoInfo', 'owner'],
        sortField_15: ['dateCreated'],
        sortField_7: ['createdTs'],
        sortOrder_16: 'ASC',
        sortOrder_8: 'DESC',
      },
      query:
        'WITH @@target_4, @@target_5 FOR doc IN @@collection_1 FILTER doc.@path_2 == @filter_3 LET executions = FIRST(FOR doc2 IN @@collection_6 SORT doc2.@sortField_7 @sortOrder_8 LIMIT @limitByOffset_9, @limitByLimit_10 LET inner = (FOR vertex IN 1..@depth_12 ANY doc._id @@edge_11 LET innermost = (FOR doc3 IN 1..@depth_14 ANY doc._id @@edge_13 SORT doc3.@sortField_15 @sortOrder_16 RETURN doc3) RETURN MERGE(vertex, { innermost })) RETURN MERGE(doc2, { inner })) RETURN MERGE(doc, { executions })',
    });
  });
});
