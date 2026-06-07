const request = require('supertest')
const app = require('../../src/app')
const supabase = require('../../src/lib/supabase')

jest.mock('../../src/lib/supabase', () => ({
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn()
}))

describe('Auth Middleware', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/api/preferences')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/missing|invalid/i)
  })

  it('returns 401 when token format is wrong (no Bearer prefix)', async () => {
    const res = await request(app)
      .get('/api/preferences')
      .set('Authorization', 'invalid-token-no-bearer')
    expect(res.status).toBe(401)
  })

  it('returns 401 when Supabase rejects the token', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid JWT')
    })
    const res = await request(app)
      .get('/api/preferences')
      .set('Authorization', 'Bearer bad-token')
    expect(res.status).toBe(401)
  })

  it('proceeds past auth when token is valid (not 401)', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null
    })
    // preferences route not yet registered, so GET /api/preferences returns 404 (not 401)
    // That proves auth passed
    const res = await request(app)
      .get('/api/preferences')
      .set('Authorization', 'Bearer valid-token')
    expect(res.status).not.toBe(401)
  })
})
