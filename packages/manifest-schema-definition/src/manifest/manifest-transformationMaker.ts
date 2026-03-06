const devConfigForTransform = require('@dataverse/developer-workbench-config');
const lodashForTransform = require('lodash');
const fileSysForTransform = require('fs');

const baseTransformJson = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'transformation',
  type: 'array',
  title: 'Transformation',
  description: 'Transformation definition',
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
            alias: { type: 'string', minLength: 3, maxLength: 50, pattern: '^[A-Za-z0-9_]+$' },
            type: { type: 'string' },
            description: { type: 'string' },
            query: { type: 'string' },
            sequenceNo: { type: 'number' },
            codeLocation: { type: 'string' },
          },
          required: ['alias', 'type', 'query'],
        },
        {
          type: 'object',
          required: ['alias', 'type', 'pythonFilePath'],
          properties: {
            alias: { type: 'string', minLength: 3, maxLength: 50, pattern: '^[A-Za-z0-9_]+$' },
            type: { type: 'string' },
            arguments: { type: 'array', items: { type: 'string' } },
            pythonFilePath: { type: 'string' },
            optional: { type: 'object' },
            sequence: { type: 'number' },
          },
        },
        {
          type: 'object',
          required: ['alias', 'type', 'pipelineName'],
          properties: {
            alias: { type: 'string', minLength: 3, maxLength: 50, pattern: '^[A-Za-z0-9_]+$' },
            type: { type: 'string' },
            pipelineName: { type: 'string' },
            optional: { type: 'object' },
            sequence: { type: 'number' },
          },
        },
      ],
    },
    else: {},
  },
};
function prepareAJVSchemaTransformJsonForPatternProperties(schema: any) {
  schema.required = [];
  Object.keys(schema.properties).forEach((p) => {
    if (schema.properties[p].required) {
      schema.required.push(p);
    }
    delete schema.properties[p].required;
    if (schema.properties[p].type === 'object') {
      schema.properties[p].additionalProperties = true;
      prepareAJVSchemaTransformJsonForPatternProperties(schema.properties[p]);
    } else if (schema.properties[p].type === 'array') {
      if (schema.properties[p].items.type === 'object') {
        schema.properties[p].items.additionalProperties = true;
        prepareAJVSchemaTransformJsonForPatternProperties(schema.properties[p].items);
      }
    }
  });
}

function prepareAJVSchemaTransformJson(schema: any) {
  schema.required = [];
  Object.keys(schema.properties).forEach((p) => {
    if (schema.properties[p].required) {
      schema.required.push(p);
    }
    delete schema.properties[p].required;
    if (schema.properties[p].type === 'object') {
      schema.properties[p].additionalProperties = true;
      prepareAJVSchemaTransformJson(schema.properties[p]);
    } else if (schema.properties[p].type === 'array') {
      if (schema.properties[p].items.type === 'object') {
        schema.properties[p].items.additionalProperties = true;
        prepareAJVSchemaTransformJson(schema.properties[p].items);
      }
    }
  });
  if (schema.patternProperties) {
    Object.keys(schema.patternProperties).forEach((t) => {
      if (schema.patternProperties[t].type === 'array') {
        delete schema.patternProperties[t].required;
        if (schema.patternProperties[t].items.type === 'object') {
          schema.patternProperties[t].items.additionalProperties = true;
          prepareAJVSchemaTransformJsonForPatternProperties(schema.patternProperties[t].items);
        }
      } else {
        delete schema.patternProperties[t].required;
      }
    });
  }
}

const currentTransformKey = ['items', 'else'];

devConfigForTransform.config.transform.forEach((component: any) => {
  if (component.sampleSchema) {
    let schema = lodashForTransform.cloneDeep(component.sampleSchema);

    schema.properties.alias = schema.properties.stepName;
    schema.properties.description = schema.properties.stepName;
    schema.properties.sequence = { type: 'number', required: true };

    delete schema.properties.stepName;
    delete schema.properties.optional.properties.dataQualityCheck;

    schema.properties.isDynamic = { type: 'boolean', required: true };
    prepareAJVSchemaTransformJson(schema);
    if (schema.properties.optional) {
      schema.properties.optional.required = [];
    }
    let reference: any = baseTransformJson;
    if (currentTransformKey.length > 1) {
      currentTransformKey.forEach((t, index) => {
        if (index + 1 !== currentTransformKey.length) {
          reference = reference[t];
        }
      });
    }
    reference[currentTransformKey[currentTransformKey.length - 1]] = {
      if: {
        type: 'object',
        properties: {
          type: { const: component.nameOfComponent },
        },
      },
      then: schema,
      else: {},
    };
    currentTransformKey.push('else');
  }
});

fileSysForTransform.writeFileSync(
  'src/manifest/manifest-transformation.json',
  JSON.stringify(baseTransformJson, undefined, 2),
);
