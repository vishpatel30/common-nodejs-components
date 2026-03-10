# `express-http-server`

Express http server for initializing middleware, error handlers, routes, openapi validator and logger.

## Config

| Name                                        | Description                                                           |
| ------------------------------------------- | --------------------------------------------------------------------- |
| router                                      | Base routes to initialize in the server                               |
| openapiBaseSchema                           | Path to OpenAPI specification yaml file                               |
| env                                         | Control logging and stack inclusion in error responses                |
| ignoredAccessLogPaths                       | URL path fragments to be excluded from the access logs                |


For logger configuration properties see the
[logger documentation](https://gitlab.byteprophecy.accenture.com/dataverse/common-nodejs-components/blob/develop/packages/logger/README.md)


## Usage

```typescript

import { App } from 'express-http-server';

/**required env values */
const appConfig = {
  /** base routes to initialize in the server */
  router: routers,  

  /** logger configuration */
  logger: { logLevel: 'debug', logStyle: 'cli', appName: 'nodejs-commons', moduleName: 'App' },
  ignoredAccessLogPaths: '',

  /** path to openapi swagger file */
  openapiBaseSchema: 'src/openapi/api.schema.yml',

  /** environment(development/test/prod) */  
  env: 'development',

  /** function which allows you to register custom body parsers */
  customBodyParser: (app: Express) => app.use(express.json()),
};

/** initializing the server */
export const app = new App(appConfig).init();

```
