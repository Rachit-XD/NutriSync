exports.buildMealPlanPrompt = function (preferences, feedbackHistory) {
  const systemPrompt = `You are a professional nutritionist specializing in Indian cuisine for busy urban professionals.

CULTURAL AND NUTRITIONAL RULES (always apply):
- All ingredients must be available in Indian grocery stores
- Jain diet: no root vegetables (no onion, garlic, potato, carrot, radish, beet)
- Vegan: no dairy, no eggs, no meat
- Veg: no meat, no eggs, dairy allowed
- Non-veg: all ingredients allowed
- Always suggest realistic prep times for working professionals
- Budget is in Indian Rupees (INR)
- Prioritize common Indian cooking equipment: pressure cooker, tawa, kadai
- Meals must reflect Indian taste profiles and ingredients
- Protein sources: dal, paneer, curd, eggs, chicken, fish, soya chunks, rajma, chana

USER PROFILE (use throughout entire plan):
- Goal: ${preferences.goal}
- Diet type: ${preferences.diet_type}
- Spice preference: ${preferences.spice_level}
- Cooking days: ${preferences.cooking_days.join(', ')}
- Daily budget: ₹${preferences.daily_budget_inr}
- Kitchen gear: ${preferences.kitchen_gear.join(', ')}
- Allergies: ${preferences.allergies || 'none'}
- Budget per meal (approx): ₹${Math.round(preferences.daily_budget_inr / 3)}`

  const feedbackContext = feedbackHistory.length > 0
    ? `PREVIOUS FEEDBACK TO INCORPORATE:\n${feedbackHistory.map(f =>
        `- ${f.day_of_week} ${f.meal_type}: ${f.rating === 'thumbs_up'
          ? 'user liked this, include similar meals'
          : f.skipped
            ? 'user skipped this, avoid similar meals'
            : 'user disliked this, avoid similar meals'}`
      ).join('\n')}`
    : 'No previous feedback. Generate a balanced first week.'

  const userPrompt = `${feedbackContext}

Generate a complete 7-day meal plan starting from the coming Monday. Every meal must fit the user profile above.
For cooking days (${preferences.cooking_days.join(', ')}), suggest home-cooked meals with prep instructions.
For non-cooking days, suggest eating-out guidance only (what to look for, what to avoid, keywords to search).
Use the generate_meal_plan tool to return the plan.`

  return { systemPrompt, userPrompt }
}
