import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL

const GOALS = [
  { value: 'lose_weight', label: 'Lose Weight', emoji: '🔥' },
  { value: 'muscle_gain', label: 'Build Muscle', emoji: '💪' },
  { value: 'maintain', label: 'Stay Healthy', emoji: '✅' },
  { value: 'eat_healthy', label: 'Clean Eating', emoji: '🥗' }
]

const DIETS = [
  { value: 'veg', label: 'Vegetarian', emoji: '🥛' },
  { value: 'vegan', label: 'Vegan', emoji: '🌱' },
  { value: 'jain', label: 'Jain', emoji: '🙏' },
  { value: 'non_veg', label: 'Non-Veg', emoji: '🍗' }
]

const SPICE_LEVELS = [
  { value: 'mild', label: 'Mild' },
  { value: 'medium', label: 'Medium' },
  { value: 'spicy', label: 'Spicy' }
]

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const BUDGETS = [
  { value: 150, label: 'Budget', sub: '₹150/day' },
  { value: 300, label: 'Moderate', sub: '₹300/day' },
  { value: 500, label: 'Flexible', sub: '₹500/day' }
]

const GEAR = [
  { value: 'induction', label: 'Induction' },
  { value: 'gas_stove', label: 'Gas Stove' },
  { value: 'microwave', label: 'Microwave' },
  { value: 'pressure_cooker', label: 'Pressure Cooker' },
  { value: 'oven', label: 'Oven' },
  { value: 'air_fryer', label: 'Air Fryer' }
]

function SelectCard({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-green-500 bg-green-50 text-green-800'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

function ToggleChip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        selected
          ? 'bg-green-500 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    goal: null,
    diet_type: null,
    spice_level: null,
    cooking_days: [],
    daily_budget_inr: null,
    kitchen_gear: [],
    allergies: ''
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef(null)
  const { session } = useAuth()
  const navigate = useNavigate()

  function animateStep(direction) {
    if (formRef.current) {
      gsap.fromTo(
        formRef.current,
        { x: direction * 60, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      )
    }
  }

  function isStepValid() {
    if (step === 1) return !!form.goal
    if (step === 2) return !!form.diet_type
    if (step === 3) return !!form.spice_level && form.cooking_days.length >= 1
    if (step === 4) return !!form.daily_budget_inr
    if (step === 5) return form.kitchen_gear.length >= 1
    return false
  }

  function goNext() {
    if (!isStepValid()) return
    setStep(s => s + 1)
    animateStep(1)
  }

  function goBack() {
    setStep(s => s - 1)
    animateStep(-1)
  }

  function toggleMulti(field, value) {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }))
  }

  async function handleSubmit() {
    if (!isStepValid()) return
    setError(null)
    setSubmitting(true)
    try {
      const token = session?.access_token
      const res = await fetch(`${API_URL}/api/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          daily_budget_inr: Number(form.daily_budget_inr)
        })
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Something went wrong. Try again.')
        return
      }
      navigate('/dashboard')
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-1 bg-green-500 transition-all duration-300"
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg" ref={formRef}>
          <p className="text-sm text-gray-400 mb-1">Step {step} of 5</p>

          {/* Step 1: Goal */}
          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">What's your goal?</h2>
              <div className="grid grid-cols-2 gap-3">
                {GOALS.map(g => (
                  <SelectCard
                    key={g.value}
                    selected={form.goal === g.value}
                    onClick={() => setForm(f => ({ ...f, goal: g.value }))}
                  >
                    <span className="text-2xl block mb-1">{g.emoji}</span>
                    <span className="font-medium text-sm">{g.label}</span>
                  </SelectCard>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Diet type */}
          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">What do you eat?</h2>
              <div className="grid grid-cols-2 gap-3">
                {DIETS.map(d => (
                  <SelectCard
                    key={d.value}
                    selected={form.diet_type === d.value}
                    onClick={() => setForm(f => ({ ...f, diet_type: d.value }))}
                  >
                    <span className="text-2xl block mb-1">{d.emoji}</span>
                    <span className="font-medium text-sm">{d.label}</span>
                  </SelectCard>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Spice + cooking days */}
          {step === 3 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Spice level and cooking days</h2>
              <p className="text-sm text-gray-500 mb-3">Spice preference</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {SPICE_LEVELS.map(s => (
                  <SelectCard
                    key={s.value}
                    selected={form.spice_level === s.value}
                    onClick={() => setForm(f => ({ ...f, spice_level: s.value }))}
                  >
                    <span className="font-medium text-sm">{s.label}</span>
                  </SelectCard>
                ))}
              </div>
              <p className="text-sm text-gray-500 mb-3">Which days can you cook? (pick at least one)</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day, i) => (
                  <ToggleChip
                    key={day}
                    selected={form.cooking_days.includes(day)}
                    onClick={() => toggleMulti('cooking_days', day)}
                  >
                    {DAY_LABELS[i]}
                  </ToggleChip>
                ))}
              </div>
            </>
          )}

          {/* Step 4: Budget */}
          {step === 4 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Daily food budget</h2>
              <p className="text-sm text-gray-500 mb-6">This includes all meals in a day</p>
              <div className="grid grid-cols-3 gap-3">
                {BUDGETS.map(b => (
                  <SelectCard
                    key={b.value}
                    selected={form.daily_budget_inr === b.value}
                    onClick={() => setForm(f => ({ ...f, daily_budget_inr: b.value }))}
                  >
                    <span className="font-medium text-sm block">{b.label}</span>
                    <span className="text-xs text-gray-500">{b.sub}</span>
                  </SelectCard>
                ))}
              </div>
            </>
          )}

          {/* Step 5: Kitchen gear + allergies */}
          {step === 5 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Kitchen setup</h2>
              <p className="text-sm text-gray-500 mb-3">What do you have? (pick at least one)</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {GEAR.map(g => (
                  <ToggleChip
                    key={g.value}
                    selected={form.kitchen_gear.includes(g.value)}
                    onClick={() => toggleMulti('kitchen_gear', g.value)}
                  >
                    {g.label}
                  </ToggleChip>
                ))}
              </div>
              <p className="text-sm text-gray-500 mb-2">Any allergies? (optional)</p>
              <input
                type="text"
                placeholder="e.g. peanuts, shellfish"
                value={form.allergies}
                onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            {step < 5 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!isStepValid()}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isStepValid() || submitting}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                {submitting ? 'Saving...' : 'Get my meal plan →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
