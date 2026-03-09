# `commonjs-logger`

Logger with support for json and key value based logs.

## Config

| Name                                        | Description                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------  |
| logLevel                                    | Controls log level of the service['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'] |                           |
| logStyle                                    | Controls log output style['json', 'cli']                                                        |
| appName                                     | Application name shown in logs                                                                  |
| moduleName                                  | Action name or file name shown in logs                                                       |


## Usage

```typescript
import { getLogger, Config } from 'commonjs-logger';

const config: Config = {
      appName: 'test-app-name',
      moduleName: 'logger-config-test',
      logLevel: 'info',
      logStyle: 'cli',
    };
const logger = getLogger(config);

logger.info('This is a sample info log message');
logger.debug('This is a sample debug log message');
logger.error('This is a sample error log message');

// Object interpolation using object.toString() - does not show object contents
logger.debug(`'This is a sample interpolated message ${someObject}`);

// Object interpolation using %o - does show object contents
logger.debug(`'This is a sample interpolated message: %o', someObject);

// Object interpolation using %O - does show object contents
logger.debug(`'This is a sample interpolated message: %O', someObject);

// Object interpolation using %s
logger.debug(`'This is a sample interpolated message: %s', 'my string');

// Include object into json formatted payload
logger.debug('Some message', someObject);
```
