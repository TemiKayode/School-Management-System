process.env.JWT_SECRET = 'test-jwt-secret-32chars-minimum!!';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-32chars-min!!';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.AES_SECRET_KEY = 'a'.repeat(64);
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:3000';
