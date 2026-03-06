import ImmudbClient from 'immudb-node';
import Parameters from 'immudb-node/dist/types/parameters';
import { Config as LoggerConfig, getLogger, Logger } from '@dataverse/logger';

interface ImmuDbConfig {
  host: string;
  port: string;
}
export class ImmuDbProvider {
  private db!: ImmudbClient;

  private config: ImmuDbConfig;

  private logger?: Logger;

  constructor(config: ImmuDbConfig, loggerConfig?: LoggerConfig) {
    this.config = config;
    this.logger = loggerConfig ? getLogger(loggerConfig) : undefined;
  }

  public async initializeDBConnection(username: string, password: string, dbName?: string) {
    this.db = new ImmudbClient({
      host: this.config.host,
      port: this.config.port,
    });
    try {
      await this.db.login({ user: username, password: password });
      if (dbName) {
        await this.db.useDatabase({ databasename: dbName });
      }
      this.logger?.info(`Connected DB successfully on ${this.config.host}:${this.config.port}`);
    } catch (err) {
      this.logger?.error(err instanceof Error ? err.message : err);
      throw err;
    }
  }

  public disconnectDB(cb?: Function): void {
    this.db.shutdown();
    if (cb) {
      cb(null);
    }
    this.logger?.info('Closed DB successfully');
  }

  public async write(key: string, value: string) {
    const setReq: Parameters.Set = { key, value };
    const setRes = await this.db.set(setReq);
    this.logger?.info(`Write Response === ${JSON.stringify(setRes)}`);
    return setRes;
  }

  public async read(key: string) {
    const getReq: Parameters.Get = { key };
    const getRes = await this.db.get(getReq);
    this.logger?.info(`Get Response === ${JSON.stringify(getRes)}`);
    return getRes;
  }
}
