import ApiError, { ResourceNotFoundError } from '@dataverse/errors';
import { Config as LoggerConfig, getLogger, Logger } from '@dataverse/logger';
import httpStatus from 'http-status';
import vaultClient, { client } from 'node-vault';

export interface VaultOptions {
  vaultAddr: string;
  vaultSecretPath: string;
  vaultAuthType: string;
  vaultUser: string;
  vaultPassword: string;
}

export class RequiredVaultOptionsMissing extends ApiError {
  constructor() {
    super(`Vault Provider Required Options are missing`, {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      isPublic: true,
    });
  }
}

export class VaultAccessError extends ApiError {
  constructor(error?: Error) {
    super(
      'Vault access failed. We are working on fixing this issue.',
      {
        status: httpStatus.SERVICE_UNAVAILABLE,
        isPublic: true,
        code: 'error.vault.not-accessible',
      },
      error,
    );
  }
}

export class VaultProvider {
  private client!: client;

  private options: VaultOptions;

  private logger?: Logger;

  constructor(options: VaultOptions, loggerConfig?: LoggerConfig) {
    this.options = options;
    this.logger = loggerConfig ? getLogger(loggerConfig) : undefined;
  }

  public async initialize(): Promise<void> {
    this.client = vaultClient({
      endpoint: this.options.vaultAddr,
    });

    if (this.options.vaultAuthType !== 'token') {
      await this.vaultAuth();
    }

    this.logger?.info(
      `Vault is successfully configured with address: ${this.options.vaultAddr} and auth type: ${this.options.vaultAuthType}`,
    );
  }

  public async write(entityId: string, value: any): Promise<any> {
    try {
      return this.client.write(`${this.options.vaultSecretPath}/${entityId}`, { data: { value } });
    } catch (err) {
      let shouldRedoOperation = this.handleError(err as Error, entityId);
      if (shouldRedoOperation) {
        return await this.write(entityId, value);
      }
    }
  }

  public async read(entityId: string): Promise<any> {
    try {
      const response = await this.client.read(`${this.options.vaultSecretPath}/${entityId}`);
      return response.data.data.value;
    } catch (err) {
      let shouldRedoOperation = this.handleError(err as Error, entityId);
      if (shouldRedoOperation) {
        return await this.read(entityId);
      }
    }
  }

  public async delete(entityId: string): Promise<any> {
    try {
      return this.client.delete(`${this.options.vaultSecretPath}/${entityId}`);
    } catch (err) {
      let shouldRedoOperation = this.handleError(err as Error, entityId);
      if (shouldRedoOperation) {
        return await this.delete(entityId);
      }
    }
  }

  private handleError(err: Error, entityId: string) {
    if (err.message === 'Status 404') {
      throw new ResourceNotFoundError(entityId, err);
    }
    if (err.name === 'RequestError') {
      throw new VaultAccessError(err);
    }
    console.log(err.name);
    if (err.name == 'permission denied') {
      this.initialize();
      return true;
    } else {
      throw err;
    }
  }

  private async vaultAuth(): Promise<any> {
    try {
      const login = await this.client.userpassLogin({
        username: this.options.vaultUser,
        password: this.options.vaultPassword,
      });
      return login;
    } catch (err) {
      this.logger?.error(`Vault authentication error ${err}`);
      throw err;
    }
  }
}

export default VaultProvider;
