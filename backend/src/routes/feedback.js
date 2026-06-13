const express = require('express')
const supabase = require('../lib/supabase')

const router = express.Router()

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const VALID_RATINGS = ['thumbs_up', 'thumbs_down']
const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

// POST /api/feedback
router.post('/', async (req, res) => {
  const { meal_plan_id, day_of_week, meal_type, rating, skipped } = req.body

  if (!VALID_MEAL_TYPES.includes(meal_type)) {
    return res.status(400).json({ error: `Invalid meal_type. Must be one of: ${VALID_MEAL_TYPES.join(', ')}` })
  }
  if (rating && !VALID_RATINGS.includes(rating)) {
    return res.status(400).json({ error: `Invalid rating. Must be one of: ${VALID_RATINGS.join(', ')}` })
  }
  if (skipped !== undefined && typeof skipped !== 'boolean') {
    return res.status(400).json({ error: 'skipped must be a boolean' })
  }
  if (!skipped && !rating) {
    return res.status(400).json({ error: 'Must provide either rating or skipped=true' })
  }
  if (day_of_week && !VALID_DAYS.includes(day_of_week)) {
    return res.status(400).json({ error: `Invalid day_of_week. Must be one of: ${VALID_DAYS.join(', ')}` })
  }
  if (!meal_plan_id) {
    return res.status(400).json({ error: 'meal_plan_id is required' })
  }

  // Verify the meal plan belongs to this user
  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('id', meal_plan_id)
    .eq('user_id', req.user.id)
    .single()

  if (!plan) {
    return res.status(403).json({ error: 'Meal plan not found or access denied' })
  }

  const { data, error } = await supabase
    .from('meal_feedback')
    .insert({
      user_id: req.user.id,
      meal_plan_id,
      day_of_week,
      meal_type,
      rating: rating || null,
      skipped: skipped || false
    })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: 'Failed to save feedback' })
  }

  res.json({ success: true, feedback: data })
})

module.exports = router
