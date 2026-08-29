import { useEffect, useState } from 'react'
import { createBooking, getAvailability } from '../api'
import { BarberPole, ServiceIcon } from './BarberIcons'
import ScheduleCalendar from './ScheduleCalendar'
import heroImg from '../assets/hero.jpg'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

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

function currency(n) {
  return `$${Number(n || 0).toLocaleString('es-AR')}`
}

export default function BookingPage({ onAdmin }) {
  const today = localDateStr(new Date())
  const maxDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 60)
    return localDateStr(d)
  })()

  const [barberName, setBarberName] = useState('Barbería')
  const [message, setMessage] = useState('')
  const [services, setServices] = useState([])
  const [slots, setSlots] = useState([])
  const [selectedService, setSelectedService] = useState('')
  const [date, setDate] = useState(today)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const freeCount = slots.filter((s) => s.free).length

  useEffect(() => {
    document.title = `${barberName} · Reservá tu turno online`
  }, [barberName])

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getAvailability(date, selectedService)
      .then((data) => {
        if (cancelled) return
        setBarberName(data.barberName)
        setMessage(data.message || '')
        setServices(data.services || [])
        setSlots(data.slots || [])
        setError('')
        if (!selectedService && data.services && data.services.length) {
          setSelectedService(data.services[0].name)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [date, selectedService])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || phone.trim().length < 6) {
      setError('Ingresá tu nombre y un teléfono válido')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const booking = await createBooking({
        name: name.trim(),
        phone: phone.trim(),
        service: selectedService,
        date,
        time: selectedSlot,
      })
      setConfirm(booking)
    } catch (err) {
      setError(err.message)
      if (/ocupado/.test(err.message)) setSelectedSlot('')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setConfirm(null)
    setSelectedSlot('')
    setName('')
    setPhone('')
    setError('')
  }

  if (confirm) {
    return (
      <div className="page">
        <div className="card confirm-card">
          <div className="confirm-icon">✓</div>
          <h1>¡Turno reservado!</h1>
          <p>{barberName}</p>
          <ul className="confirm-list">
            <li><span>Servicio</span><strong>{confirm.service}</strong></li>
            <li><span>Fecha</span><strong>{formatDate(confirm.date)}</strong></li>
            <li><span>Hora</span><strong>{confirm.time}</strong></li>
            <li><span>Nombre</span><strong>{confirm.name}</strong></li>
            <li><span>Teléfono</span><strong>{confirm.phone}</strong></li>
            <li><span>Dirección</span><strong>Te esperamos en el local</strong></li>
          </ul>
          <button type="button" className="btn btn-primary" onClick={resetForm}>
            Reservar otro turno
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">✂</span>
          <strong>{barberName}</strong>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onAdmin}>
          Ingreso barbero
        </button>
      </header>

      <section className="hero">
        <img src={heroImg} alt="" className="hero-bg" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="hero-kicker">Barber Shop</span>
          <h1>Reservá tu turno</h1>
          <p>{message}</p>
          <BarberPole />
        </div>
      </section>

      <section className="features">
        <span className="feature">Sin esperas</span>
        <span className="feature">Confirmación al instante</span>
        <span className="feature">Agenda 100% online</span>
      </section>

      <section className="card">
        <h2 className="step-title"><span>1</span> Elegí el servicio</h2>
        <div className="services-grid">
          {services.map((s) => (
            <button
              key={s.name}
              type="button"
              className={`service-card ${selectedService === s.name ? 'active' : ''}`}
              onClick={() => {
                setSelectedService(s.name)
                setSelectedSlot('')
              }}
            >
              <ServiceIcon service={s.name} />
              <strong>{s.name}</strong>
              <span>{currency(s.price)} · {s.duration} min</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="step-title"><span>2</span> Elegí el día</h2>
        <ScheduleCalendar
          value={date}
          minDate={today}
          maxDate={maxDate}
          service={selectedService}
          onSelect={(d) => {
            setDate(d)
            setSelectedSlot('')
          }}
        />
      </section>

      <section className="card">
        <h2 className="step-title"><span>3</span> Elegí la hora</h2>
        {error && !selectedSlot ? (
          <p className="error">{error}</p>
        ) : (
          <p className="muted">
            {formatDate(date)} · {selectedService || 'servicio'}
          </p>
        )}
        {loading ? (
          <p className="muted">Cargando horarios…</p>
        ) : slots.length === 0 ? (
          <p className="empty">
            No hay horarios disponibles para este día. Probá con otra fecha.
          </p>
        ) : (
          <>
            {freeCount === 0 && (
              <p className="empty">Este día está lleno, todos los horarios están ocupados.</p>
            )}
            <div className="slots-grid">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  className={`slot-btn ${slot.free ? 'free' : 'taken'} ${
                    selectedSlot === slot.time ? 'active' : ''
                  }`}
                  disabled={!slot.free}
                  onClick={() => {
                    setSelectedSlot(slot.time)
                    setError('')
                    setPhone('')
                    setName('')
                  }}
                >
                  {slot.time}
                </button>
              ))}
            </div>
            <div className="cal-legend">
              <span className="cal-legend-item">
                <i className="dot free" />
                Libre
              </span>
              <span className="cal-legend-item">
                <i className="dot full" />
                Ocupado
              </span>
            </div>
          </>
        )}
      </section>

      {selectedSlot && (
        <section className="card form-card">
          <h2 className="step-title"><span>4</span> Tus datos</h2>
          <p className="muted">
            {selectedService} · {formatDate(date)} a las <strong>{selectedSlot} h</strong>
          </p>
          {error && <p className="error">{error}</p>}
          <form className="form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Nombre</span>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </label>
            <label className="field">
              <span>Teléfono / WhatsApp</span>
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 1155667788"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedSlot('')}
              >
                Volver
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Reservando…' : 'Confirmar turno'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}