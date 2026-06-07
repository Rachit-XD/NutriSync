const express = require('express')
const supabase = require('../lib/supabase')

const router = express.Router()

const VALID_GOALS = ['lose_weight', 'muscle_gain', 'maintain', 'eat_healthy']
const VALID_DIETS = ['veg', 'vegan', 'jain', 'non_veg']
const VALID_SPICE = ['mild', 'medium', 'spicy']

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', req.user.id)
    .single()

  // PGRST116 = no rows found — normal for new users
  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: 'Failed to fetch preferences' })
  }

  res.json({ preferences: data || null })
})

router.post('/', async (req, res) => {
  const {
    goal,
    diet_type,
    spice_level,
    cooking_days,
    daily_budget_inr,
    kitchen_gear,
    allergies
  } = req.body

  // Validate all enum fields and required types before touching the database
  if (!VALID_GOALS.includes(goal)) {
    return res.status(400).json({ error: `Invalid goal. Must be one of: ${VALID_GOALS.join(', ')}` })
  }
  if (!VALID_DIETS.includes(diet_type)) {
    return res.status(400).json({ error: `Invalid diet_type. Must be one of: ${VALID_DIETS.join(', ')}` })
  }
  if (!VALID_SPICE.includes(spice_level)) {
    return res.status(400).json({ error: `Invalid spice_level. Must be one of: ${VALID_SPICE.join(', ')}` })
  }
  if (typeof daily_budget_inr !== 'number' || daily_budget_inr <= 0) {
    return res.status(400).json({ error: 'daily_budget_inr must be a positive number' })
  }
  if (!Array.isArray(cooking_days)) {
    return res.status(400).json({ error: 'cooking_days must be an array' })
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: req.user.id,
        goal,
        diet_type,
        spice_level,
        cooking_days,
        daily_budget_inr,
        kitchen_gear: kitchen_gear || [],
        allergies: allergies || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: 'Failed to save preferences' })
  }

  res.json({ success: true, preferences: data })
})

module.exports = router
