const request = require('supertest')
const app = require('../../src/app')
const supabase = require('../../src/lib/supabase')

jest.mock('../../src/lib/supabase', () => ({
  auth: { getUser: jest.fn() },
  from: jest.fn()
}))

const mockUser = { id: 'user-abc', email: 'test@example.com' }

const mockFeedback = {
  id: 'fb-123',
  user_id: 'user-abc',
  meal_plan_id: 'plan-123',
  day_of_week: 'monday',
  meal_type: 'lunch',
  rating: 'thumbs_up',
  skipped: false,
  created_at: '2026-06-08T00:00:00Z'
}

const validBody = {
  meal_plan_id: 'plan-123',
  day_of_week: 'monday',
  meal_type: 'lunch',
  rating: 'thumbs_up'
}

function planOwnershipMock(data) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error: data ? null : { code: 'PGRST116' } })
  }
}

function feedbackInsertMock(data, error = null) {
  return {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error })
  }
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
  jest.resetAllMocks()
})

describe('POST /api/feedback', () => {
  it('returns 400 on invalid meal_type', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set(authHeader())
      .send({ ...validBody, meal_type: 'dessert' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/meal_type/i)
  })

  it('returns 400 on invalid rating value', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set(authHeader())
      .send({ ...validBody, rating: 'meh' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/rating/i)
  })

  it('returns 400 when neither rating nor skipped is provided', async () => {
    const { rating, ...bodyWithoutRating } = validBody
    const res = await request(app)
      .post('/api/feedback')
      .set(authHeader())
      .send(bodyWithoutRating)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/rating|skipped/i)
  })

  it('returns 403 when meal_plan_id belongs to a different user', async () => {
    // meal_plans ownership check returns null (plan not found for this user)
    supabase.from.mockImplementationOnce(() => planOwnershipMock(null))

    const res = await request(app)
      .post('/api/feedback')
      .set(authHeader())
      .send(validBody)

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/access denied/i)
  })

  it('successfully inserts feedback with thumbs_up rating', async () => {
    // Order: meal_plans (ownership check) → meal_feedback (insert)
    supabase.from
      .mockImplementationOnce(() => planOwnershipMock({ id: 'plan-123' }))
      .mockImplementationOnce(() => feedbackInsertMock(mockFeedback))

    const res = await request(app)
      .post('/api/feedback')
      .set(authHeader())
      .send(validBody)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.feedback.rating).toBe('thumbs_up')
    expect(res.body.feedback.skipped).toBe(false)
  })

  it('successfully inserts feedback with skipped=true and no rating', async () => {
    const skippedFeedback = { ...mockFeedback, rating: null, skipped: true }

    supabase.from
      .mockImplementationOnce(() => planOwnershipMock({ id: 'plan-123' }))
      .mockImplementationOnce(() => feedbackInsertMock(skippedFeedback))

    const res = await request(app)
      .post('/api/feedback')
      .set(authHeader())
      .send({ meal_plan_id: 'plan-123', day_of_week: 'monday', meal_type: 'lunch', skipped: true })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.feedback.skipped).toBe(true)
    expect(res.body.feedback.rating).toBeNull()
  })
})
