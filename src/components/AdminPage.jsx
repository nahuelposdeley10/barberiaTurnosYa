import { useEffect, useState } from 'react'
import {
  adminDeleteBooking,
  adminGetBookings,
  adminGetSettings,
  adminUpdateBooking,
  adminUpdateSettings,
} from '../api'
import { BarberPole } from './BarberIcons'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  done: 'Completado',
}

function localDateStr(d) {
  const y = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${month}-${day}`
}

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`
}

export default function AdminPage({ token, onLogout }) {
  const today = localDateStr(new Date())
  const [tab, setTab] = useState('agenda')
  const [settings, setSettings] = useState(null)
  const [draft, setDraft] = useState(null)
  const [bookings, setBookings] = useState([])
  const [date, setDate] = useState(today)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [newBlockDate, setNewBlockDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminGetSettings(token)
      .then((s) => {
        setSettings(s)
        setDraft(JSON.parse(JSON.stringify(s)))
      })
      .catch((e) => setError(e.message))
  }, [token])

  useEffect(() => {
    document.title = `${
      settings ? settings.barberName : 'Panel del barbero'
    } · Panel del barbero`
  }, [settings])

  useEffect(() => {
    if (tab !== 'agenda') return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    adminGetBookings(token, { date, status: status || undefined })
      .then((list) => {
        if (!cancelled) {
          setBookings(list)
          setError('')
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, tab, date, status])

  async function changeStatus(id, newStatus) {
    setError('')
    try {
      await adminUpdateBooking(token, id, newStatus)
      const list = await adminGetBookings(token, { date, status: status || undefined })
      setBookings(list)
    } catch (e) {
      setError(e.message)
    }
  }

  async function removeBooking(id, name) {
    if (!window.confirm(`¿Eliminar el turno de ${name}?`)) return
    setError('')
    try {
      await adminDeleteBooking(token, id)
      const list = await adminGetBookings(token, { date, status: status || undefined })
      setBookings(list)
    } catch (e) {
      setError(e.message)
    }
  }

  function updateDraftService(index, field, value) {
    const services = draft.services.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    setDraft({ ...draft, services })
  }

  function removeService(index) {
    setDraft({ ...draft, services: draft.services.filter((_, i) => i !== index) })
  }

  function addService() {
    setDraft({
      ...draft,
      services: [...draft.services, { name: '', price: 0, duration: 30 }],
    })
  }

  function updateDay(index, field, value) {
    setDraft({
      ...draft,
      days: draft.days.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    })
  }

  function addBlockDate() {
    if (!newBlockDate) return
    if (draft.unavailableDates.includes(newBlockDate)) return
    setDraft({
      ...draft,
      unavailableDates: [...draft.unavailableDates, newBlockDate].sort(),
    })
    setNewBlockDate('')
  }

  async function saveSettings(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const updated = await adminUpdateSettings(token, draft)
      setSettings(updated)
      setDraft(JSON.parse(JSON.stringify(updated)))
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const stats = {
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    done: bookings.filter((b) => b.status === 'done').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  }

  return (
    <div className="page admin">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">✂</span>
          <strong>{settings ? settings.barberName : 'Panel del barbero'}</strong>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onLogout}>
          Salir
        </button>
      </header>

      <BarberPole />

      <nav className="tabs">
        <button
          type="button"
          className={`tab ${tab === 'agenda' ? 'active' : ''}`}
          onClick={() => setTab('agenda')}
        >
          Agenda de turnos
        </button>
        <button
          type="button"
          className={`tab ${tab === 'config' ? 'active' : ''}`}
          onClick={() => setTab('config')}
        >
          Configuración
        </button>
      </nav>

      {error && <p className="error banner">{error}</p>}

      {tab === 'agenda' && (
        <>
          <section className="card filters">
            <label className="field">
              <span>Fecha</span>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Estado</span>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="pending">Pendientes</option>
                <option value="confirmed">Confirmados</option>
                <option value="done">Completados</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </label>
          </section>

          {status === '' && (
            <div className="stats">
              <span className="stat stat-pending">{stats.pending} pendientes</span>
              <span className="stat stat-confirmed">{stats.confirmed} confirmados</span>
              <span className="stat stat-done">{stats.done} completados</span>
              <span className="stat stat-cancelled">{stats.cancelled} cancelados</span>
            </div>
          )}

          <section className="card">
            <h2 className="section-title">
              {formatDate(date)}
              {status !== '' && <span className="muted"> · {STATUS_LABELS[status]}</span>}
            </h2>
            {loading ? (
              <p className="muted">Cargando turnos…</p>
            ) : bookings.length === 0 ? (
              <p className="empty">No hay turnos para esta selección.</p>
            ) : (
              <ul className="booking-list">
                {bookings.map((b) => (
                  <li key={b._id} className={`booking-item ${b.status}`}>
                    <div className="booking-time">{b.time}</div>
                    <div className="booking-main">
                      <div className="booking-line">
                        <strong>{b.name}</strong>
                        <span className={`st ${b.status}`}>{STATUS_LABELS[b.status]}</span>
                      </div>
                      <div className="booking-line muted">
                        <span>{b.service}</span>
                        <span>${Number(b.price || 0).toLocaleString('es-AR')}</span>
                      </div>
                      <div className="booking-line muted">
                        <span>{b.phone}</span>
                        <span>{b.duration} min</span>
                      </div>
                    </div>
                    <div className="booking-actions">
                      {b.status !== 'cancelled' && b.status !== 'done' && (
                        <>
                          {b.status !== 'confirmed' && (
                            <button
                              type="button"
                              className="btn btn-small btn-confirm"
                              onClick={() => changeStatus(b._id, 'confirmed')}
                            >
                              Confirmar
                            </button>
                          )}
                          {b.status !== 'done' && (
                            <button
                              type="button"
                              className="btn btn-small btn-done"
                              onClick={() => changeStatus(b._id, 'done')}
                            >
                              Completado
                            </button>
                          )}
                        </>
                      )}
                      {b.status !== 'cancelled' && b.status !== 'done' && (
                        <button
                          type="button"
                          className="btn btn-small btn-grey"
                          onClick={() => changeStatus(b._id, 'cancelled')}
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-small btn-danger"
                        onClick={() => removeBooking(b._id, b.name)}
                        title="Eliminar turno"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {tab === 'config' && draft && (
        <form className="card config-form" onSubmit={saveSettings}>
          <h2 className="section-title">Configuración</h2>

          <label className="field">
            <span>Nombre del local / barbero</span>
            <input
              className="input"
              value={draft.barberName}
              onChange={(e) => setDraft({ ...draft, barberName: e.target.value })}
            />
          </label>

          <label className="field">
            <span>Mensaje para los clientes</span>
            <input
              className="input"
              value={draft.message}
              onChange={(e) => setDraft({ ...draft, message: e.target.value })}
            />
          </label>

          <h3 className="group-title">Servicios</h3>
          <p className="muted small">El precio se muestra al cliente. La duración evita cruces de turnos.</p>
          <div className="services-editor">
            {draft.services.map((s, i) => (
              <div key={i} className="service-row">
                <input
                  className="input"
                  value={s.name}
                  placeholder="Nombre del servicio"
                  onChange={(e) => updateDraftService(i, 'name', e.target.value)}
                />
                <input
                  className="input input-price"
                  type="number"
                  min="0"
                  value={s.price}
                  onChange={(e) => updateDraftService(i, 'price', e.target.value)}
                />
                <input
                  className="input input-duration"
                  type="number"
                  min="5"
                  step="5"
                  value={s.duration}
                  onChange={(e) => updateDraftService(i, 'duration', e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-small btn-danger"
                  onClick={() => removeService(i)}
                  disabled={draft.services.length <= 1}
                >
                  Quitar
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost" onClick={addService}>
              + Agregar servicio
            </button>
          </div>
          <p className="muted small">Los precios y las duraciones son en $ y en minutos.</p>

          <h3 className="group-title">Horarios de atención</h3>
          <div className="days-editor">
            {draft.days.map((d, i) => (
              <div key={i} className={`day-row ${d.enabled ? '' : 'off'}`}>
                <input
                  className="check"
                  type="checkbox"
                  checked={d.enabled}
                  onChange={(e) => updateDay(i, 'enabled', e.target.checked)}
                />
                <span className="day-name">{DAY_NAMES[i]}</span>
                <span className="time-pair">
                  <input
                    className="input input-time"
                    type="time"
                    value={d.open}
                    disabled={!d.enabled}
                    onChange={(e) => updateDay(i, 'open', e.target.value)}
                  />
                  <span className="muted">a</span>
                  <input
                    className="input input-time"
                    type="time"
                    value={d.close}
                    disabled={!d.enabled}
                    onChange={(e) => updateDay(i, 'close', e.target.value)}
                  />
                </span>
              </div>
            ))}
          </div>

          <label className="field">
            <span>Separación entre turnos (minutos)</span>
            <input
              type="number"
              min="10"
              step="10"
              className="input input-duration"
              value={draft.slotMinutes}
              onChange={(e) => setDraft({ ...draft, slotMinutes: Number(e.target.value) })}
            />
          </label>

          <h3 className="group-title">Días sin atención</h3>
          <div className="blocks-row">
            <input
              type="date"
              className="input"
              value={newBlockDate}
              min={today}
              onChange={(e) => setNewBlockDate(e.target.value)}
            />
            <button type="button" className="btn btn-primary" onClick={addBlockDate}>
              Bloquear día
            </button>
          </div>
          <div className="chips">
            {draft.unavailableDates.map((d) => (
              <span key={d} className="chip">
                {formatDate(d)}
                <button
                  type="button"
                  className="chip-x"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      unavailableDates: draft.unavailableDates.filter((x) => x !== d),
                    })
                  }
                >
                  ×
                </button>
              </span>
            ))}
            {draft.unavailableDates.length === 0 && (
              <span className="muted small">Sin días bloqueados.</span>
            )}
          </div>

          <h3 className="group-title">Acceso</h3>
          <label className="field">
            <span>Email de acceso</span>
            <input
              className="input"
              type="email"
              value={draft.adminEmail || ''}
              onChange={(e) => setDraft({ ...draft, adminEmail: e.target.value })}
            />
          </label>

          <label className="field">
            <span>Nueva contraseña</span>
            <input
              className="input"
              type="password"
              value={draft.adminPassword || ''}
              onChange={(e) => setDraft({ ...draft, adminPassword: e.target.value })}
              placeholder="Dejar vacío para conservarla"
              autoComplete="new-password"
            />
          </label>
          <p className="muted small">Usá al menos 6 caracteres. La contraseña actual nunca se muestra.</p>

          {error && <p className="error">{error}</p>}
          {saved && <p className="ok">Configuración guardada ✓</p>}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </form>
      )}
    </div>
  )
}
