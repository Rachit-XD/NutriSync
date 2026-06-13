const express = require('express')
const supabase = require('../lib/supabase')
const anthropic = require('../lib/anthropic')

const router = express.Router()

const PREP_LIST_TOOL = {
  name: 'generate_prep_list',
  description: 'Generate a Sunday prep list from the weekly meal plan',
  input_schema: {
    type: 'object',
    properties: {
      grocery_by_category: {
        type: 'object',
        additionalProperties: { type: 'array', items: { type: 'string' } }
      },
      prep_order: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            step: { type: 'number' },
            task: { type: 'string' },
            time_minutes: { type: 'number' }
          },
          required: ['step', 'task', 'time_minutes']
        }
      },
      total_budget_inr: { type: 'number' }
    },
    required: ['grocery_by_category', 'prep_order', 'total_budget_inr']
  }
}

function getCurrentMonday() {
  const today = new Date()
  const day = today.getDay()
  const daysSince = day === 0 ? 6 : day - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysSince)
  return monday.toISOString().split('T')[0]
}

// GET /api/prep-list
router.get('/', async (req, res) => {
  const weekStart = getCurrentMonday()

  const { data: plan, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('week_start_date', weekStart)
    .single()

  if (error || !plan) {
    return res.status(404).json({ error: 'No meal plan found for this week' })
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Generate a Sunday prep list for this meal plan: ${JSON.stringify(plan.plan_json)}`
    }],
    tools: [PREP_LIST_TOOL],
    tool_choice: { type: 'tool', name: 'generate_prep_list' }
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse) {
    return res.status(500).json({ error: 'Prep list generation failed, please retry' })
  }

  res.json({ prep_list: toolUse.input })
})

module.exports = router
