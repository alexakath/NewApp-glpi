import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { login, isLoggedIn } from '../api/auth'
import './LoginPage.css'

const DEFAULT_CODE = import.meta.env.VITE_DEFAULT_CODE ?? ''

function LoginPage() {
  const navigate = useNavigate()
  const [code, setCode]       = useState(DEFAULT_CODE)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  if (isLoggedIn()) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(code)
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      setError(
        data?.error_description ??
        data?.message ??
        data?.detail ??
        'Code incorrect ou serveur inaccessible.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand-name">NewApp</span>
          <span className="login-brand-sub">GLPI Dashboard</span>
        </div>

        <h1 className="login-title">Accès Backoffice</h1>
        <p className="login-subtitle">Entrez votre code d'accès administrateur</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="code">Code d'accès</label>
            <input
              id="code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Vérification…' : 'Accéder'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
