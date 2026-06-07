import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) {
      redirectAfterAuth(session.access_token)
    }
  }, [session])

  async function redirectAfterAuth(token) {
    try {
      const res = await fetch(`${API_URL}/api/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      navigate(data.preferences ? '/dashboard' : '/onboarding', { replace: true })
    } catch {
      navigate('/onboarding', { replace: true })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        const { session } = await signIn(email, password)
        if (session) await redirectAfterAuth(session.access_token)
      } else {
        await signUp(email, password)
        setError('Check your email to confirm your account before logging in.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-center text-gray-500 text-sm mb-6">NutriSync</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
            className="text-green-600 font-semibold hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
