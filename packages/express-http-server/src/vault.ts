import VaultProvider, { VaultOptions } from 'vault-provider';
import { Config as LoggerConfig } from 'commonjs-logger';
import {
  appName,
  loggerLogLevel,
  loggerLogStyle,
  vaultAddr,
  vaultAuthType,
  vaultPassword,
  vaultSecretPath,
  vaultUser,
} from './config';

const loggerConfig: LoggerConfig = {
  logLevel: loggerLogLevel,
  logStyle: loggerLogStyle,
  appName: appName,
  moduleName: 'VaultProvider',
};

const vaultConfig: VaultOptions = {
  vaultAddr,
  vaultSecretPath,
  vaultAuthType,
  vaultUser,
  vaultPassword,
};

export default new VaultProvider(vaultConfig, loggerConfig);
