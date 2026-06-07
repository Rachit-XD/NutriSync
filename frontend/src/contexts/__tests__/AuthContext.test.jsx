import { renderHook, waitFor } from '@testing-library/react'
import { AuthProvider, AuthContext, useAuth } from '../AuthContext'
import { supabase } from '../../lib/supabase'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    }
  }
}))

beforeEach(() => {
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
  supabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } }
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('AuthContext', () => {
  it('starts with loading=true then transitions to loading=false', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('session is null initially when not logged in', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
    expect(result.current.user).toBeUndefined()
  })

  it('exposes signIn, signUp, signOut functions', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(typeof result.current.signIn).toBe('function')
    expect(typeof result.current.signUp).toBe('function')
    expect(typeof result.current.signOut).toBe('function')
  })

  it('throws when useAuth is used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within AuthProvider'
    )
  })
})
