import { signToken, verifyToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';

process.env.JWT_SECRET = 'test-jwt-secret-32chars-minimum!!';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-32chars-min!!';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

const payload = { id: 'user-123', role: 'ADMIN', email: 'admin@test.com' };

describe('JWT utilities', () => {
  it('signs and verifies an access token', () => {
    const token = signToken(payload);
    expect(typeof token).toBe('string');
    const decoded = verifyToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.email).toBe(payload.email);
  });

  it('signs and verifies a refresh token', () => {
    const token = signRefreshToken(payload);
    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe(payload.id);
  });

  it('throws on an invalid token', () => {
    expect(() => verifyToken('bad.token.here')).toThrow();
  });

  it('throws on a token signed with the wrong secret', () => {
    // Sign with access secret, verify with refresh secret — should fail
    const token = signToken(payload);
    expect(() => verifyRefreshToken(token)).toThrow();
  });
});
