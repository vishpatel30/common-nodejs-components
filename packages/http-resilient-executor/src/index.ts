import axios from 'axios';
import {
  IPolicy,
  IRetryContext,
  ConsecutiveBreaker,
  handleWhen,
  ExponentialBackoff,
  retry,
  circuitBreaker,
  wrap,
} from 'cockatiel';

import { Logger, getLogger, Config as LoggerConfig } from '@dataverse/logger';

interface ResilientConfig {
  /** logger configuration */
  logger: LoggerConfig;

  /** logger configuration Indicates the Time when CircuitBreaker to be in half open state */
  httpResilienceCBHalfOpenAfterMS: number;

  /** Maximum attempts to open CircuitBreaker */
  httpResilienceCBConsecutiveThreshold: number;

  /** Retry count for failed requests */
  httpResilienceRetryCount: number;
}

type ExecFunction = () => Promise<any>;

export interface Executor {
  execute: (fn: ExecFunction) => Promise<any>;
}

const is5xxStatusCodeNumber = (statusCode: number): boolean => Math.trunc(statusCode / 100) === 5;

export class ResilientExecutor implements Executor {
  /**
   * Resilient executor Executes HTTP request in resilient fashion. Adds retry and circuit breaker behavior to action it wraps.
   */
  public readonly resilientExecutor: IPolicy<IRetryContext, never>;

  protected readonly logger: Logger;

  private readonly resConfig: ResilientConfig;

  constructor(resilientConfig: ResilientConfig) {
    this.resConfig = resilientConfig;

    this.logger = getLogger(this.resConfig.logger);

    const isRetriableError = handleWhen((err: any) => {
      this.logger.debug('Resilience handler received an error: %o', err.message);
      // connection refused errors don't have a response field, but separate code
      if (err.code === 'ECONNREFUSED') {
        return true;
      }

      // every other 5XX error should be retried
      return axios.isAxiosError(err) && err.response !== undefined && is5xxStatusCodeNumber(err.response!.status);
    });

    const retryPolicy = retry(isRetriableError, {
      maxAttempts: this.resConfig.httpResilienceRetryCount,
      backoff: new ExponentialBackoff(),
    });

    const circuitBreakerPolicy = circuitBreaker(isRetriableError, {
      halfOpenAfter: this.resConfig.httpResilienceCBHalfOpenAfterMS,
      breaker: new ConsecutiveBreaker(this.resConfig.httpResilienceCBConsecutiveThreshold),
    });

    this.resilientExecutor = wrap(retryPolicy, circuitBreakerPolicy);
  }

  public async execute(fn: ExecFunction): Promise<any> {
    return this.resilientExecutor.execute(fn);
  }
}
