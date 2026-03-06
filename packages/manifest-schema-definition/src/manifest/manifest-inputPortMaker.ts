const devConfig = require('@dataverse/developer-workbench-config');
const lodash = require('lodash');
const fileSys = require('fs');

const baseInputJson = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'inputPort',
  type: 'array',
  title: 'Input Port',
  description: 'Input Port definition',
  items: {
    if: {
      not: {
        type: 'object',
        properties: {
          isDynamic: { const: true },
        },
      },
    },
    then: {
      oneOf: [
        {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['s3-csv'],
            },
            alias: {
              $ref: 'alias',
            },
            description: {
              type: 'string',
              maxLength: 600,
            },
            tags: {
              $ref: 'tags',
            },
            syncType: {
              $ref: 'syncType',
            },
            dataSetUrn: {
              $ref: 'dataSetUrn',
            },
            filter: {
              type: 'string',
            },
            projection: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            incrementalLoad: {
              type: 'boolean',
            },
            incrementalStrategy: {
              $ref: 'incrementalStrategy',
            },
          },
          required: ['type', 'alias', 'dataSetUrn'],
        },
        {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['s3-parquet'],
            },
            alias: {
              $ref: 'alias',
            },
            description: {
              type: 'string',
              maxLength: 600,
            },
            tags: {
              $ref: 'tags',
            },
            syncType: {
              $ref: 'syncType',
            },
            dataSetUrn: {
              $ref: 'dataSetUrn',
            },
            filter: {
              type: 'string',
            },
            projection: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            incrementalLoad: {
              type: 'boolean',
            },
            incrementalStrategy: {
              $ref: 'incrementalStrategy',
            },
          },
          required: ['type', 'alias', 'dataSetUrn'],
        },
        {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['s3-json'],
            },
            alias: {
              $ref: 'alias',
            },
            description: {
              type: 'string',
              maxLength: 600,
            },
            tags: {
              $ref: 'tags',
            },
            syncType: {
              $ref: 'syncType',
            },
            dataSetUrn: {
              $ref: 'dataSetUrn',
            },
            filter: {
              type: 'string',
            },
            projection: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            incrementalLoad: {
              type: 'boolean',
            },
            incrementalStrategy: {
              $ref: 'incrementalStrategy',
            },
          },
          required: ['type', 'alias', 'dataSetUrn'],
        },
        {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['vertica-table', 'postgres-table'],
            },
            alias: {
              $ref: 'alias',
            },
            description: {
              type: 'string',
              maxLength: 600,
            },
            tags: {
              $ref: 'tags',
            },
            syncType: {
              $ref: 'syncType',
            },
            dataSetUrn: {
              $ref: 'dataSetUrn',
            },
            filter: {
              type: 'string',
            },
            projection: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            incrementalLoad: {
              type: 'boolean',
            },
            incrementalStrategy: {
              $ref: 'incrementalStrategy',
            },
          },
          required: ['type', 'alias', 'dataSetUrn'],
        },
        {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['dataproduct'],
            },
            alias: {
              type: 'string',
              minLength: 3,
              maxLength: 500,
              pattern: '^[A-Za-z0-9_]+$',
            },
            description: {
              type: 'string',
              maxLength: 600,
            },
            tags: {
              $ref: 'tags',
            },
            syncType: {
              $ref: 'syncType',
            },
            dataProductUrn: {
              type: 'string',
              pattern: '^(?:urn|URN):(?:dv|DV):dataproduct:[A-Za-z0-9\\-_]+$',
              description: '',
            },
            filter: {
              type: 'string',
            },
            projection: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          required: ['alias', 'dataProductUrn', 'type'],
        },
      ],
    },
    else: {},
  },
};

function prepareAJVSchemaInputJson(schema: any) {
  schema.required = [];
  Object.keys(schema.properties).forEach((p) => {
    if (schema.properties[p].required) {
      schema.required.push(p);
    }
    delete schema.properties[p].required;
    if (schema.properties[p].type === 'object') {
      schema.properties[p].additionalProperties = true;
      prepareAJVSchemaInputJson(schema.properties[p]);
    } else if (schema.properties[p].type === 'array') {
      if (schema.properties[p].items.type === 'object') {
        schema.properties[p].items.additionalProperties = true;
        prepareAJVSchemaInputJson(schema.properties[p].items);
      }
    }
  });
  if (schema.patternProperties) {
    Object.keys(schema.patternProperties).forEach((t) => {
      delete schema.patternProperties[t].required;
    });
  }
}

const currentInputKey = ['items', 'else'];

devConfig.config.extract.forEach((component: any) => {
  if (component.sampleSchema) {
    let schema = lodash.cloneDeep(component.sampleSchema);

    schema.properties.alias = schema.properties.stepName;
    delete schema.properties.stepName;
    delete schema.properties.optional.properties.jsonSchema;

    schema.properties.isDynamic = { type: 'boolean', required: true };

    delete schema.properties.inputDataFrame;
    delete schema.properties.sequence;

    prepareAJVSchemaInputJson(schema);
    if (schema.properties.optional) {
      schema.properties.optional.required = [];
    }
    let reference: any = baseInputJson;
    if (currentInputKey.length > 1) {
      currentInputKey.forEach((t, index) => {
        if (index + 1 !== currentInputKey.length) {
          reference = reference[t];
        }
      });
    }
    reference[currentInputKey[currentInputKey.length - 1]] = {
      if: {
        type: 'object',
        properties: {
          type: { const: component.nameOfComponent },
        },
      },
      then: schema,
      else: {},
    };
    currentInputKey.push('else');
  }
});

fileSys.writeFileSync('src/manifest/manifest-inputPort.json', JSON.stringify(baseInputJson, undefined, 2));
