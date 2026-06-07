import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from '../Login'
import { AuthContext } from '../../contexts/AuthContext'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

global.fetch = vi.fn()

function renderLogin(session = null, signIn = vi.fn(), signUp = vi.fn()) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ session, signIn, signUp }}>
        <Login />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('Login page', () => {
  it('renders email and password inputs', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('shows Log in button by default', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
  })

  it('toggles to Sign up mode when link is clicked', () => {
    renderLogin()
    fireEvent.click(screen.getByText('Sign up'))
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument()
  })

  it('calls signIn with email and password on submit', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({
      session: { access_token: 'tok' }
    })
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ preferences: null })
    })

    renderLogin(null, mockSignIn)

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'user@test.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(mockSignIn).toHaveBeenCalledWith('user@test.com', 'password123')
  })

  it('displays error message when signIn throws', async () => {
    const mockSignIn = vi.fn().mockRejectedValue(new Error('Invalid credentials'))
    renderLogin(null, mockSignIn)

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'bad@test.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'wrong' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    await screen.findByText('Invalid credentials')
  })
})
