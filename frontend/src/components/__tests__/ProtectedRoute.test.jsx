import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'
import { AuthContext } from '../../contexts/AuthContext'

function renderWithAuth(session, loading = false) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthContext.Provider value={{ session, loading }}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('redirects to /login when no session', () => {
    renderWithAuth(null)
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders the outlet when session exists', () => {
    renderWithAuth({ user: { id: 'u1' } })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders nothing (null) while loading', () => {
    const { container } = renderWithAuth(null, true)
    expect(container).toBeEmptyDOMElement()
  })
})
