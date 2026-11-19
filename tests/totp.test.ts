import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticator, decryptSecret, encryptSecret, newSecret, validCounter } from '../lib/totp';
process.env.MFA_ENCRYPTION_KEY = 'ab'.repeat(32);
test('RFC 6238 SHA1 vector, adjacent steps, malformed codes and replay rejection', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(authenticator(secret).generate({ timestamp: 59000 }), '287082');
  assert.equal(validCounter(secret, '287082', -1, 59000), 1);
  assert.equal(validCounter(secret, '287082', 1, 59000), null);
  assert.equal(validCounter(secret, '287082', -1, 89000), 1);
  assert.equal(validCounter(secret, '287082', -1, 150000), null);
  for (const token of ['', '12345', '1234567', 'abcdef']) assert.equal(validCounter(secret, token, -1, 59000), null);
});
test('authenticator secrets are unique, encrypted and tamper authenticated', () => {
  const secret = newSecret(), encrypted = encryptSecret(secret);
  assert.notEqual(secret, newSecret());
  assert.equal(decryptSecret(encrypted), secret);
  assert.ok(!encrypted.includes(secret));
  const pieces = encrypted.split('.'); const data = Buffer.from(pieces[2], 'base64url'); data[0] ^= 1; pieces[2] = data.toString('base64url');
  assert.throws(() => decryptSecret(pieces.join('.')));
  assert.match(authenticator(secret, 'test@example.invalid').toString(), /^otpauth:\/\/totp\//);
});
