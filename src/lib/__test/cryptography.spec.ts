import * as crp from "../cryptography";
import CryptoJS from 'crypto-js';

describe("test base64 functions", () => {
  it("should return empty string for incorrect encoding", () =>{
    expect(crp.decodeBase64ToString("abc")).toBe("");
  });

  it("should return correct decoded string", () => {
    expect(crp.decodeBase64ToString("YXJtYWRpbGxv")).toBe("armadillo");
  });

  it("should return correct encoded string", () => {
    expect(crp.encodeStringToBase64("armadillo")).toBe("YXJtYWRpbGxv");
  });

  it("encodes with == padding at the end", () => {
    expect(crp.encodeStringToBase64("armadillo1")).toBe("YXJtYWRpbGxvMQ==");
  });

  it("decodes padded encoding correctly", () => {
    expect(crp.decodeBase64ToString("YXJtYWRpbGxvMQ==")).toBe("armadillo1");
  });
})

describe('test encrypt/decrypt', () => {
  it("should encrypt and decrypt a string correctly", () => {
    const key = "wie gehts";
    const message = "mir geht es gut";
    const encrypted = crp.encryptMessage(message, key);
    const decrypted = crp.decryptMessage(encrypted, key);
    expect(decrypted).toBe(message);

    const wordArray = CryptoJS.enc.Base64.parse(encrypted.cipher);
    const parsed = wordArray.toString(CryptoJS.enc.Base64);
    expect(parsed).toBe(encrypted.cipher);
  });
});

describe("test hashPassword", () => {
  it("should verify password when salt and password are correct", () => {
    const password = "abcdefghijklmnop987654321";
    const hash = crp.hashPassword(password);
    expect(crp.checkPassword("abcdefghijklmnop987654321", hash.hash, hash.salt)).toBe(true);
    expect(crp.checkPassword("abcdefghijklmnop98765432", hash.hash, hash.salt)).toBe(false);
    expect(crp.checkPassword("abcdefghijklmnop98765432", hash.hash, hash.salt + "1")).toBe(false);  
  })
})
