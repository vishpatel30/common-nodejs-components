import { ResilientExecutor } from '../index';
import { AxiosError } from 'axios';
const config = {
  logger: { logLevel: 'cli', logStyle: 'debug', appName: 'nodejs-commons', moduleName: 'ResilientExecutor' },
  httpResilienceCBHalfOpenAfterMS: 10 * 1000,
  httpResilienceCBConsecutiveThreshold: 5,
  httpResilienceRetryCount: 3,
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('@dataverse/http-resilient-executor', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should retry a failed request towards mock function 3 times(500 error)', async () => {
    const axiosErr: AxiosError = {
      response: {
        status: 500,
        data: 'test',
        statusText: 'test',
        headers: {},
        config: {},
      },
      isAxiosError: true,
      config: {},
      name: 'axios error',
      message: 'Something went wrong',
      toJSON: () => ({}),
    };

    const resilientExec = new ResilientExecutor(config);

    const testMock = jest.fn();

    testMock.mockImplementation(() => {
      throw axiosErr;
    });

    try {
      await resilientExec.execute(testMock);
    } catch (error: any) {
      expect(testMock).toBeCalledTimes(4);
    }
  });

  it('should retry a failed request towards mock function 3 times(502 error)', async () => {
    const axiosErr: AxiosError = {
      response: {
        status: 502,
        data: 'test',
        statusText: 'test',
        headers: {},
        config: {},
      },
      isAxiosError: true,
      config: {},
      name: 'axios error',
      message: 'Bad Gateway',
      toJSON: () => ({}),
    };

    const resilientExec = new ResilientExecutor(config);

    const testMock = jest.fn();

    testMock.mockImplementation(() => {
      throw axiosErr;
    });

    try {
      await resilientExec.resilientExecutor.execute(testMock);
    } catch (error: any) {
      expect(testMock).toBeCalledTimes(4);
    }
  });

  it('should retry a failed request towards mock function 3 times(ECONNREFUSED error)', async () => {
    interface CustomError extends Error {
      code: string;
    }

    const econnErr: CustomError = {
      code: 'ECONNREFUSED',
      name: 'ECONNREFUSED error',
      message: 'ECONNREFUSED error',
    };

    const resilientExec = new ResilientExecutor(config);

    const testMock = jest.fn();

    testMock.mockImplementation(() => {
      throw econnErr;
    });

    try {
      await resilientExec.resilientExecutor.execute(testMock);
    } catch (error: any) {
      expect(testMock).toBeCalledTimes(4);
    }
  });

  it('should not retry a failed request if error code is 4xx', async () => {
    const axiosErr: AxiosError = {
      response: {
        status: 400,
        data: 'test',
        statusText: 'test',
        headers: {},
        config: {},
      },
      isAxiosError: true,
      config: {},
      name: 'axios error',
      message: 'Something went wrong',
      toJSON: () => ({}),
    };

    const resilientExec = new ResilientExecutor(config);

    const testMock = jest.fn();

    testMock.mockImplementation(() => {
      throw axiosErr;
    });

    try {
      await resilientExec.resilientExecutor.execute(testMock);
    } catch (error: any) {
      expect(testMock).toBeCalledTimes(1);
    }
  });

  it('should trigger circuit breaker after 5th failed request', async () => {
    const axiosErr: AxiosError = {
      response: {
        status: 500,
        data: 'test',
        statusText: 'test',
        headers: {},
        config: {},
      },
      isAxiosError: true,
      config: {},
      name: 'axios error',
      message: 'Something went wrong',
      toJSON: () => ({}),
    };

    const resilientExec = new ResilientExecutor(config);

    const testMock = jest.fn();

    testMock.mockImplementation(() => {
      throw axiosErr;
    });

    try {
      await resilientExec.resilientExecutor.execute(testMock);
    } catch (error: any) {
      // 4 failed requests
      expect(testMock).toBeCalledTimes(4);
    }

    try {
      await resilientExec.resilientExecutor.execute(testMock);
    } catch (error: any) {
      // First call to test mock should be triggered
      // Second call to test mock  should be blocked by opened CB
      expect(testMock).toBeCalledTimes(5); // 4 failed requests + 1
    }
  });

  it('should call the function in CB half open state(the request fails again, the CB will be in open state)', async () => {
    const axiosErr: AxiosError = {
      response: {
        status: 500,
        data: 'test',
        statusText: 'test',
        headers: {},
        config: {},
      },
      isAxiosError: true,
      config: {},
      name: 'axios error',
      message: 'Something went wrong',
      toJSON: () => ({}),
    };

    const resilientExec = new ResilientExecutor({
      logger: { logLevel: 'cli', logStyle: 'debug', appName: 'nodejs-commons', moduleName: 'ResilientExecutor' },
      httpResilienceCBHalfOpenAfterMS: 1 * 1000,
      httpResilienceCBConsecutiveThreshold: 3,
      httpResilienceRetryCount: 1,
    });

    const testMock = jest.fn();

    testMock.mockImplementation(() => {
      throw axiosErr;
    });

    try {
      await resilientExec.resilientExecutor.execute(testMock);
    } catch (error: any) {
      // 1 call + 1 retry
      expect(testMock).toBeCalledTimes(2);
    }

    // circuit breaker should be open
    try {
      await resilientExec.resilientExecutor.execute(testMock);
    } catch (error: any) {
      // First call to test mock should be triggered
      // Second call to test mock  should be blocked by opened CB
      expect(testMock).toBeCalledTimes(3); // 2 failed requests + 1
    }

    // wait for 1 sec
    await delay(1000);

    // circuit breaker should be half open
    try {
      await resilientExec.resilientExecutor.execute(testMock);
    } catch (error: any) {
      // First call to test mock should be triggered
      // Second call to test mock  should be blocked by opened CB
      expect(testMock).toBeCalledTimes(4);
    }

    // circuit breaker should be open again if the request fails
    try {
      await resilientExec.resilientExecutor.execute(testMock);
    } catch (error: any) {
      // First call to test mock should be triggered
      // Second call to test mock  should be blocked by opened CB
      expect(testMock).toBeCalledTimes(4); // 2 failed requests + 1
    }
  });

  it('should call the function in CB half open state(the request pass, the CB will be closed)', async () => {
    const axiosErr: AxiosError = {
      response: {
        status: 500,
        data: 'test',
        statusText: 'test',
        headers: {},
        config: {},
      },
      isAxiosError: true,
      config: {},
      name: 'axios error',
      message: 'Something went wrong',
      toJSON: () => ({}),
    };

    const resilientExec = new ResilientExecutor({
      logger: { logLevel: 'cli', logStyle: 'debug', appName: 'nodejs-commons', moduleName: 'ResilientExecutor' },
      httpResilienceCBHalfOpenAfterMS: 1 * 1000,
      httpResilienceCBConsecutiveThreshold: 3,
      httpResilienceRetryCount: 1,
    });

    const testMock = jest.fn();

    testMock.mockImplementationOnce(() => {
      throw axiosErr;
    });

    testMock.mockImplementationOnce(() => {
      throw axiosErr;
    });

    testMock.mockImplementationOnce(() => {
      throw axiosErr;
    });

    testMock.mockImplementationOnce(() => {
      return 'success';
    });

    testMock.mockImplementationOnce(() => {
      return 'test success';
    });

    try {
      await resilientExec.resilientExecutor.execute(testMock);
    } catch (error: any) {
      // 1 call + 1 retry
      expect(testMock).toBeCalledTimes(2);
    }

    // circuit breaker should be open
    try {
      await resilientExec.resilientExecutor.execute(testMock);
    } catch (error: any) {
      // First call to test mock should be triggered
      // Second call to test mock  should be blocked by opened CB
      expect(testMock).toBeCalledTimes(3); // 2 failed requests + 1
    }

    // wait for 1 sec
    await delay(1000);

    // circuit breaker should be half open

    const res = await resilientExec.resilientExecutor.execute(testMock);

    expect(res).toBe('success');
    //call to test mock should be triggered
    expect(testMock).toBeCalledTimes(4);

    // circuit breaker should be close if the request pass

    const response = await resilientExec.resilientExecutor.execute(testMock);

    expect(response).toBe('test success');

    expect(testMock).toBeCalledTimes(5);
  });
});
