# Miamo Testing Documentation

## Test Structure

```
tests/
├── unit/              ← Unit tests for individual functions/modules
├── integration/       ← Service integration tests (API + DB)
├── e2e/               ← End-to-end tests (full system)
└── README.md          ← This file

api/
├── src/api.test.ts    ← Legacy monolith API tests
└── vitest.config.ts   ← Vitest configuration

services/
├── gateway/src/       ← Gateway-specific tests
├── auth/src/          ← Auth-specific tests
└── .../src/           ← Each service can have co-located tests
```

---

## Test Frameworks

| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner (fast, ESM-native, TypeScript) |
| **Supertest** | HTTP assertion library for Express testing |
| **Prisma** | Test database with isolated transactions |

## Running Tests

### All Tests
```bash
# From root
npm test

# With coverage
npm run test:coverage
```

### Unit Tests
```bash
cd tests/unit
npx vitest run
```

### Integration Tests
```bash
# Requires PostgreSQL running
cd tests/integration
DATABASE_URL=postgresql://miamo:miamo@localhost:5432/miamo_test npx vitest run
```

### E2E Tests
```bash
# Requires all services running
cd tests/e2e
npx vitest run
```

### Per-Service Tests
```bash
cd services/auth
npx vitest run
```

### Legacy Monolith Tests
```bash
cd api
npx vitest run
```

---

## Test Types Explained

### Unit Tests (`tests/unit/`)

Test individual functions in isolation:
- JWT token generation/validation
- Password hashing
- Profile score calculation
- AI compatibility scoring
- Input validation
- Data transformers

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateProfileScore } from '../../services/users/src/utils';

describe('Profile Score', () => {
  it('returns 100 for complete profile', () => {
    const profile = {
      bio: 'Hello!',
      photos: ['photo1.jpg'],
      dateOfBirth: '1995-01-01',
      location: 'Berlin',
      lookingFor: 'relationship',
      gender: 'male',
      interests: ['music'],
    };
    expect(calculateProfileScore(profile)).toBe(100);
  });

  it('returns 0 for empty profile', () => {
    expect(calculateProfileScore({})).toBe(0);
  });
});
```

### Integration Tests (`tests/integration/`)

Test service endpoints with a real database:
- API route responses (status codes, body shape)
- Database operations (create, read, update, delete)
- Authentication middleware behavior
- Error handling responses
- Service-to-service communication

Example:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../services/auth/src/server';

describe('Auth API', () => {
  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123',
        displayName: 'Test User',
        dateOfBirth: '1995-01-01',
        gender: 'other',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'Pass123' });

    expect(res.status).toBe(409);
  });
});
```

### E2E Tests (`tests/e2e/`)

Test complete user flows across multiple services:

```
Register → Login → Create Profile → Discover → Like → Match → Send Message → React
```

These tests require all services running (use `npm start` or `docker compose up` first).

---

## Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'dist/', '*.config.*'],
    },
    testTimeout: 10000,
  },
});
```

## Test Database Setup

Integration tests use a separate test database:

```bash
# Create test database
createdb miamo_test

# Set test DATABASE_URL
export DATABASE_URL=postgresql://miamo:miamo@localhost:5432/miamo_test

# Run migrations
npx prisma migrate deploy

# Run tests
npx vitest run
```

## Writing New Tests

### Naming Convention
- `*.test.ts` — Test files
- `*.spec.ts` — Specification/behavior files
- Co-locate with source: `services/auth/src/auth.test.ts`
- Or in test directories: `tests/unit/auth.test.ts`

### Test Structure
```typescript
describe('Feature Name', () => {
  beforeAll(async () => { /* setup */ });
  afterAll(async () => { /* cleanup */ });

  describe('success cases', () => {
    it('should do expected behavior', async () => {
      // Arrange → Act → Assert
    });
  });

  describe('error cases', () => {
    it('should return 401 for invalid token', async () => {
      // ...
    });
  });
});
```

## CI Integration

Tests run automatically on:
- Every pull request
- Every push to `main`
- Nightly scheduled runs (E2E suite)

```yaml
# Example GitHub Actions step
- name: Run Tests
  run: |
    npm ci
    npm run test:coverage
  env:
    DATABASE_URL: postgresql://miamo:miamo@localhost:5432/miamo_test
```
