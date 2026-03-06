import { expressjwt, TokenGetter } from 'express-jwt';
import { Request } from 'express';
import { expressJwtSecret, GetVerificationKey } from 'jwks-rsa';

export type JwtAlgorithm =
  | 'HS256'
  | 'HS384'
  | 'HS512'
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'ES256'
  | 'ES384'
  | 'ES512'
  | 'PS256'
  | 'PS384'
  | 'PS512'
  | 'none';

export {
  TESTING_JWKS_RESPONSE,
  signBareTestingToken,
  signTestingToken,
  signTestingTokenWithDefaults,
} from './test-helpers';

export { UnauthorizedError } from 'express-jwt';

export interface Config {
  jwtIssuer: string;
  jwtAlgorithm: JwtAlgorithm;
  jwtJwksUri: string;
  jwtJwksTimeout: number;
  jwtJwksCache: boolean;
  jwtJwksCacheMaxEntries: number;
  jwtJwksCacheMaxAge: number;
  jwtJwksRateLimit: boolean;
  jwtJwksRateLimitRpm: number;
  /** Optionally set token you want to extract from cookies. 'id' or 'access' where 'access' is taken by default */
  cookieToken?: 'id' | 'access';
}

export interface BaseJwt {
  // JWT standard claims
  sub: string;
  iss: string;
  exp: number;
  iat: number;
  jti: string;

  // AWS cognito specifics
  'cognito:groups': Array<string>;
  origin_jti: string;
  token_use: string;
  auth_time: number;
}

export interface AccessTokenPayload extends BaseJwt {
  username: string;
  scope: string;
  version: number;
  client_id: string;
}

export interface IdTokenPayload extends BaseJwt {
  aud: string;
  email: string;
  'custom:workspaceId'?: string;
}

/**
 * Extends Express Request type with user object containing data extracted from JWT access token.
 */
export interface AuthorizedRequest extends Request {
  user?: AccessTokenPayload;
}

/**
 * Extends Express Request type with user object containing data extracted from JWT id token.
 */
export interface IdAuthorizedRequest extends Request {
  user?: IdTokenPayload;
}

export const extractBearerToken = (req: Request): string | undefined => {
  if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  }
};

/**
 * Utility function for extracting the JWT token from express request object stored.
 * It tries to extract the access token from cookie['access_token'] first.
 * If no cookie is present we take any token from Authorization header with bearer type.
 * @param req express request object
 * @returns successfully extracted token string or undefined
 */
export const extractToken = (req: Request): string | undefined => {
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }

  return extractBearerToken(req);
};

/**
 * Utility function for extracting the JWT token from express request object stored.
 * It tries to extract the ID token from cookie['id_token'] first.
 * If no cookie is present we take any token from Authorization header with bearer type.
 * @param req express request object
 * @returns successfully extracted token string or undefined
 */
export const extractIdToken = (req: Request): string | undefined => {
  if (req.cookies && req.cookies.id_token) {
    return req.cookies.id_token;
  }

  return extractBearerToken(req);
};

const getCookieTokenExtractor = (config: Config): TokenGetter => {
  if (config.cookieToken && config.cookieToken === 'id') {
    return extractIdToken;
  } else {
    return extractToken;
  }
};

/**
 * Creates an instance of express JWT validator middleware.
 * @param config configurations options for the validator
 * @returns instance of express JWT validator middleware
 */
export const jwtValidator = (config: Config) => {
  const secretClient = expressJwtSecret({
    jwksUri: config.jwtJwksUri,
    timeout: config.jwtJwksTimeout,

    cache: config.jwtJwksCache,
    cacheMaxEntries: config.jwtJwksCacheMaxEntries,
    cacheMaxAge: config.jwtJwksCacheMaxAge,

    rateLimit: config.jwtJwksRateLimit,
    jwksRequestsPerMinute: config.jwtJwksRateLimitRpm,
  }) as GetVerificationKey;

  return expressjwt({
    secret: secretClient,
    issuer: config.jwtIssuer,
    algorithms: [config.jwtAlgorithm],
    getToken: getCookieTokenExtractor(config),
    // maintaining backwards compatibility with v0.0.2
    requestProperty: 'user',
  });
};
