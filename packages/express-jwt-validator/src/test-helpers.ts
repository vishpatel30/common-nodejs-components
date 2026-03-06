import { sign } from 'jsonwebtoken';

export const TESTING_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAs1e2SbBEsz5b4k4Gq4mKLH0j0LX7Lzkdt22rA9L0Ef9c4Lv1
TVJbL0nILacSzbnEpbkeT4I+B/QTPZ9qFrQQl1TltFmd4JZhhG9B3kOtAxEwk9en
+TJv1Uhg1nyTPovensn5vDNC6tO11LDXVtdqYIRGicZxTVGkwx691ljZlCaaL0w0
WPY+St2QGf0fjE2uZbvB4eFNoW3O7YNA7D27Do9tf3fDhkdB5KMTlOEnK22dmnKj
ReRoRT0gYREcGzxbSBDyoG7e3DBCqkQmoXFeVoOPYQQkvIwDiVIZi32l1xQuUj6b
mov/XbaQiompNllHnVLAJLH/SvjB1/lJuPIt/wIDAQABAoIBABWTzwXMpGdgcFOp
CZpn4Oz7XWzGCGOlHpMsKbA7GEx2CemsE5Zq+zeUS/ZaLKP93tAFlsUAKZBxaEM4
w93Zakma2Ew7oAgeb7ssW6NvRwigb9TJ1Jbh35ysqaIEuP6Ee5NlP5vKGxn/wNfH
MxFqt4zHPWlkK8uesBEdyL9aT0tIqiL1LDzDCRG3f1K1lZa1iS9o7Xwkpd3R/cKz
yLdie7rW9ST8w7AjBrih8XsLGZwvfvznVxqyIus+B+uq+Ep86gd6deVXUAVJIipV
YE3mujsFzMI5TxLxPpisEi+8Q1VbvUu0NWXtP6CLFEhknGYfnY/nvP9Z5CB/6j1s
J70izVECgYEA1opVQh9Kk9sanPc+IrJ9IehKDM7kdPRCvfAgemB9KV1u3nmAMzNW
aezyD4pjaQSL3dg91ZWMFh3MkzLjNFpnFKnRz6OKRVDvwb51H9sc65ygPhsDzSLL
hhuwICFUReseCtjL2IrkF4ELnavlBblvgfcV+I+NUX8reii58m5ZRJcCgYEA1gAW
sTqivi8zBgZO5ydPApK9GTL+2+hssfg9CSEwo/XN7nHbXFkWFml/iGh+9I6Lahk0
1e8pB4iESTRy7kvyQHgdZECcm/3zrDdwRJUTrDuXats/pIGNyrv0BbGCRCzLjbDq
4q3o+8VVb+I3yNVRzjxzfTsd4LlDE+OiyAGghtkCgYB/D4KbHKkwlE1YtV2JcyiF
Emv41fecBKYak8LId6jo/LsS6+avbDI7nedmqNFjexvTEaTdgCptVsy4SSUi9n+i
T0lBrlvP3bWBi2kWqtCgAi0tWxaPQZJEJNXU0ah1mGA8kFV6NBgOi5DzmsCS+VY/
JLVQdsR9hdGcEc6+8/fOlQKBgQCdn9MXF6lnjDx444yalkmMC6ldNkKil7/4FnBe
mSPKoPLd/t8kVjn+qBZX0yAv4g6uR4KzUUVXVyaZBRjijO4SrmZ3wV+ZRqSE5RC8
c1HaOsp82qE1+ncGLQrAZs8ciCIma3mXHaHOULttfaK5OubWkZA/XZvUOqE9tR3h
U9F5gQKBgDnGyOAiel8lb9z/Z5o8f5cJSsDUHN8tau+NNStpuaiCgonu51MinZu9
oiE8N53nTTUmNe9aLxctPqmTY8ITtMMoJfow70Y++DED6yZEOIAAduQjUuf+JxA/
h8iNdpnXOBM441OS5o6jvTJDs/Nf+KChFlo0mRgkislKKGdrYWde
-----END RSA PRIVATE KEY-----`;

export const signBareTestingToken = (payload: any): string => {
  return sign(payload, TESTING_PRIVATE_KEY, { algorithm: 'RS256' });
};

export const signTestingTokenWithDefaults = (payload: any = {}): string => {
  return sign(payload, TESTING_PRIVATE_KEY, {
    algorithm: 'RS256',
    issuer: 'my-testing-issuer',
    expiresIn: 60,
    subject: 'my-testing-user',
  });
};

export const signTestingToken = (payload: any = {}, issuer: string = 'my-testing-issuer'): string => {
  return sign(payload, TESTING_PRIVATE_KEY, {
    algorithm: 'RS256',
    issuer,
  });
};

export const TESTING_JWKS_RESPONSE = {
  keys: [
    {
      kty: 'RSA',
      e: 'AQAB',
      use: 'sig',
      kid: 'MyTestKeyID',
      alg: 'RS256',
      n:
        's1e2SbBEsz5b4k4Gq4mKLH0j0LX7Lzkdt22rA9L0Ef9c4Lv1TVJbL0nIL' +
        'acSzbnEpbkeT4I-B_QTPZ9qFrQQl1TltFmd4JZhhG9B3kOtAxEwk9en-T' +
        'Jv1Uhg1nyTPovensn5vDNC6tO11LDXVtdqYIRGicZxTVGkwx691ljZlCa' +
        'aL0w0WPY-St2QGf0fjE2uZbvB4eFNoW3O7YNA7D27Do9tf3fDhkdB5KMT' +
        'lOEnK22dmnKjReRoRT0gYREcGzxbSBDyoG7e3DBCqkQmoXFeVoOPYQQkv' +
        'IwDiVIZi32l1xQuUj6bmov_XbaQiompNllHnVLAJLH_SvjB1_lJuPIt_w',
    },
  ],
};
