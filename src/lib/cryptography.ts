import CryptoJS from 'crypto-js';

export {
  encryptMessage,
  decryptMessage,
  hashPassword,
  checkPassword,
  encodeStringToBase64,
  decodeBase64ToString,
  Encrypted
};


// Lengths in bits
const keyLength = 256;
const ivLength = 128;
const saltLength = 128;
const byte = 8;
const wordLength = 32;

const keyIterations = 10000;


export class HashRecord {
  hash: string;
  salt: string;

  constructor(hash: string, salt: string) {
    this.hash = hash;
    this.salt = salt;
  }
}

interface Encrypted {
  cipher: string,
  iv: string,
  salt: string,
  iterations: number,
  keyLength: number
}

/**
 * @param {string} message - base64 message to decode
 * @returns decoded string - will return empty string if malformed data
 */
function decodeBase64ToString(message: string): string {
  try {
    const word = CryptoJS.enc.Base64.parse(message);
    return CryptoJS.enc.Utf8.stringify(word);
  } catch (error) {
    return "";
  }
}

function encodeStringToBase64(message: string): string {
  const word = CryptoJS.enc.Utf8.parse(message);
  return CryptoJS.enc.Base64.stringify(word);
}

function encryptMessage(
  message: string,
  password: string,
  saltBits = saltLength,
  ivBits = ivLength,
  keyBits = keyLength,
  iterations = keyIterations
) {
  let salt = CryptoJS.lib.WordArray.random(saltBits / byte);
  let key = CryptoJS.PBKDF2(password, salt, {
    keySize: keyBits / wordLength,
    iterations: iterations
  })

  let iv = CryptoJS.lib.WordArray.random(ivBits / byte);
  let cipher = CryptoJS.AES.encrypt(message, key, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
    hasher: CryptoJS.algo.SHA256
  });
  let encrypted: Encrypted = {
    cipher: cipher.toString(),
    salt: salt.toString(),
    iv: iv.toString(),
    iterations: iterations,
    keyLength: keyBits
  }
  return encrypted;
}

function decryptMessage(encrypted: Encrypted, password: string) {
  let salt = CryptoJS.enc.Hex.parse(encrypted.salt);
  let iv = CryptoJS.enc.Hex.parse(encrypted.iv);

  let derivedKey = CryptoJS.PBKDF2(password, salt, {
    keySize: encrypted.keyLength / wordLength,
    iterations: encrypted.iterations
  });

  let decrypted = CryptoJS.AES.decrypt(encrypted.cipher, derivedKey, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
    hasher: CryptoJS.algo.SHA256
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}


function concatSaltPassword(password: string, salt: string) {
  return salt + password;
}

function hashPassword(password: string, saltBits = saltLength): HashRecord {
  const salt = CryptoJS.lib.WordArray.random(saltBits / byte).toString();
  const concatenated = concatSaltPassword(password, salt);
  const hash = CryptoJS.SHA256(concatenated).toString();
  return new HashRecord(hash, salt);
}

function checkPassword(password: string, storedHash: string, salt: string) {
  const concatenated = concatSaltPassword(password, salt)
  const hash = CryptoJS.SHA256(concatenated).toString();
  return (hash === storedHash);
}
