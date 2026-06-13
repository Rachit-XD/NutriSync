import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }

function LoadingDots() {
  const dot1 = useRef(null)
  const dot2 = useRef(null)
  const dot3 = useRef(null)

  useEffect(() => {
    const tl = gsap.timeline({ repeat: -1 })
    tl.to([dot1.current, dot2.current, dot3.current], {
      opacity: 0.2,
      duration: 0.4,
      stagger: 0.15,
      yoyo: true,
      repeat: 1
    })
    return () => tl.kill()
  }, [])

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-600 text-sm">Generating your week</span>
      <span className="flex gap-1">
        <span ref={dot1} className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        <span ref={dot2} className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        <span ref={dot3} className="w-2 h-2 rounded-full bg-green-500 inline-block" />
      </span>
    </div>
  )
}

function MealCard({ meal, mealType, dayName, planId, feedbackState, onFeedback, isEatingOut }) {
  const key = `${dayName}-${mealType}`
  const currentRating = feedbackState[key]

  const content = isEatingOut ? meal.eating_out_alternative : null

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
            {MEAL_LABELS[mealType]}
          </p>
          {isEatingOut ? (
            <>
              <p className="text-sm font-medium text-gray-800 leading-snug">
                {content.what_to_look_for}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Look for: {content.keywords.join(', ')}
              </p>
              {content.avoid.length > 0 && (
                <p className="text-xs text-red-400 mt-0.5">
                  Avoid: {content.avoid.join(', ')}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-800 leading-snug">{meal.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {meal.prep_time_minutes}m · {meal.macros.calories} kcal · {meal.macros.protein_g}g protein
              </p>
            </>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onFeedback(planId, dayName.toLowerCase(), mealType, 'thumbs_up')}
            className={`text-lg leading-none px-1 transition-opacity ${
              currentRating === 'thumbs_up' ? 'opacity-100' : 'opacity-30 hover:opacity-60'
            }`}
            aria-label="Like"
          >
            👍
          </button>
          <button
            type="button"
            onClick={() => onFeedback(planId, dayName.toLowerCase(), mealType, 'thumbs_down')}
            className={`text-lg leading-none px-1 transition-opacity ${
              currentRating === 'thumbs_down' ? 'opacity-100' : 'opacity-30 hover:opacity-60'
            }`}
            aria-label="Dislike"
          >
            👎
          </button>
        </div>
      </div>
    </div>
  )
}

function DayCard({ dayData, planId, feedbackState, onFeedback, eatingOut, onToggleEatingOut }) {
  const { day, meals } = dayData
  const isEatingOut = !!eatingOut[day]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-sm">{day}</h3>
        <button
          type="button"
          onClick={() => onToggleEatingOut(day)}
          className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
            isEatingOut
              ? 'bg-orange-100 text-orange-700'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {isEatingOut ? '🍽 Eating out' : 'Eating out?'}
        </button>
      </div>
      <div className="px-4">
        {MEAL_TYPES.map(mealType => (
          <MealCard
            key={mealType}
            meal={meals[mealType]}
            mealType={mealType}
            dayName={day}
            planId={planId}
            feedbackState={feedbackState}
            onFeedback={onFeedback}
            isEatingOut={isEatingOut}
          />
        ))}
      </div>
    </div>
  )
}

function formatWeekRange(weekStart) {
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const opts = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', opts)}`
}

export default function Dashboard() {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [eatingOut, setEatingOut] = useState({})
  const [feedback, setFeedback] = useState({})
  const [error, setError] = useState(null)

  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  const token = session?.access_token
  // TODO Phase 4: check subscription via API
  const isPro = false
  const isSatOrSun = [0, 6].includes(new Date().getDay())

  useEffect(() => {
    async function fetchCurrentPlan() {
      try {
        const res = await fetch(`${API_URL}/api/meal-plan/current`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to load plan')
        const data = await res.json()
        setPlan(data.meal_plan)
      } catch {
        setError('Failed to load your meal plan. Refresh to try again.')
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchCurrentPlan()
  }, [token])

  async function handleGenerate() {
    setError(null)
    setGenerating(true)
    try {
      const res = await fetch(`${API_URL}/api/meal-plan/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) setPlan(data.meal_plan)
      else setError(data.error || 'Generation failed. Try again.')
    } catch {
      setError('Network error. Check your connection.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleReplan() {
    if (!isPro) return
    setError(null)
    setGenerating(true)
    try {
      const res = await fetch(`${API_URL}/api/meal-plan/replan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) setPlan(data.meal_plan)
      else setError(data.error || 'Replan failed. Try again.')
    } catch {
      setError('Network error.')
    } finally {
      setGenerating(false)
    }
  }

  async function handlePrepList() {
    if (!isPro) return
    navigate('/prep-list')
  }

  function handleFeedback(mealPlanId, dayOfWeek, mealType, rating) {
    const key = `${dayOfWeek}-${mealType}`
    setFeedback(prev => ({ ...prev, [key]: rating })) // optimistic
    fetch(`${API_URL}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ meal_plan_id: mealPlanId, day_of_week: dayOfWeek, meal_type: mealType, rating })
    }).catch(() => {}) // best-effort
  }

  function toggleEatingOut(day) {
    setEatingOut(prev => ({ ...prev, [day]: !prev[day] }))
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-green-600 text-lg">NutriSync</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">{session?.user?.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">This Week</h1>
          {plan && (
            <p className="text-sm text-gray-400 mt-0.5">
              {formatWeekRange(plan.week_start_date)}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!plan && !generating && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🍱</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">No meal plan yet</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Generate your personalised Indian meal plan for the week. Takes about 5 seconds.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
            >
              Generate My Week
            </button>
          </div>
        )}

        {/* Generating state */}
        {generating && (
          <div className="flex flex-col items-center justify-center py-20">
            <LoadingDots />
          </div>
        )}

        {/* Meal plan grid */}
        {plan && !generating && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.plan_json.days.map(dayData => (
              <DayCard
                key={dayData.day}
                dayData={dayData}
                planId={plan.id}
                feedbackState={feedback}
                onFeedback={handleFeedback}
                eatingOut={eatingOut}
                onToggleEatingOut={toggleEatingOut}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <div className="max-w-5xl mx-auto flex gap-3">
          <div className="relative group">
            <button
              type="button"
              onClick={handleReplan}
              disabled={!isPro || generating}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isPro
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              ↺ Replan this week
            </button>
            {!isPro && (
              <div className="absolute bottom-full left-0 mb-2 w-max bg-gray-800 text-white text-xs rounded-lg px-2 py-1 hidden group-hover:block pointer-events-none">
                Upgrade to Pro
              </div>
            )}
          </div>

          {isSatOrSun && (
            <div className="relative group">
              <button
                type="button"
                onClick={handlePrepList}
                disabled={!isPro}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isPro
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                📋 Sunday Prep List
              </button>
              {!isPro && (
                <div className="absolute bottom-full left-0 mb-2 w-max bg-gray-800 text-white text-xs rounded-lg px-2 py-1 hidden group-hover:block pointer-events-none">
                  Upgrade to Pro
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
