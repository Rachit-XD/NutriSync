const request = require('supertest')
const app = require('../../src/app')
const supabase = require('../../src/lib/supabase')
const anthropic = require('../../src/lib/anthropic')

jest.mock('../../src/lib/supabase', () => ({
  auth: { getUser: jest.fn() },
  from: jest.fn()
}))

jest.mock('../../src/lib/anthropic', () => ({
  messages: { create: jest.fn() }
}))

const mockUser = { id: 'user-abc', email: 'test@example.com' }

const mockPreferences = {
  id: 'pref-123',
  user_id: 'user-abc',
  goal: 'lose_weight',
  diet_type: 'veg',
  spice_level: 'medium',
  cooking_days: ['monday', 'wednesday'],
  daily_budget_inr: 300,
  kitchen_gear: ['induction'],
  allergies: null
}

const mockMealPlan = {
  week_start: '2026-06-09',
  days: []
}

const mockSavedPlan = {
  id: 'plan-123',
  user_id: 'user-abc',
  week_start_date: '2026-06-09',
  plan_json: mockMealPlan,
  generation_cost_tokens: 3000,
  created_at: '2026-06-08T00:00:00Z'
}

// Helper builders for individual table mocks
function prefsMock(data, error = null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error })
  }
}

function feedbackMock(data = [], error = null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error })
  }
}

function plansExistenceMock(existingData, existingError = null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: existingData, error: existingError })
  }
}

function plansInsertMock(savedData, saveError = null) {
  return {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: savedData, error: saveError })
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

describe('POST /api/meal-plan/generate', () => {
  it('returns 400 when user has no preferences', async () => {
    // Order of from() calls: meal_plans (existence), user_preferences (get prefs)
    supabase.from
      .mockImplementationOnce(() => plansExistenceMock(null, { code: 'PGRST116' }))
      .mockImplementationOnce(() => prefsMock(null, { code: 'PGRST116' }))
      .mockImplementationOnce(() => feedbackMock())

    const res = await request(app)
      .post('/api/meal-plan/generate')
      .set(authHeader())

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/onboarding/i)
  })

  it('returns cached plan when week plan already exists', async () => {
    // Only from('meal_plans') is called — existence check hits, returns cached plan
    supabase.from.mockImplementationOnce(() => plansExistenceMock(mockSavedPlan))

    const res = await request(app)
      .post('/api/meal-plan/generate')
      .set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.cached).toBe(true)
    expect(res.body.meal_plan.id).toBe('plan-123')
    expect(anthropic.messages.create).not.toHaveBeenCalled()
  })

  it('calls Claude and stores plan on cache miss', async () => {
    anthropic.messages.create.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'generate_meal_plan', input: mockMealPlan }],
      usage: { input_tokens: 1000, output_tokens: 2000 }
    })

    // Order: meal_plans (existence) → user_preferences → meal_feedback → meal_plans (insert)
    supabase.from
      .mockImplementationOnce(() => plansExistenceMock(null, { code: 'PGRST116' }))
      .mockImplementationOnce(() => prefsMock(mockPreferences))
      .mockImplementationOnce(() => feedbackMock())
      .mockImplementationOnce(() => plansInsertMock(mockSavedPlan))

    const res = await request(app)
      .post('/api/meal-plan/generate')
      .set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.cached).toBe(false)
    expect(res.body.meal_plan.id).toBe('plan-123')
    expect(anthropic.messages.create).toHaveBeenCalledTimes(1)
    const callArgs = anthropic.messages.create.mock.calls[0][0]
    expect(callArgs.model).toBe('claude-sonnet-4-6')
    expect(callArgs.tool_choice).toEqual({ type: 'tool', name: 'generate_meal_plan' })
  })

  it('returns 500 when Claude returns no tool_use block', async () => {
    anthropic.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'I cannot generate a plan right now.' }],
      usage: { input_tokens: 10, output_tokens: 10 }
    })

    // Order: meal_plans (existence) → user_preferences → meal_feedback
    // Insert is never reached because Claude returns no tool_use block
    supabase.from
      .mockImplementationOnce(() => plansExistenceMock(null, { code: 'PGRST116' }))
      .mockImplementationOnce(() => prefsMock(mockPreferences))
      .mockImplementationOnce(() => feedbackMock())

    const res = await request(app)
      .post('/api/meal-plan/generate')
      .set(authHeader())

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/generation failed/i)
  })
})

describe('GET /api/meal-plan/current', () => {
  it('returns null when no plan exists for this week', async () => {
    supabase.from.mockImplementationOnce(() =>
      plansExistenceMock(null, { code: 'PGRST116' })
    )

    const res = await request(app)
      .get('/api/meal-plan/current')
      .set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.meal_plan).toBeNull()
  })

  it('returns existing plan when found', async () => {
    supabase.from.mockImplementationOnce(() => plansExistenceMock(mockSavedPlan))

    const res = await request(app)
      .get('/api/meal-plan/current')
      .set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.meal_plan.id).toBe('plan-123')
  })
})
