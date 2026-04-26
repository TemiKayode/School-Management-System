import { encrypt, decrypt, encryptPII, decryptPII } from '../../utils/encryption';

// Provide a stable key for tests
process.env.AES_SECRET_KEY = 'a'.repeat(64);

describe('Encryption utilities', () => {
  it('encrypts and decrypts a string correctly', () => {
    const plain = 'Hello, World!';
    const cipher = encrypt(plain);
    expect(cipher).not.toBe(plain);
    expect(decrypt(cipher)).toBe(plain);
  });

  it('produces different ciphertext each call (random IV)', () => {
    const plain = 'same input';
    const c1 = encrypt(plain);
    const c2 = encrypt(plain);
    expect(c1).not.toBe(c2);
    expect(decrypt(c1)).toBe(plain);
    expect(decrypt(c2)).toBe(plain);
  });

  it('throws on tampered ciphertext', () => {
    const cipher = encrypt('secret');
    const tampered = cipher.slice(0, -4) + 'xxxx';
    expect(() => decrypt(tampered)).toThrow();
  });

  it('encryptPII is idempotent on already-encrypted values', () => {
    const plain = 'test@example.com';
    const once = encryptPII(plain)!;
    const twice = encryptPII(once)!;
    expect(once).toBe(twice);
  });

  it('decryptPII returns null for null/undefined', () => {
    expect(decryptPII(null)).toBeNull();
    expect(decryptPII(undefined)).toBeNull();
  });
});
