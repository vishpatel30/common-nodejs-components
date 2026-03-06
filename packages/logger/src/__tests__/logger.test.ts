import { Config, getLogger } from '../index';

describe('@dataverse/logger', () => {
  it('should construct a logger with cli config option', () => {
    // given
    const config: Config = {
      appName: 'test-app-name',
      moduleName: 'logger-config-test',
      logLevel: 'info',
      logStyle: 'cli',
    };

    const logger = getLogger(config);
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.error).toBeDefined();

    expect(logger.level).toBe('info');

    logger.info('This is a testing log in CLI mode');
  });

  it('should construct a logger with json config option', () => {
    // given
    const config: Config = {
      appName: 'test-app-name',
      moduleName: 'logger-config-test',
      logLevel: 'info',
      logStyle: 'json',
    };

    const logger = getLogger(config);
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.error).toBeDefined();

    expect(logger.level).toBe('info');

    logger.info('This is a testing log in json');
  });

  it('should log error with a stack trace', () => {
    // given
    const config: Config = {
      appName: 'test-app-name',
      moduleName: 'logger-config-test',
      logLevel: 'info',
      logStyle: 'json',
    };

    const logger = getLogger(config);

    expect(logger.info).toBeDefined();
    expect(logger.level).toBe('info');

    logger.info('this is my error', new Error('Cool error'));
  });

  it('should log error with a stack trace in CLI mode', () => {
    // given
    const config: Config = {
      appName: 'test-app-name',
      moduleName: 'logger-config-test',
      logLevel: 'info',
      logStyle: 'cli',
    };

    const logger = getLogger(config);

    expect(logger.info).toBeDefined();
    expect(logger.level).toBe('info');

    logger.info('this is my error: ', new Error('Cool error'));
  });
});
