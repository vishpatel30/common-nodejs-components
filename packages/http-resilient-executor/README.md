# `@dataverse/http-resilient-executor`

Helper for creating retry policies , circuit breaker for functions and external requests

## Config

| Name                                        | Description                                                           |
| ------------------------------------------- | --------------------------------------------------------------------- |
| httpResilienceCBHalfOpenAfterMS             | Indicates the Time CircuitBreaker to be in half open state            |
| httpResilienceRetryCount                    | Retry count for requests                                              |
| httpResilienceCBConsecutiveThreshold        | Maximum attempts to open CircuitBreaker                               |

For logger configuration properties see the
[logger documentation](https://gitlab.byteprophecy.accenture.com/dataverse/common-nodejs-components/blob/develop/packages/logger/README.md)


## Usage

```typescript
// init ResilientExecutor instance (should use 1 instance per app)
import { ResilientExecutor } from '@dataverse/http-resilient-executor';

const config = {
  /** logger configuration */
  logger: { logLevel: 'cli', logStyle: 'debug', appName: 'nodejs-commons',moduleName: 'ResilientExecutor' },

  /** After 10 seconds the CB will be half open state */
  httpResilienceCBHalfOpenAfterMS: 10 * 1000,

  /** After 5 consecutive failed requests, the CB will be open */
  httpResilienceCBConsecutiveThreshold: 5,

  /**  Retry count for failed requests */
  httpResilienceRetryCount: 3,
};

const resilientExec = new ResilientExecutor(config);

/** use resilientExecutor to wrap functions and api calls */
/** to wrap function */
await resilientExec.execute(testMock);

/** to wrap api */

await this.executor.execute(() =>
        axios.post(this.authUrl, params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
          auth: credentials,
        }),
      );

```
