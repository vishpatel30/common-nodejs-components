import CryptoJS from 'crypto-js';

export default function encryptData(data: any, encryptionKey: string) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey).toString();
}
