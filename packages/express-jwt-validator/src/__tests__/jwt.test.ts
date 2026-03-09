import { Request } from 'express';
import nock from 'nock';
import {
  jwtValidator,
  Config,
  TESTING_JWKS_RESPONSE,
  signTestingTokenWithDefaults,
  signBareTestingToken,
  signTestingToken,
  extractToken,
  extractIdToken,
  extractBearerToken,
  AuthorizedRequest,
  IdAuthorizedRequest,
} from '../index';

const config: Config = {
  jwtAlgorithm: 'RS256',
  jwtIssuer: 'my-testing-issuer',
  jwtJwksCache: false,
  jwtJwksCacheMaxAge: 0,
  jwtJwksCacheMaxEntries: 0,
  jwtJwksRateLimit: false,
  jwtJwksRateLimitRpm: 0,
  jwtJwksTimeout: 10000,
  jwtJwksUri: 'sampleJwksUri',
};

describe('jwt-validator', () => {
  it('should be able to construct an instance with sample config', () => {
    const validateJwt = jwtValidator(config);
    const request = {} as any;
    const response = {} as any;

    validateJwt(request, response, (err) => {
      expect(err.name).toBe('UnauthorizedError');
    });
  });

  it('should extract access token from cookie with default config', () => {
    const validateJwt = jwtValidator(config);
    const request = { cookies: { access_token: '12345' } } as Request;

    const response = {} as any;

    validateJwt(request, response, (err) => {
      expect(err.code).toBe('invalid_token');
    });
  });

  it('should extract access id from cookie when id token extraction is configured', () => {
    const validateJwt = jwtValidator({ ...config, cookieToken: 'id' });
    const request = { cookies: { id_token: '12345' } } as Request;

    const response = {} as any;

    validateJwt(request, response, (err) => {
      expect(err.code).toBe('invalid_token');
    });
  });

  it('should extract token from authorization header with default config', () => {
    const validateJwt = jwtValidator(config);
    const request = {
      headers: {
        authorization: 'Bearer 12345',
      },
    } as Request;

    const response = {} as any;

    validateJwt(request, response, (err) => {
      expect(err.code).toBe('invalid_token');
    });
  });

  it('should extract token from authorization header with id token config', () => {
    const validateJwt = jwtValidator({ ...config, cookieToken: 'id' });
    const request = {
      headers: {
        authorization: 'Bearer 12345',
      },
    } as Request;

    const response = {} as any;

    validateJwt(request, response, (err) => {
      expect(err.code).toBe('invalid_token');
    });
  });

  it('should extract token from authorization header and validate it', () => {
    nock('https://testing.well-known.uri').get('/jwks.json').reply(200, TESTING_JWKS_RESPONSE);
    const accessToken = signTestingTokenWithDefaults();

    const validateJwt = jwtValidator({ ...config, jwtJwksUri: 'https://testing.well-known.uri/jwks.json' });
    const request = {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    } as Request;

    const response = {} as any;
    const decodedTokenPayload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString('utf8'));

    validateJwt(request, response, (err) => {
      expect(err).toBeUndefined();
      const authorizedRequest = request as AuthorizedRequest;
      expect(authorizedRequest.user).toStrictEqual(decodedTokenPayload);
    });
  });

  it('should extract token from access_token cookie and validate it', () => {
    nock('https://testing.well-known.uri').get('/jwks.json').reply(200, TESTING_JWKS_RESPONSE);
    const token = signTestingTokenWithDefaults();

    const validateJwt = jwtValidator({
      ...config,
      jwtJwksUri: 'https://testing.well-known.uri/jwks.json',
    });
    const request = { cookies: { access_token: token } } as Request;

    const response = {} as any;
    const decodedTokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));

    validateJwt(request, response, (err) => {
      expect(err).toBeUndefined();
      const authorizedRequest = request as AuthorizedRequest;
      expect(authorizedRequest.user).toStrictEqual(decodedTokenPayload);
    });
  });

  it('should extract token from id_token cookie and validate it', () => {
    nock('https://testing.well-known.uri').get('/jwks.json').reply(200, TESTING_JWKS_RESPONSE);
    const token = signTestingTokenWithDefaults();

    const validateJwt = jwtValidator({
      ...config,
      jwtJwksUri: 'https://testing.well-known.uri/jwks.json',
      cookieToken: 'id',
    });
    const request = { cookies: { id_token: token } } as Request;

    const response = {} as any;
    const decodedTokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));

    validateJwt(request, response, (err) => {
      expect(err).toBeUndefined();
      const authorizedRequest = request as IdAuthorizedRequest;
      expect(authorizedRequest.user).toStrictEqual(decodedTokenPayload);
    });
  });

  describe('extractToken function', () => {
    it('should return undefined when token is not extracted', () => {
      const request = {} as Request;

      const extractedToken = extractToken(request);

      expect(extractedToken).toBeUndefined();
    });

    it('should extract access token from cookie', () => {
      const request = { cookies: { access_token: '12345' } } as Request;

      const extractedToken = extractToken(request);

      expect(extractedToken).toBe(request.cookies.access_token);
    });
  });

  describe('extractBearerToken function', () => {
    it('should return undefined when token is not extracted', () => {
      const request = {} as Request;

      const extractedToken = extractBearerToken(request);

      expect(extractedToken).toBeUndefined();
    });

    it('should extract token from authorization header', () => {
      const request = {
        headers: {
          authorization: 'Bearer 12345',
        },
      } as Request;

      const extractedToken = extractBearerToken(request);

      expect(extractedToken).toBe(request.headers.authorization?.split('Bearer ')[1]);
    });
  });

  describe('extractIdToken function', () => {
    it('should return undefined when token is not extracted', () => {
      const request = {} as Request;

      const extractedToken = extractIdToken(request);

      expect(extractedToken).toBeUndefined();
    });

    it('should extract id token from cookie', () => {
      const request = { cookies: { id_token: '12345' } } as Request;

      const extractedToken = extractIdToken(request);

      expect(extractedToken).toBe(request.cookies.id_token);
    });
  });

  describe('signBareTestingToken function', () => {
    it('should sign token without any default claims', () => {
      const signedToken = signBareTestingToken({ customClaim: 'custom' });

      expect(signedToken.split('.')).toHaveLength(3);

      const decodedPart = JSON.parse(Buffer.from(signedToken.split('.')[1], 'base64').toString('utf-8'));
      expect(decodedPart.customClaim).toBe('custom');
      expect(decodedPart.iat).toBeDefined();
      expect(decodedPart.iss).toBeUndefined();
      expect(decodedPart.exp).toBeUndefined();
      expect(decodedPart.sub).toBeUndefined();
    });
  });

  describe('signTestingTokenWithDefaults function', () => {
    it('should sign token with default claims using default parameters', () => {
      const signedToken = signTestingTokenWithDefaults();

      expect(signedToken.split('.')).toHaveLength(3);

      const decodedPart = JSON.parse(Buffer.from(signedToken.split('.')[1], 'base64').toString('utf-8'));
      expect(decodedPart.iat).toBeDefined();
      expect(decodedPart.iss).toBeDefined();
      expect(decodedPart.exp).toBeDefined();
      expect(decodedPart.sub).toBeDefined();
    });

    it('should sign token with default claims', () => {
      const signedToken = signTestingTokenWithDefaults({ customClaim: 'custom' });

      expect(signedToken.split('.')).toHaveLength(3);

      const decodedPart = JSON.parse(Buffer.from(signedToken.split('.')[1], 'base64').toString('utf-8'));
      expect(decodedPart.customClaim).toBe('custom');
      expect(decodedPart.iat).toBeDefined();
      expect(decodedPart.iss).toBeDefined();
      expect(decodedPart.exp).toBeDefined();
      expect(decodedPart.sub).toBeDefined();
    });
  });

  describe('signTestingToken function', () => {
    it('should sign token with default claims using default parameters', () => {
      const signedToken = signTestingToken();

      expect(signedToken.split('.')).toHaveLength(3);

      const decodedPart = JSON.parse(Buffer.from(signedToken.split('.')[1], 'base64').toString('utf-8'));
      expect(decodedPart.iat).toBeDefined();
      expect(decodedPart.iss).toBeDefined();
      expect(decodedPart.exp).toBeUndefined();
      expect(decodedPart.sub).toBeUndefined();
    });

    it('should sign token with default claims', () => {
      const signedToken = signTestingToken({ customClaim: 'custom' });

      expect(signedToken.split('.')).toHaveLength(3);

      const decodedPart = JSON.parse(Buffer.from(signedToken.split('.')[1], 'base64').toString('utf-8'));
      expect(decodedPart.customClaim).toBe('custom');
      expect(decodedPart.iat).toBeDefined();
      expect(decodedPart.iss).toBeDefined();
      expect(decodedPart.exp).toBeUndefined();
      expect(decodedPart.sub).toBeUndefined();
    });
  });
});
