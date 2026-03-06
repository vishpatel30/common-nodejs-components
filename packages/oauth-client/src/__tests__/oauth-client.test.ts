import { OAuthClient } from '..';
import nock from 'nock';

export const oauthClient = new OAuthClient('https://auth.dummy.test.url/oauth2/token', {
  logLevel: 'cli',
  logStyle: 'debug',
  appName: 'nodejs-commons',
  moduleName: 'OAuthClient',
});

describe('@dataverse/oauth-client', () => {
  it('should return error if unable to call oauth endpoint', async () => {
    // mocking OAuth endpoint
    nock('https://auth.dummy.test.url').post('/oauth2/token').replyWithError({
      message: 'something awful happened',
      code: 'AWFUL_ERROR',
    });

    try {
      await oauthClient.exchangeCredentialsForToken({
        username: 'test',
        password: 'test',
      });
    } catch (error: any) {
      expect(nock.isDone()).toBe(true);
    }
  });

  it('should get token from calling oauth endpoint', async () => {
    // mocking OAuth endpoint
    nock('https://auth.dummy.test.url')
      .post('/oauth2/token')
      .basicAuth({ user: 'test', pass: 'test' })
      .reply(200, { expires_in: 3600, token_type: 'Bearer', access_token: 'testing token' });

    const tokenResponse = await oauthClient.exchangeCredentialsForToken({
      username: 'test',
      password: 'test',
    });

    expect(tokenResponse).toStrictEqual({ expiresIn: 3600, tokenType: 'Bearer', accessToken: 'testing token' });
    expect(nock.isDone()).toBe(true);
  });

  it('should get token from cache', async () => {
    // mocking OAuth endpoint
    nock('https://auth.dummy.test.url')
      .post('/oauth2/token')
      .basicAuth({ user: 'test', pass: 'test' })
      .reply(200, { expires_in: 3600, token_type: 'Bearer', access_token: 'testing token' });
    const tokenResponse = await oauthClient.exchangeCredentialsForToken({
      username: 'test',
      password: 'test',
    });
    expect(tokenResponse).toStrictEqual({ expiresIn: 3600, tokenType: 'Bearer', accessToken: 'testing token' });
    expect(nock.isDone()).toBe(false);
  });
});
