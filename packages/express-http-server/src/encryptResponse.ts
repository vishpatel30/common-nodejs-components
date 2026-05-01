import { Request, NextFunction } from 'express';
import httpStatus from 'http-status';
import crypto from 'crypto';
import encryptDataAES from './encryptData';
import getPrivateKeyFromVault from './getPrivateKeyFromVault';
import { GLOBAL } from './constants';

export default function encryptResponse(vaultProvider: any,logger:any) {
  return async  (
  req: Request,
  res: any,
  next: NextFunction
) =>{
  const kid = req.headers['x-key-id'] as string | undefined;
  const encryptedAESKey = req.headers['x-encrypted-key'] as string | undefined;

  if (!(kid && encryptedAESKey) || process.env.NODE_ENV === GLOBAL.ENV_DEV) {
    return next();
  }

  let privateKey: string;

  try {
    privateKey = await getPrivateKeyFromVault(kid,vaultProvider);
  } catch (err) {
    console.error('Failed getting private key from vault:', err);
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ error: 'Invalid key' });
  }

  let decryptedAESKey: string;

  try {
    const encryptedKeyBuffer = Buffer.from(encryptedAESKey, 'base64');
    const encryptedKeyBytes = new Uint8Array(encryptedKeyBuffer);

    const aesKeyBuffer = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      encryptedKeyBytes
    );

    decryptedAESKey = aesKeyBuffer.toString('utf-8');
  } catch (err) {
    console.error('Invalid RSA encrypted AES key:', err);
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ error: 'Invalid key' });
  }

  try {
    let oldSend = res.send;

    let randNum: any = 0;
    if (req.method === 'GET') {
      randNum = req.headers['x-token'] || 0;
    } else {
      randNum = (req as any).randNum || 0;
    }

    res.send = function (data: any) {
      if (typeof data === 'object') {

        const encryptedResponse = encryptDataAES(
          {
            responseData: data,
            randNum,
          },
          decryptedAESKey
        );
        logger.info('==================Response body encrypted successfully===================', encryptedResponse,"data ======================================================================",data);

        arguments[0] = { data: encryptedResponse };
      }
      oldSend.apply(res, arguments);
    };

    return next();
  } catch (error) {
    console.error('RSA AES encryption failed:', error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: 'Encryption Failed' });
  }
}
}
