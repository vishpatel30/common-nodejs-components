# `@dataverse/vault-provider`

> node-vault Facade to use in dataverse NodeJS projects

## Config

| Name                                        | Description                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------  |
| vaultAddr                                   | The URL of the Vault with port                                                                  |
| vaultSecretPath                             | Path of the secrets to be used in the application                                               |
| vaultAuthType                               | Authentication type. Only 'userpass' is supported as of now                                     |
| vaultUser                                   | If the auth type is 'userpass', provide a username                                              |
| vaultPassword                               | If the auth type is 'userpass', provide a password                                              |

## Usage

```js
import VaultProvider from '@dataverse/vault-provider';
import { VaultOptions } from '@dataverse/kafka-provider';
import { Config as LoggerConfig } from '@dataverse/logger';
import { vaultAddr, vaultAuthType, vaultPassword, vaultSecretPath, vaultUser } from '../config/config';

const config: VaultOptions = {
  vaultAddr,
  vaultSecretPath,
  vaultAuthType,
  vaultUser,
  vaultPassword,
};

const loggerConfig: LoggerConfig = {
  logLevel: loggerLogLevel,
  logStyle: loggerLogStyle,
  appName: appName,
  moduleName: 'VaultProvider',
};

const provider = new VaultProvider(config, loggerConfig);

export default provider;

// Initialize
import vaultProvider from './providers/vault';
await vaultProvider.initialize();

// Write something to the Vault
await vaultProvider.write(user.id, secretAccessKey);

// Read something from the Vault
const secretAccessKey = await vaultProvider.read(user.id);
```
