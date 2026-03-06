import express, { NextFunction, Request, Response, Express, Router } from 'express';
import cors from 'cors';
import * as OpenApiValidator from 'express-openapi-validator';
import expressWinston from 'express-winston';
import httpStatus from 'http-status';
import helmet from 'helmet';
import * as swaggerUI from 'swagger-ui-express';
import YAML from 'yamljs';
import { Logger, getLogger, Config as LoggerConfig } from '@dataverse/logger';
import { GLOBAL, API } from './constants';
import ApiError, {
  DetailedError,
  ExtendableError,
  UnauthorizedError,
  MethodNotAllowedError,
  UnsupportedMediaTypeError,
  NotAcceptableError,
  EndpointNotFoundError,
} from '@dataverse/errors';
import cookieParser from 'cookie-parser';
import { UnauthorizedError as JwtUnauthorizedError } from '@dataverse/express-jwt-validator';

export { API, GLOBAL } from './constants';

interface Config {
  router: Router;
  logger: LoggerConfig;
  ignoredAccessLogPaths: string;
  openapiBaseSchema?: string;
  openapiSpec?: any;
  env: string;
  shouldCheckOpenApiBaseSchema?: boolean
  requestPayloadLimit?:string

  /**
   * Allows you to disable default body parsers (urlencoded, json & cookie-parser)
   * and provides you with express app instance to register your own.
   * @param app App instance for your function to register your own body parsers.
   */
  customBodyParser?: (app: Express) => void;
}

export class App {
  public readonly app: Express;

  private readyState: Boolean = false;

  private readonly logger: Logger;

  private readonly config: Config;

  private dynamicRouter?: express.Router;

  constructor(appConfig: Config) {
    let shouldCheckOpenApiBaseSchema = appConfig.shouldCheckOpenApiBaseSchema === false ? appConfig.shouldCheckOpenApiBaseSchema: true
    if (shouldCheckOpenApiBaseSchema && !appConfig.openapiBaseSchema && !appConfig.openapiSpec) {
      throw new Error('Error in app configuration either openapiBaseSchema or openapiSpec have to be provided.');
    }

    this.logger = getLogger(appConfig.logger);
    this.config = appConfig;
    this.app = express();
    this.app.use(cors())

    if (!this.config.customBodyParser) {
      this.app.use(express.urlencoded({ extended: true }));
      this.app.use(express.json({limit: appConfig.requestPayloadLimit}));
      this.app.use(cookieParser());
    } else {
      this.config.customBodyParser(this.app);
    }
  }

  public init(): Express {
    // setup basic first
    this.initLogging();
    this.initSecurity();
    this.initHealth();

    // Setup dynamic router for reloading routes that can change with feature toggles
    this.reloadDynamicRouter(this.config.openapiSpec); // we need to create new instance first
    this.registerDynamicRouter();

    if(this.config.openapiSpec){
    this.initOpenApiValidation(this.config.openapiSpec);
    }

    // Regular routes, error translation and error handling has to come last
    this.initRoutes();
    this.initErrorTranslation();
    this.initErrorHandling();

    // make sure service will receive HTTP traffic
    this.readyState = true;

    return this.app;
  }

  private initLogging() {
    const winstionLogger = expressWinston.logger({
      meta: false,
      msg: 'HTTP {{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}',
      winstonInstance: this.logger,
      ignoreRoute: (req: Request, res: Response) =>
        this.config.ignoredAccessLogPaths.indexOf(req.url) > -1 && res.statusCode === httpStatus.OK,
    });

    this.app.use(winstionLogger);
  }

  private initSecurity() {
    // security headers decorator
    this.app.use(helmet());
    this.app.use(helmet.frameguard({ action: 'deny' }));
    this.app.disable('x-powered-by');
  }

  private initHealth() {
    // kubernetes liveness probe endpoint
    this.app.get(API.HEALTH_CHECK, async (_req: Request, res: Response) => {
      res.sendStatus(httpStatus.OK);
    });

    // kubernetes readiness probe endpoint
    this.app.get(API.READY_CHECK, async (_req: Request, res: Response) => {
      if (this.readyState) {
        res.sendStatus(httpStatus.OK);
      } else {
        res.sendStatus(httpStatus.SERVICE_UNAVAILABLE);
      }
    });

    this.app.get('/', async (_req: Request, res: Response) => {
      res.sendStatus(httpStatus.OK);
    });
  }

