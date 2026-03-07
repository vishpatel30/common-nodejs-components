import CryptoJS from 'crypto-js';

export default function decryptData(encryptedData: string, encryptionKey: string) {
  try {
    // Decrypt the encrypted data using AES decryption with the provided key
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    // Convert the bytes to a UTF-8 string
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    try {
      const parsedData = JSON.parse(decryptedData);
      return parsedData;
    } catch (parseError) {
      return decryptedData;
    }
  } catch (error) {
    console.error('Error decrypting data:', error);
    return null;
  }
}
