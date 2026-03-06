import manifestVersion from './manifest/manifest-version.json';
import manifestDiscoveryPort from './manifest/manifest-discoveryPort.json';
import manifestInputPorts from './manifest/manifest-inputPort.json';
import manifestTransformation from './manifest/manifest-transformation.json';
import manifestProductState from './manifest/manifest-productState.json';
import manifestOutPutPort from './manifest/manifest-outPutPort.json';
import manifestControlPort from './manifest/manifest-controlPort.json';
import manifestSchema from './manifest/manifestSchema.json';

import dataQualityCheckChecks from './manifest/ref/controlPort/dataQualityCheckChecks.json';
import dataQualityCheckCommon from './manifest/ref/controlPort/dataQualityCheckCommon.json';
import dataQualityCheckExpression from './manifest/ref/controlPort/dataQualityCheckExpression.json';
import dataQualityCheckSingleCheck from './manifest/ref/controlPort/dataQualityCheckSingleCheck.json';
import dataSetUrn from './manifest/ref/inputPort/dataSetUrn.json';
import incrementalStrategy from './manifest/ref/inputPort/incrementalStrategy.json';
import s3CsvDataSet from './manifest/ref/inputPort/s3CsvDataSet.json';
import syncType from './manifest/ref/inputPort/syncType.json';
import inputPortTags from './manifest/ref/inputPort/tags.json';
import alias from './manifest/ref/inputPort/alias.json';
import dataTimeRange from './manifest/ref/discoveryPort/dataTimeRange.json';
import regulatoryFields from './manifest/ref/discoveryPort/regulatoryFields.json';

const finalManifest = {
  manifestSchema: manifestSchema,
  version: manifestVersion,
  discoveryPort: manifestDiscoveryPort,
  inputPorts: manifestInputPorts,
  transformation: manifestTransformation,
  productState: manifestProductState,
  outputPort: manifestOutPutPort,
  controlPort: manifestControlPort,
  refs: [
    dataTimeRange,
    regulatoryFields,
    dataSetUrn,
    incrementalStrategy,
    s3CsvDataSet,
    syncType,
    inputPortTags,
    alias,
    dataQualityCheckChecks,
    dataQualityCheckCommon,
    dataQualityCheckExpression,
    dataQualityCheckSingleCheck,
  ],
};

export default finalManifest;