  private registerDynamicRouter() {
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (!this.dynamicRouter) {
        throw new Error("Dynamic router is used before it's created");
      }
      this.dynamicRouter(req, res, next);
    });
  }

  public reloadDynamicRouter(openApiSpec?: any) {
    this.logger.info('Reloading dynamic routes...');
    this.dynamicRouter = Router();

    if(openApiSpec){
      this.initSwaggerUI(openApiSpec);
      this.initOpenApiValidation(openApiSpec);
    }

  }

  private initSwaggerUI(openApiSpec?: any) {
    if (!this.dynamicRouter) {
      throw new Error("Dynamic router is used before it's created");
    }
    this.dynamicRouter.use(
      API.SWAGGER_UI,
      swaggerUI.serve,
      swaggerUI.setup(openApiSpec || YAML.load(this.config.openapiBaseSchema!)),
    );
  }

  private initOpenApiValidation(openapiSpec?: any) {
    // request/response body/param validator
    if (!this.dynamicRouter) {
      throw new Error("Dynamic router is used before it's created");
    }
    this.dynamicRouter.use(
      OpenApiValidator.middleware({
        apiSpec: openapiSpec || this.config.openapiBaseSchema!,
        validateRequests: true,
        fileUploader: false,
        validateResponses: {
          onError: (err) => {
            this.logger.error('Response validation failed with error: %o', err);
          },
        },
      }),
    );
  }

  private initRoutes() {
    // main router entry points. all routes must be defined under routes.ts
    this.app.use('/', this.config.router);

    // catches 404 and forwards to error handler
    this.app.use((_req: Request, _res: Response, next: NextFunction) => {
      const err = new ApiError('API endpoint not found', {
        code: 'error.endpoint.not-found',
        status: httpStatus.NOT_FOUND,
        isPublic: true,
      });
      return next(err);
    });
  }

  private openApiErrorTranslation() {
    this.app.use((err: Error, _req: Request, _res: Response, next: NextFunction) => {
      if (err instanceof OpenApiValidator.error.BadRequest) {
        const details: any[] = err.errors.map((item: any) => ({
          target: item.path,
          message: item.message,
          code: item.code,
        }));

        return next(
          new DetailedError(err.name, details, { status: 400, isPublic: true, code: 'error.request.invalid' }, err),
        );
      }

      if (err instanceof OpenApiValidator.error.Unauthorized || err instanceof JwtUnauthorizedError) {
        return next(new UnauthorizedError(err.message, err));
      }

      if (err instanceof OpenApiValidator.error.NotFound) {
        return next(new EndpointNotFoundError(err.message, err));
      }

      if (err instanceof OpenApiValidator.error.MethodNotAllowed) {
        return next(new MethodNotAllowedError(err.message, err));
      }

      if (err instanceof OpenApiValidator.error.NotAcceptable) {
        return next(new NotAcceptableError(err.message, err));
      }

      if (err instanceof OpenApiValidator.error.UnsupportedMediaType) {
        return next(new UnsupportedMediaTypeError(err.message, err));
      }

      return next(err);
    });
  }

  private initErrorTranslation() {
    this.openApiErrorTranslation();
    // converts error if it's not an instanceOf ApiError
    this.app.use((err: any, _req: Request, _res: Response, next: NextFunction) => {
      if (this.config.env !== GLOBAL.ENV_TEST) {
        this.logger.error(err);
      }

      if (err instanceof SyntaxError) {
        return next(new ApiError(err.message, { status: 400, isPublic: true, code: 'error.request.invalid' }, err));
      }

      if (!(err instanceof ApiError) && err instanceof ExtendableError) {
        const apiError = new ApiError(err.message, { code: err.code }, err);
        return next(apiError);
      }

      if (!(err instanceof ExtendableError)) {
        const apiError = new ApiError(err.message, {}, err);
        return next(apiError);
      }
      return next(err);
    });
  }

  private initErrorHandling() {
    // error handler
    // logs every error if not in test environment & sends stacktrace only during development
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.app.use((error: ApiError, _req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        return next(error);
      }

      const errorResponse = {
        message: error.isPublic ? error.message : 'An unexpected error has occurred',
        code: error.code,
        stack: this.config.env === GLOBAL.ENV_DEV ? error.stack : undefined,
      };

      if (error instanceof DetailedError) {
        res.status(error.status).json({
          ...errorResponse,
          details: error.details,
        });
        return;
      }

      res.status(error.status).json(errorResponse);
    });
  }

  public shutdown() {
    this.readyState = false;
  }
}

export default App;
