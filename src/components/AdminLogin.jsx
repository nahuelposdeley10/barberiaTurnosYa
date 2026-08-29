import { useState } from 'react'
import { adminLogin } from '../api'
import { BarberPole } from './BarberIcons'
import actionImg from '../assets/action.jpg'

export default function AdminLogin({ onLogin, onBack }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await adminLogin(pin.trim())
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
          <p className="muted">Ingresá tu PIN para administrar los turnos.</p>
          {error && <p className="error">{error}</p>}
          <form className="form" onSubmit={handleSubmit}>
            <label className="field">
              <span>PIN</span>
              <input
                className="input input-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                autoFocus
              />
            </label>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
          <p className="muted small">PIN por defecto: 1234 (podés cambiarlo en Configuración)</p>
        </div>
      </div>
    </div>
  )
}