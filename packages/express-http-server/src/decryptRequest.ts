import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import crypto from 'crypto';
import decryptDataAES from './decryptData';
import getPrivateKeyFromVault from './getPrivateKeyFromVault';
import { GLOBAL } from './constants';

export default  function decryptRequest(vaultProvider: any,logger:any) {
  return async  (
  req: Request,
  res: Response,
  next: NextFunction
  )=> {

    // READ FROM HEADERS (NOT BODY)
    const kid = req.headers['x-key-id'] as string | undefined;
    const encryptedAESKey = req.headers['x-encrypted-key'] as string | undefined;

    // Asymmetric encryption not used → continue normally
    if (!(kid && encryptedAESKey)) {
      return next();
    }

    let privateKey: string;

    try {
      privateKey = await getPrivateKeyFromVault(kid,vaultProvider);
    } catch (err) {
      console.error('Failed getting private key from vault:', err);
      res.status(httpStatus.BAD_REQUEST).json({ error: 'Invalid key' });
      return;
    }

    // RSA decrypt AES key (Uint8Array intentionally kept)
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
      res.status(httpStatus.BAD_REQUEST).json({ error: 'Invalid key' });
      return;
    }

    // AES decrypt request body (if present)
    try {
      if (
        req.body?.data &&
        decryptedAESKey &&
        process.env.NODE_ENV !== GLOBAL.ENV_DEV
      ) {
        const decryptedPayload: any = decryptDataAES( 
          req.body.data,
          decryptedAESKey
        );

        // SAME CONTRACT AS NON-AES DECODER
        req.body = decryptedPayload.actualData;
        logger.info('==================Request body decrypted successfully===================',decryptedPayload.actualData);
        (req as any).randNum = decryptedPayload.randNum;
      }

      return next();
    } catch (error) {
      console.error('AES decryption failed:', error);
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Data decryption failed' });
    }
  }
}

