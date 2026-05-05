// ─── Integration Tests: Auth → Users Flow ────────────
// Tests the full user lifecycle across auth and users services
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-key';

import { app as authApp, prisma as authPrisma } from '../../../services/auth/src/server';
import { app as usersApp, prisma as usersPrisma } from '../../../services/users/src/server';

const testEmail = 'integration-test@miamo.test';

afterAll(async () => {
  await authPrisma.user.deleteMany({ where: { email: testEmail } });
  await authPrisma.$disconnect();
  await usersPrisma.$disconnect();
});

describe('Auth → Users Integration', () => {
  let token: string;
  let userId: string;

  it('Step 1: Register via Auth service', async () => {
    // Clean up first
    await authPrisma.user.deleteMany({ where: { email: testEmail } });

    const res = await request(authApp)
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: 'Integration@12345', displayName: 'Integration Tester' });
    expect(res.status).toBe(201);
    token = res.body.data.accessToken;
    userId = res.body.data.user.id;
    expect(token).toBeDefined();
    expect(userId).toBeDefined();
  });

  it('Step 2: Get user via Auth /me', async () => {
    const res = await request(authApp)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user.profile).toBeDefined();
  });

  it('Step 3: Fetch same user via Users service (internal headers)', async () => {
    const res = await request(usersApp)
      .get(`/api/v1/users/${userId}`)
      .set({ 'x-user-id': userId, 'x-internal-key': 'test-internal-key' });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(userId);
    expect(res.body.data.email).toBe(testEmail);
  });

  it('Step 4: Update profile via Users service', async () => {
    const res = await request(usersApp)
      .put('/api/v1/profiles/me')
      .set({ 'x-user-id': userId, 'x-internal-key': 'test-internal-key' })
      .send({ bio: 'Integration test bio', city: 'Test City', age: 28 });
    expect(res.status).toBe(200);
    expect(res.body.data.bio).toBe('Integration test bio');
    expect(res.body.data.city).toBe('Test City');
  });

  it('Step 5: Verify profile update via Auth /me', async () => {
    const res = await request(authApp)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.profile.bio).toBe('Integration test bio');
    expect(res.body.data.user.profile.city).toBe('Test City');
  });

  it('Step 6: Login again and verify token works', async () => {
    const loginRes = await request(authApp)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'Integration@12345' });
    expect(loginRes.status).toBe(200);
    const newToken = loginRes.body.data.accessToken;

    const meRes = await request(authApp)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${newToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.id).toBe(userId);
  });
});
