/**
 * @typedef {Object} Macros
 * @property {number} calories
 * @property {number} protein_g
 * @property {number} carbs_g
 * @property {number} fat_g
 */

/**
 * @typedef {Object} EatingOutAlternative
 * @property {string} what_to_look_for
 * @property {string[]} keywords
 * @property {string[]} avoid
 */

/**
 * @typedef {Object} Meal
 * @property {string} name
 * @property {string} description
 * @property {number} prep_time_minutes
 * @property {Macros} macros
 * @property {number} estimated_cost_inr
 * @property {EatingOutAlternative} eating_out_alternative
 */

/**
 * @typedef {Object} DayMeals
 * @property {Meal} breakfast
 * @property {Meal} lunch
 * @property {Meal} dinner
 * @property {Meal} snack
 */

/**
 * @typedef {Object} Day
 * @property {string} day - Day name (e.g. "Monday")
 * @property {DayMeals} meals
 */

/**
 * @typedef {Object} MealPlan
 * @property {string} week_start - YYYY-MM-DD, always a Monday
 * @property {Day[]} days - Array of 7 Day objects
 */

/**
 * @typedef {Object} PrepList
 * @property {Object.<string, string[]>} grocery_by_category - e.g. { "Vegetables": ["spinach", "tomatoes"] }
 * @property {Array<{step: number, task: string, time_minutes: number}>} prep_order
 * @property {number} total_budget_inr
 */

module.exports = {}
