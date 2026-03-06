import axios, { AxiosResponse } from 'axios';

import httpStatus from 'http-status';
import ApiError from '@dataverse/errors';
import { Executor } from '@dataverse/http-resilient-executor';
import cacheManager from 'cache-manager';
import { Logger, getLogger, Config as LoggerConfig } from '@dataverse/logger';

const memoryCache = cacheManager.caching({ store: 'memory', max: 100, ttl: 3600 /*seconds*/ });

type ExecFunction = () => Promise<any>;

class DefaultExecutor implements Executor {
  public async execute(fn: ExecFunction): Promise<any> {
    return fn();
  }
}

export class OAuthClientError extends ApiError {
  constructor(message: string, error?: Error) {
    super(
      message,
      {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        isPublic: false,
      },
      error,
    );
  }
}

export interface ClientCredentials {
  username: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export class OAuthClient {
  private key = 'accessToken';

  private readonly authUrl: string;

  private readonly executor: Executor;

  protected readonly logger: Logger;

  constructor(url: string, loggerConfig: LoggerConfig, executor: Executor = new DefaultExecutor()) {
    this.authUrl = url;
    this.executor = executor;
    this.logger = getLogger(loggerConfig);
  }

  private async _exchangeCredentialsForToken(credentials: ClientCredentials): Promise<TokenResponse> {
    this.logger.info(`Calling Authorization endpoint: GET ${this.authUrl}`);

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    try {
      const response: AxiosResponse = await this.executor.execute(() =>
        axios.post(this.authUrl, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          auth: credentials,
        }),
      );
      const tokenResponse = {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in,
      };

      return tokenResponse;
    } catch (err: any) {
      throw new OAuthClientError('Calling OAuth api failed', err);
    }
  }

  private async cacheWrap(exchangeFunction: () => Promise<TokenResponse>): Promise<TokenResponse> {
    try {
      // getting the token from cache if exists
      const token = await memoryCache.get<TokenResponse>(this.key);
      if (token) {
        return token;
      }

      // getting the token from OAuth API and setting in the cache
      const result = await exchangeFunction();

      memoryCache.set<TokenResponse>(this.key, result, { ttl: result.expiresIn });
      return result;
    } catch (error: any) {
      throw new OAuthClientError('Calling OAuth api failed', error);
    }
  }

  public async exchangeCredentialsForToken(credentials: ClientCredentials): Promise<TokenResponse> {
    return this.cacheWrap(() => this._exchangeCredentialsForToken(credentials));
  }
}
