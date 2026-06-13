const MEAL_PLAN_TOOL = {
  name: 'generate_meal_plan',
  description: 'Generate a structured 7-day meal plan for the user based on their preferences and feedback history',
  input_schema: {
    type: 'object',
    properties: {
      week_start: {
        type: 'string',
        description: 'Monday date in YYYY-MM-DD format'
      },
      days: {
        type: 'array',
        minItems: 7,
        maxItems: 7,
        items: {
          type: 'object',
          properties: {
            day: {
              type: 'string',
              enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            },
            meals: {
              type: 'object',
              properties: {
                breakfast: { $ref: '#/$defs/meal' },
                lunch: { $ref: '#/$defs/meal' },
                dinner: { $ref: '#/$defs/meal' },
                snack: { $ref: '#/$defs/meal' }
              },
              required: ['breakfast', 'lunch', 'dinner', 'snack']
            }
          },
          required: ['day', 'meals']
        }
      }
    },
    required: ['week_start', 'days'],
    $defs: {
      meal: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          prep_time_minutes: { type: 'number' },
          macros: {
            type: 'object',
            properties: {
              calories: { type: 'number' },
              protein_g: { type: 'number' },
              carbs_g: { type: 'number' },
              fat_g: { type: 'number' }
            },
            required: ['calories', 'protein_g', 'carbs_g', 'fat_g']
          },
          estimated_cost_inr: { type: 'number' },
          eating_out_alternative: {
            type: 'object',
            properties: {
              what_to_look_for: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
              avoid: { type: 'array', items: { type: 'string' } }
            },
            required: ['what_to_look_for', 'keywords', 'avoid']
          }
        },
        required: [
          'name', 'description', 'prep_time_minutes',
          'macros', 'estimated_cost_inr', 'eating_out_alternative'
        ]
      }
    }
  }
}

module.exports = MEAL_PLAN_TOOL
