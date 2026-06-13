const express = require('express')
const supabase = require('../lib/supabase')
const anthropic = require('../lib/anthropic')
const { buildMealPlanPrompt } = require('../lib/promptBuilder')
const MEAL_PLAN_TOOL = require('../lib/mealPlanTool')

const router = express.Router()

// Returns the coming Monday (or today if today is Monday). Used for plan generation.
function getNextMonday() {
  const today = new Date()
  const day = today.getDay() // 0=Sun, 1=Mon
  const daysUntilMonday = day === 1 ? 0 : (8 - day) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() + daysUntilMonday)
  return monday.toISOString().split('T')[0]
}

// Returns the most recent Monday (or today if Monday). Used for current-week lookup.
function getCurrentMonday() {
  const today = new Date()
  const day = today.getDay()
  const daysSince = day === 0 ? 6 : day - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysSince)
  return monday.toISOString().split('T')[0]
}

async function generatePlan(userId, weekStart) {
  const { data: prefs, error: prefsError } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (prefsError && prefsError.code !== 'PGRST116') {
    throw Object.assign(new Error('Failed to fetch preferences'), { status: 500 })
  }
  if (!prefs) {
    throw Object.assign(new Error('Complete onboarding first'), { status: 400 })
  }

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const { data: feedbackHistory = [] } = await supabase
    .from('meal_feedback')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', fourteenDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  const { systemPrompt, userPrompt } = buildMealPlanPrompt(prefs, feedbackHistory || [])

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    tools: [MEAL_PLAN_TOOL],
    tool_choice: { type: 'tool', name: 'generate_meal_plan' }
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse) {
    throw Object.assign(new Error('Generation failed, please retry'), { status: 500 })
  }

  const { data: savedPlan, error: saveError } = await supabase
    .from('meal_plans')
    .insert({
      user_id: userId,
      week_start_date: toolUse.input.week_start,
      plan_json: toolUse.input,
      generation_cost_tokens: response.usage.input_tokens + response.usage.output_tokens
    })
    .select()
    .single()

  if (saveError) {
    throw Object.assign(new Error('Failed to save meal plan'), { status: 500 })
  }

  return savedPlan
}

// POST /api/meal-plan/generate
router.post('/generate', async (req, res) => {
  try {
    const weekStart = getNextMonday()

    const { data: existing, error: existingError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('week_start_date', weekStart)
      .single()

    if (existing) {
      return res.json({ meal_plan: existing, cached: true })
    }
    if (existingError && existingError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Failed to check existing plan' })
    }

    const savedPlan = await generatePlan(req.user.id, weekStart)
    res.json({ meal_plan: savedPlan, cached: false })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

// GET /api/meal-plan/current
router.get('/current', async (req, res) => {
  const weekStart = getCurrentMonday()

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('week_start_date', weekStart)
    .single()

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: 'Failed to fetch meal plan' })
  }

  res.json({ meal_plan: data || null })
})

// POST /api/meal-plan/replan
router.post('/replan', async (req, res) => {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', req.user.id)
    .single()

  if (!subscription || subscription.plan !== 'pro' || subscription.status !== 'active') {
    return res.status(403).json({ error: 'Replan requires Pro subscription' })
  }

  const weekStart = getCurrentMonday()

  await supabase
    .from('meal_plans')
    .delete()
    .eq('user_id', req.user.id)
    .eq('week_start_date', weekStart)

  try {
    const savedPlan = await generatePlan(req.user.id, weekStart)
    res.json({ meal_plan: savedPlan, cached: false })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

module.exports = router
