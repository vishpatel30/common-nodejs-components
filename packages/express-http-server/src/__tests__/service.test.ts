import ApiError, { ExtendableError, DetailedError, ResourceNotFoundError } from '@dataverse/errors';
import request from 'supertest';
import { Request, Response, NextFunction, Router, RequestHandler } from 'express';
import { forwardError } from '@dataverse/express-forward-error';
import * as OpenApiValidator from 'express-openapi-validator';
import { API } from '../constants';
import App from '../index';
import { join } from 'path';

const appConfig = {
  router: Router(),
  logger: { logLevel: 'error', logStyle: 'cli', appName: 'nodejs-postgres-base', moduleName: 'App' },
  ignoredAccessLogPaths: '',
  openapiBaseSchema: join(__dirname, 'api.schema.yml'),
  env: 'development',
};

// This acts as sort of a Application factory for tests
export const app = new App(appConfig).init();

describe('Service', () => {
  it(`should expose health check endpoint on ${API.HEALTH_CHECK}`, async () => {
    // when
    const response = await request(app).get(API.HEALTH_CHECK);

    // then
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('OK');
  });

  it(`should expose ready check endpoint on ${API.READY_CHECK}`, async () => {
    // when
    const response = await request(app).get(API.READY_CHECK);

    // then
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('OK');
  });

  it(`should return 503 from ${API.READY_CHECK} when not ready`, async () => {
    // when
    const appInstance = new App(appConfig);
    const appNotReady = appInstance.init();

    // simulate signal SIGTERM received
    appInstance.shutdown();

    const response = await request(appNotReady).get(API.READY_CHECK);

    // then
    expect(response.statusCode).toBe(503);
    expect(response.text).toBe('Service Unavailable');
  });

  it(`should expose OpenAPI specification on ${API.SWAGGER_UI}`, async () => {
    // when
    const response = await request(app).get(`${API.SWAGGER_UI}/`);

    // then
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(response.text).toContain('<title>Swagger UI</title>');
  });

  it('should return 404 on /invalid/resource', async () => {
    // when
    const response = await request(app).get('/invalid/resource');

    // then
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toEqual('not found');
  });

  it("should transform openapi validators' BadRequest error to API error", async () => {
    // given
    const extendedApp = new App(appConfig);

    const expectedMessage = 'Bad Request';
    const openapiValidationError = new OpenApiValidator.error.BadRequest({
      path: '/test',
      message: expectedMessage,
    });

    extendedApp.app.get('/test', async (_req: Request, _res: Response, next: NextFunction) => {
      next(openapiValidationError);
    });

    // when
    const response = await request(extendedApp.init()).get('/test');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(expectedMessage);
  });

  it("should transform openapi validators' Unauthorized error to API error", async () => {
    // given
    const extendedApp = new App(appConfig);

    const expectedMessage = 'Test endpoint method unauthorized message';
    const openapiValidationError = new OpenApiValidator.error.Unauthorized({
      path: '/test',
      message: expectedMessage,
    });

    extendedApp.app.get('/test', async (_req: Request, _res: Response, next: NextFunction) => {
      next(openapiValidationError);
    });

    // when
    const response = await request(extendedApp.init()).get('/test');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(expectedMessage);
  });

  it("should transform openapi validators' MethodNotAllowed error to API error", async () => {
    // given
    const extendedApp = new App(appConfig);

    const expectedMessage = 'Test endpoint method not allowed message';
    const openapiValidationError = new OpenApiValidator.error.MethodNotAllowed({
      path: '/test',
      message: expectedMessage,
    });

    extendedApp.app.get('/test', async (_req: Request, _res: Response, next: NextFunction) => {
      next(openapiValidationError);
    });

    // when
    const response = await request(extendedApp.init()).get('/test');

    expect(response.status).toBe(405);
    expect(response.body.message).toBe(expectedMessage);
  });

  it('should handle APIError', async () => {
    // given
    const extendedApp = new App(appConfig);

    const stackError = new Error('Original cause of the test APIError');
    const apiError = new ApiError(
      'This error was produced by service.test.ts',
      { code: 'error.some-error', isPublic: false },
      stackError,
    );

    extendedApp.app.get('/test', async (_req: Request, _res: Response, next: NextFunction) => {
      next(apiError);
    });

    // when
    const response = await request(extendedApp.init()).get('/test');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('An unexpected error has occurred');
    expect(response.body.code).toBe('error.some-error');
  });

  it('should handle APIError marked as public', async () => {
    // given
    const extendedApp = new App(appConfig);

    const stackError = new Error('Original cause of the test APIError');

    const apiError = new ApiError(
      'This error was produced by service.test.ts',
      { code: 'error.some-error', isPublic: true, status: 405 },
      stackError,
    );

    extendedApp.app.get('/test', async (_req: Request, _res: Response, next: NextFunction) => {
      next(apiError);
    });

    // when
    const response = await request(extendedApp.init()).get('/test');

    expect(response.status).toBe(405);
    expect(response.body.message).toBe('This error was produced by service.test.ts');
    expect(response.body.code).toBe('error.some-error');
  });

  it('should handle APIError marked with default parameters', async () => {
    // given
    const extendedApp = new App(appConfig);

    const apiError = new ApiError('This error was produced by service.test.ts', {});

    extendedApp.app.get('/test', async (_req: Request, _res: Response, next: NextFunction) => {
      next(apiError);
    });

    // when
    const response = await request(extendedApp.init()).get('/test');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('An unexpected error has occurred');
    expect(response.body.code).toBe('error.unexpected');
  });

  it('should handle DetailedError', async () => {
    // given
    const extendedApp = new App(appConfig);

    extendedApp.app.get('/test', async (_req: Request, _res: Response, next: NextFunction) => {
      const stackError = new Error('Original cause of the test StatusCodeError');
      const statusCodeError = new DetailedError(
        'This error was produced by service.test.ts',
        [],
        {
          status: 500,
          code: '10',
          isPublic: true,
        },
        stackError,
      );

      next(statusCodeError);
    });

    // when
    const response = await request(extendedApp.init()).get('/test');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('This error was produced by service.test.ts');
    expect(response.body.code).toBe('10');
  });

  it('should handle DetailedError marked as private', async () => {
    // given
    const extendedApp = new App(appConfig);

    extendedApp.app.get('/test', async (_req: Request, _res: Response, next: NextFunction) => {
      next(
        new DetailedError('This error was produced by service.test.ts', [], {
          status: 500,
          code: '10',
          isPublic: false,
        }),
      );
    });

    // when
    const response = await request(extendedApp.init()).get('/test');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('An unexpected error has occurred');
    expect(response.body.code).toBe('10');
  });

  it('should handle DetailedError with default parameters', async () => {
    // given
    const extendedApp = new App(appConfig);

    extendedApp.app.get('/test', async (_req: Request, _res: Response, next: NextFunction) => {
      next(new DetailedError('This error was produced by service.test.ts', [], { code: '10' }));
    });

    // when
    const response = await request(extendedApp.init()).get('/test');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('An unexpected error has occurred');
    expect(response.body.code).toBe('10');
  });

  it('should handle ExtendableError', async () => {
    // given
    const extendedApp = new App(appConfig);
    const extendableError = new ExtendableError('This error was produced by service.test.ts', 'extendable-error');

    extendedApp.app.get('/test', async (_req: Request, _res: Response, next: NextFunction) => {
      next(extendableError);
    });

    // when
    const response = await request(extendedApp.init()).get('/test');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('An unexpected error has occurred');
    expect(response.body.code).toBe('extendable-error');
  });

  it('should handle children of ApiError', async () => {
    // given
    const extendedApp = new App(appConfig);
    const extendableError = new ResourceNotFoundError('TestId');

    extendedApp.app.get(
      '/test',
      forwardError(async () => {
        throw extendableError;
      }) as RequestHandler,
    );

    // when
    const response = await request(extendedApp.init()).get('/test');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Requested resource with ID: TestId was not found');
    expect(response.body.code).toBe('error.resource.not-found');
  });

  it('should handle Error', async () => {
    // given
    const extendedApp = new App(appConfig);
    const extendableError = new Error('This error was produced by service.test.ts');

    extendedApp.app.get(
      '/test',
      forwardError(async () => {
        throw extendableError;
      }) as RequestHandler,
    );

    // when
    const response = await request(extendedApp.init()).get('/test');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('An unexpected error has occurred');
    expect(response.body.code).toBe('error.unexpected');
  });

  it('should skip error handling when headers were already sent', async () => {
    // given
    const extendedApp = new App(appConfig);
    const extendableError = new Error('This error was produced by service.test.ts');

    extendedApp.app.get(
      '/test',
      forwardError(async (_req: Request, res: Response) => {
        res.send({ message: 'ok' }).status(200);
        throw extendableError;
      }) as RequestHandler,
    );

    // when
    const response = await request(extendedApp.init()).get('/test');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('ok');
  });

  it('should handle SyntaxError', async () => {
    // given
    const invalidJsonPayload = `{"message":}`;
    const extendedApp = new App(appConfig);

    extendedApp.app.post('/test', async (_req: Request, res: Response) => {
      res.send('ok');
    });

    // when
    const response = await request(extendedApp.init())
      .post('/test')
      .set('Content-Type', 'application/json')
      .send(invalidJsonPayload);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Unexpected token } in JSON at position 11');
    expect(response.body.code).toBe('error.request.invalid');
  });

  it('should allow you to override default body parsers', async () => {
    let isFunctionCalled = false;
    const customBodyParser = () => {
      isFunctionCalled = true;
    };

    const appWithoutCustomParser = new App({ ...appConfig }) as any;
    expect(isFunctionCalled).toBe(false);
    console.log(appWithoutCustomParser);
    expect(appWithoutCustomParser.app._router.stack.length).toBeTruthy();

    const newApp = new App({ ...appConfig, customBodyParser }) as any;
    expect(isFunctionCalled).toBe(true);

    expect(newApp.app._router).toBeUndefined();
  });
});
