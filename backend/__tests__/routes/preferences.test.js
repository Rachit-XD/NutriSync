const request = require('supertest')
const app = require('../../src/app')
const supabase = require('../../src/lib/supabase')

jest.mock('../../src/lib/supabase', () => ({
  auth: { getUser: jest.fn() },
  from: jest.fn()
}))

const mockUser = { id: 'user-abc', email: 'test@example.com' }
const mockPreferences = {
  id: 'pref-123',
  user_id: 'user-abc',
  goal: 'lose_weight',
  diet_type: 'veg',
  spice_level: 'medium',
  cooking_days: ['monday', 'wednesday', 'friday'],
  daily_budget_inr: 300,
  kitchen_gear: ['induction', 'pressure_cooker'],
  allergies: null,
  updated_at: '2024-01-01T00:00:00Z'
}

function authHeader() {
  return { Authorization: 'Bearer valid-token' }
}

beforeEach(() => {
  supabase.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null
  })
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/preferences', () => {
  it('returns preferences when they exist for the user', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockPreferences, error: null })
    })

    const res = await request(app)
      .get('/api/preferences')
      .set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.preferences).toEqual(mockPreferences)
  })

  it('returns null when user has no preferences yet (PGRST116)', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'no rows' }
      })
    })

    const res = await request(app)
      .get('/api/preferences')
      .set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.preferences).toBeNull()
  })

  it('returns 500 on unexpected DB error', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'UNKNOWN', message: 'DB error' }
      })
    })

    const res = await request(app)
      .get('/api/preferences')
      .set(authHeader())

    expect(res.status).toBe(500)
  })
})

describe('POST /api/preferences', () => {
  const validBody = {
    goal: 'lose_weight',
    diet_type: 'veg',
    spice_level: 'medium',
    cooking_days: ['monday', 'wednesday'],
    daily_budget_inr: 300,
    kitchen_gear: ['induction'],
    allergies: null
  }

  it('creates/updates preferences and returns them', async () => {
    supabase.from.mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockPreferences, error: null })
    })

    const res = await request(app)
      .post('/api/preferences')
      .set(authHeader())
      .send(validBody)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.preferences).toEqual(mockPreferences)
  })

  it('returns 500 on DB upsert failure', async () => {
    supabase.from.mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'constraint violation' }
      })
    })

    const res = await request(app)
      .post('/api/preferences')
      .set(authHeader())
      .send(validBody)

    expect(res.status).toBe(500)
  })

  it('returns 400 when goal is invalid', async () => {
    const res = await request(app)
      .post('/api/preferences')
      .set(authHeader())
      .send({ ...validBody, goal: 'invalid_goal' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/goal/i)
  })

  it('returns 400 when diet_type is invalid', async () => {
    const res = await request(app)
      .post('/api/preferences')
      .set(authHeader())
      .send({ ...validBody, diet_type: 'keto' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/diet_type/i)
  })

  it('returns 400 when daily_budget_inr is not a number', async () => {
    const res = await request(app)
      .post('/api/preferences')
      .set(authHeader())
      .send({ ...validBody, daily_budget_inr: 'banana' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/daily_budget_inr/i)
  })

  it('returns 400 when cooking_days is not an array', async () => {
    const res = await request(app)
      .post('/api/preferences')
      .set(authHeader())
      .send({ ...validBody, cooking_days: 'monday' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/cooking_days/i)
  })

  it('returns 400 when spice_level is invalid', async () => {
    const res = await request(app)
      .post('/api/preferences')
      .set(authHeader())
      .send({ ...validBody, spice_level: 'extra_hot' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/spice_level/i)
  })
})
