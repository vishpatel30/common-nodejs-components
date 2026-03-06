import { forwardError } from '../index';

describe('@dataverse/forward-error', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should not call the next function on callback success', async () => {
    const handler = forwardError(async () => {});

    const spy = jest.fn();

    await handler({} as any, {} as any, spy);

    expect(spy).toBeCalledTimes(0);
  });

  it('should call the next function on callback throwing an error', async () => {
    const asyncError = new Error('Some error during async execution.');
    const handler = forwardError(async () => {
      throw asyncError;
    });

    const spy = jest.fn();

    await handler({} as any, {} as any, spy);

    expect(spy).toBeCalledTimes(1);
    expect(spy).toBeCalledWith(asyncError);
  });
});
