import dotenv from 'dotenv';

dotenv.config();


export const orgName = process.env.ORG_NAME;

// Redis
export const redisHost = process.env.REDIS_HOST || 'localhost';
export const redisPort = process.env.REDIS_PORT || '6379';
export const redisTTLSeconds = process.env.REDIS_TTL_SECONDS || 3600;
// Vault
export const vaultAddr =  process.env.VAULT_ADDRESS||'http://172.31.96.122:8200';
export const vaultSecretPath = `${process.env.VAULT_SECRET_PATH}/${orgName}`||'dev/secret-mgmt-service/data/test';
export const resourceVaultSecretPath =`${process.env.VAULT_RESOURCE_COSTING_SECRET_PATH}`||'resource_costing';
export const vaultAuthType = process.env.VAULT_AUTH_TYPE ||'userpass';
export const vaultToken =  process.env.VAULT_TOKEN ||'myroot';
export const vaultUser =  process.env.VAULT_USER||'vault-test-backend';
export const vaultPassword =  process.env.VAULT_PASSWORD||'Core@123';
//logger
export const loggerLogLevel = process.env.LOGGER_LOG_LEVEL || 'info';
export const loggerLogStyle = process.env.LOGGER_LOG_STYLE || 'json';

export const appName = process.env.APP_NAME||'dataverse';
