import { useState } from 'react'
import { adminLogin } from '../api'
import { BarberPole } from './BarberIcons'
import actionImg from '../assets/action.jpg'

export default function AdminLogin({ onLogin, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await adminLogin(email.trim(), password)
      onLogin(res.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page admin-login">
      <button type="button" className="btn btn-ghost back" onClick={onBack}>
        ← Volver a la página de reservas
      </button>

      <div className="card login-card">
        <div className="login-img">
          <img src={actionImg} alt="" />
          <div className="login-img-overlay" />
          <p className="login-img-caption">Tu local, controlado desde acá.</p>
        </div>
        <div className="login-form">
          <BarberPole />
          <h1>Panel del barbero</h1>
          <p className="muted">Ingresá tu email y contraseña para administrar los turnos.</p>
          {error && <p className="error">{error}</p>}
          <form className="form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                autoFocus
              />
            </label>
            <label className="field">
              <span>Contraseña</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
          <p className="muted small">Podés cambiar el email y la contraseña desde Configuración.</p>
        </div>
      </div>
    </div>
  )
}
