# `@dataverse/express-jwt-validator`

Helper for validating oauth2/openid-connect JWT tokens using public keys loaded from identity providers.

## Config

| Name                       | Description                                                                       |
| -------------------------- | --------------------------------------------------------------------------------- |
| JWT_ISSUER                 | JWT Issuer                                                                        |
| JWT_ALGORITHM              | Algorithm of the private key that was used to sign the JWT token                  |
| JWT_JWKS_URI               | URL to JWKS (json web keys) endpoint                                              |
| JWT_JWKS_TIMEOUT           | Timeout for http client when fetching JWKS                                        |
| JWT_JWKS_CACHE             | Enables/disables JWK local cache                                                  |
| JWT_JWKS_CACHE_MAX_ENTRIES | Max entries to keep in the JWK local cache                                        |
| JWT_JWKS_CACHE_MAX_AGE     | Max age of items in the local JWK cache                                           |
| JWT_JWKS_RATE_LIMIT        | Enables/disables JWKS http client rate limiting                                   |
| JWT_JWKS_RATE_LIMIT_RPM    | Number of allowed JWKS http client calls per minute                               |
| cookieToken                | Sets which token to extract from cookie for jwt validation (id, access [default]) |

## Usage

```typescript
// init validator instance (should use 1 instance per app)
import { jwtValidator, Config } from '@dataverse/express-jwt-validator`';

const config: Config = {
  jwtJwksUri: 'https://testing.well-known.uri/jwks.json',
  jwtJwksTimeout: 1000,

  jwtJwksCache: false,
  jwtJwksCacheMaxEntries: 1,
  jwtJwksCacheMaxAge: 1000,

  jwtJwksRateLimit: false,
  jwtJwksRateLimitRpm: 100,

  jwtIssuer: 'test-issuer',
  jwtAlgorithm: 'RS256',
  cookieToken: 'id'; // optional, default is 'access'
};

const validateJwt = jwtValidator(config);

// register jwt validator in a specific express route
this.router.get('/user-info', validateJwt, authController.userInfo);

// use token information in route handlers
import { AuthorizedRequest } from '@dataverse/express-jwt-validator';

getResource: RequestHandler = forwardError(async (req: AuthorizedRequest, res: Response): Promise<void> => {
  // access token information under user field
  const userName = req.user.username;
  const scope = req.user.scope;
  const clientId = req.user.client_id;
  const roles = req.user['cognito:groups'];
}

// For this to work you have to include cookieToken config set to 'id'
getResourceIdToken: RequestHandler = forwardError(async (req: IdAuthorizedRequest, res: Response): Promise<void> => {
  // id token information under user field
  const scope = req.user.email;
  const clientId = req.user['custom:workspaceId'];
    const roles = req.user['cognito:groups'];

}
```
