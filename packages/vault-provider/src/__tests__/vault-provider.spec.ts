import { ResourceNotFoundError } from '@dataverse/errors';
import { Config as LoggerConfig } from '@dataverse/logger';
import VaultProvider, { RequiredVaultOptionsMissing, VaultAccessError, VaultOptions } from '..';

const mockUserpassLogin = jest.fn();
const mockWrite = jest.fn();
const mockRead = jest.fn();
const mockDelete = jest.fn();
jest.mock('node-vault', () => {
  return jest.fn().mockImplementation(() => {
    return {
      userpassLogin: mockUserpassLogin,
      write: mockWrite,
      read: mockRead.mockResolvedValue({
        data: {
          data: {
            value: 'secret',
          },
        },
      }),
      delete: mockDelete,
    };
  });
});

describe('@dataverse/vault-provider', () => {
  let testObject: VaultProvider;
  const config: VaultOptions = {
    vaultAddr: 'vaultAddress',
    vaultSecretPath: 'secretPath',
    vaultAuthType: 'authType',
    vaultUser: 'user',
    vaultPassword: 'password',
  };
  const loggerConfig: LoggerConfig = {
    appName: 'test-app-name',
    moduleName: 'vault-test',
    logLevel: 'info',
    logStyle: 'cli',
  };
  const entityId = 'entityId';
  const connectionError = new Error('connection error');
  connectionError.name = 'RequestError';
  const entityNotFoundError = new Error('Status 404');

  beforeEach(() => {
    testObject = new VaultProvider(config, loggerConfig);
  });

  it('should not throw error given userpasslogin does not throw error when initialize', async () => {
    // arrange
    let thrown = null;

    // act
    try {
      await testObject.initialize();
    } catch (e) {
      thrown = e;
    }

    // assert
    expect(thrown).toBeNull();
  });

  it('should throw error given userpasslogin throws error when initialize', async () => {
    // arrange
    mockUserpassLogin.mockRejectedValueOnce(new Error());
    let thrown = null;

    // act
    try {
      await testObject.initialize();
    } catch (e) {
      thrown = e;
    }

    // assert
    expect(thrown).not.toBeNull();
  });

  it('should call read when read', async () => {
    // act
    await testObject.initialize();
    await testObject.read(entityId);

    // assert
    expect(mockRead).toHaveBeenCalledWith(`${config.vaultSecretPath}/${entityId}`);
  });

  it('should throw access error given read throws when read', async () => {
    // arrange
    mockRead.mockRejectedValueOnce(connectionError);

    // act
    await testObject.initialize();

    // assert
    await expect(testObject.read(entityId)).rejects.toThrow(VaultAccessError);
  });

  it('should throw resource not found error given read throws when read', async () => {
    // arrange
    mockRead.mockRejectedValueOnce(entityNotFoundError);

    // act
    await testObject.initialize();

    // assert
    await expect(testObject.read(entityId)).rejects.toThrow(ResourceNotFoundError);
  });

  it('should call write when write', async () => {
    // arrange
    const data = {
      name: 'musa',
      surname: 'ecer',
    };

    // act
    await testObject.initialize();
    await testObject.write(entityId, data);

    // assert
    expect(mockWrite).toHaveBeenCalledWith(`${config.vaultSecretPath}/${entityId}`, { data: { value: data } });
  });

  it('should throw given write throws when write', async () => {
    // arrange
    const data = {
      name: 'musa',
      surname: 'ecer',
    };
    mockWrite.mockRejectedValueOnce(connectionError);

    // act
    await testObject.initialize();

    // assert
    await expect(testObject.write(entityId, data)).rejects.toThrow(VaultAccessError);
  });

  it('should call delete when delete', async () => {
    // act
    await testObject.initialize();
    await testObject.delete(entityId);

    // assert
    expect(mockDelete).toHaveBeenCalledWith(`${config.vaultSecretPath}/${entityId}`);
  });

  it('should throw given delete throws when delete', async () => {
    // arrange
    mockDelete.mockRejectedValueOnce(connectionError);

    // act
    await testObject.initialize();

    // assert
    await expect(testObject.delete(entityId)).rejects.toThrow(VaultAccessError);
  });

  it('should create an instance with error parameter', () => {
    const testedError = new RequiredVaultOptionsMissing();

    expect(testedError.message).toBe('Vault Provider Required Options are missing');
    expect(testedError.code).toBe('error.unexpected');
    expect(testedError.name).toBe('RequiredVaultOptionsMissing');
    expect(testedError.status).toBe(500);
    expect(testedError.isPublic).toBe(true);
  });
});
