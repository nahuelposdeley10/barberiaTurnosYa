import { useEffect, useState } from 'react'
import { cancelBooking, createBooking, getAvailability, getManagedBooking } from '../api'
import { BarberPole, ServiceIcon } from './BarberIcons'
import ScheduleCalendar from './ScheduleCalendar'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const HERO_IMG = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1400&auto=format&fit=crop'
const ACTIVE_BOOKING_KEY = 'turnobarberya:active-booking'
const CLOSE_COUNTDOWN = 3
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

function currency(n) {
  return `$${Number(n || 0).toLocaleString('es-AR')}`
}

// Lee todos los turnos guardados. Soporta el formato viejo (un solo objeto)
// y el nuevo (array de { manageToken }).
function readStoredBookings() {
  try {
    const raw = window.localStorage.getItem(ACTIVE_BOOKING_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && typeof item.manageToken === 'string')
    }
    if (parsed && typeof parsed.manageToken === 'string') {
      return [{ manageToken: parsed.manageToken }]
    }
    return []
  } catch {
    window.localStorage.removeItem(ACTIVE_BOOKING_KEY)
    return []
  }
}

function writeStoredBookings(bookings) {
  const tokens = bookings
    .map((booking) => booking.manageToken)
    .filter((token) => typeof token === 'string' && token)
  if (tokens.length === 0) {
    window.localStorage.removeItem(ACTIVE_BOOKING_KEY)
    return
  }
  window.localStorage.setItem(
    ACTIVE_BOOKING_KEY,
    JSON.stringify(tokens.map((manageToken) => ({ manageToken })))
  )
}

export default function BookingPage({ onAdmin }) {
  const today = localDateStr(new Date())
  const maxDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 60)
    return localDateStr(d)
  })()

  const [barberName, setBarberName] = useState('Barbería')
  const [message, setMessage] = useState('Reservá tu turno online, sin esperas.')
  const [services, setServices] = useState([])
  const [slots, setSlots] = useState([])
  const [selectedService, setSelectedService] = useState('')
  const [date, setDate] = useState(today)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [activeBookings, setActiveBookings] = useState([])
  const [restoringBooking, setRestoringBooking] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [countdown, setCountdown] = useState(CLOSE_COUNTDOWN)

  const freeCount = slots.filter((slot) => slot.free).length

  useEffect(() => {
    document.title = `${barberName} · Reservá tu turno online`
  }, [barberName])

  useEffect(() => {
    let disposed = false
    const stored = readStoredBookings()

    if (stored.length === 0) {
      // The restore check synchronizes the initial localStorage read with the loading state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRestoringBooking(false)
      return () => {
        disposed = true
      }
    }

    Promise.all(
      stored.map((item) =>
        getManagedBooking(item.manageToken).then(
          (booking) => ({ ok: true, booking, manageToken: item.manageToken }),
          (err) => ({ ok: false, err, manageToken: item.manageToken })
        )
      )
    )
      .then((results) => {
        if (disposed) return
        const valid = []
        const keep = []
        let networkError = false
        for (const result of results) {
          if (result.ok) {
            if (result.booking.status === 'done' || result.booking.status === 'cancelled') continue
            valid.push({ ...result.booking, manageToken: result.manageToken })
            keep.push({ manageToken: result.manageToken })
          } else if (result.err.status === 404) {
            continue
          } else {
            // No pudimos verificarlo: lo conservamos en storage por si es transitorio.
            networkError = true
            keep.push({ manageToken: result.manageToken })
          }
        }
        writeStoredBookings(keep)
        // Solo poblamos el panel de turnos activos. No mostramos la pantalla de
        // confirmación al recargar: el panel "Tus turnos activos" ya la reemplaza.
        setActiveBookings(valid)
        if (networkError) {
          setError('No pudimos revisar tu turno guardado. Volvé a intentar en unos segundos.')
        }
      })
      .finally(() => {
        if (!disposed) setRestoringBooking(false)
      })

    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    let disposed = false
    // The loading indicator mirrors the lifecycle of the availability request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getAvailability(date || today, selectedService)
      .then((data) => {
        if (disposed) return
        setBarberName(data.barberName || 'Barbería')
        setMessage(data.message || 'Reservá tu turno online, sin esperas.')
        setServices(data.services || [])
        setSlots(data.slots || [])
        setError('')
        if (!selectedService && data.services?.length) {
          setSelectedService(data.services[0].name)
        }
      })
      .catch((err) => {
        if (!disposed) setError(err.message)
      })
      .finally(() => {
        if (!disposed) setLoading(false)
      })
    return () => {
      disposed = true
    }
  }, [date, selectedService, today])

  // La pantalla de confirmación se cierra sola a los pocos segundos y vuelve al
  // asistente, donde ya queda el panel "Tus turnos activos". Mientras tanto se
  // muestra un contador para que el usuario sepa que está por cerrarse.
  useEffect(() => {
    if (!confirm || cancelled) return undefined
    // Reseteamos el contador cuando aparece una nueva confirmación.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountdown(CLOSE_COUNTDOWN)
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval)
          setConfirm(null)
          setCancelled(false)
          setStep(1)
          setSelectedSlot('')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [confirm, cancelled])

  async function refreshSlots() {
    try {
      const data = await getAvailability(date || today, selectedService)
      setSlots(data.slots || [])
      return data
    } catch (err) {
      setError(err.message)
      return null
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
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
      setCancelled(false)
      if (booking.manageToken) {
        const next = [
          ...activeBookings.filter((item) => item.manageToken !== booking.manageToken),
          booking,
        ]
        setActiveBookings(next)
        writeStoredBookings(next)
      }
      await refreshSlots()
    } catch (err) {
      setError(err.message)
      if (/ocupado|lleno/i.test(err.message)) {
        setSelectedSlot('')
        setStep(3)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Volvemos al formulario pero NO borramos los turnos activos guardados:
  // siguen visibles en el panel para poder cancelarlos.
  function resetForm() {
    setConfirm(null)
    setDate('')
    setSelectedSlot('')
    setStep(1)
    setName('')
    setPhone('')
    setError('')
    setCancelled(false)
    setCancelling(false)
  }

  async function handleCancelBooking(manageToken) {
    if (!manageToken || cancelling) return
    if (!window.confirm('¿Querés cancelar este turno? El horario volverá a quedar disponible.')) return
    setCancelling(true)
    setError('')
    try {
      const updated = await cancelBooking(manageToken)
      const remaining = activeBookings.filter((item) => item.manageToken !== manageToken)
      setActiveBookings(remaining)
      writeStoredBookings(remaining)
      if (confirm?.manageToken === manageToken) {
        if (remaining.length > 0) {
          setConfirm(remaining[0])
          setCancelled(false)
        } else {
          setConfirm({ ...updated, manageToken })
          setCancelled(true)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  if (restoringBooking) {
    return (
      <main className="booking-page booking-result-page">
        <section className="booking-result">
          <p className="booking-eyebrow">Turno</p>
          <h1>Revisando tu turno activo…</h1>
          <p className="booking-result-lead">Estamos comprobando si todavía está vigente.</p>
        </section>
      </main>
    )
  }

  if (confirm) {
    const otherBookings = activeBookings.filter(
      (item) => item.manageToken !== confirm.manageToken
    )
    return (
      <main className="booking-page booking-result-page">
        <header className="booking-topbar">
          <div className="booking-brand">
            <span className="booking-brand-mark">✂</span>
            <div className="booking-brand-copy">
              <strong>{barberName}</strong>
              <span>Reservas online</span>
            </div>
          </div>
          <BarberPole />
        </header>

        <section className="booking-result">
          <div className={`result-icon ${cancelled ? 'result-icon-cancelled' : ''}`}>
            {cancelled ? '×' : '✓'}
          </div>
          <p className="booking-eyebrow">{cancelled ? 'Turno cancelado' : 'Turno activo'}</p>
          <h1>{cancelled ? 'Liberamos tu horario' : '¡Tu turno está reservado!'}</h1>
          <p className="booking-result-lead">
            {cancelled
              ? 'El horario quedó disponible nuevamente.'
              : 'Tu turno quedó registrado. Guardá esta pantalla y, si querés, confirmá por WhatsApp con la barbería.'}
          </p>

          <ul className="confirm-list">
            <ConfirmRow label="Servicio" value={confirm.service} />
            <ConfirmRow label="Fecha" value={formatDate(confirm.date)} />
            <ConfirmRow label="Hora" value={`${confirm.time} h`} />
            <ConfirmRow label="Nombre" value={confirm.name} />
            <ConfirmRow label="Teléfono" value={confirm.phone} />
            <ConfirmRow label="Dirección" value={confirm.address || 'Te esperamos en el local'} />
          </ul>

          {!cancelled && confirm.manageToken && (
            <div className="result-actions">
              <p className="muted small">Si finalmente no podés asistir, podés cancelar el turno desde acá.</p>
              <button type="button" className="btn btn-danger btn-block" onClick={() => handleCancelBooking(confirm.manageToken)} disabled={cancelling}>
                {cancelling ? 'Cancelando…' : 'Cancelar turno'}
              </button>
            </div>
          )}

          {!cancelled && otherBookings.length > 0 && (
            <div className="result-actions">
              <p className="muted small">Tus otros turnos activos:</p>
              <ul className="active-bookings">
                {otherBookings.map((booking) => (
                  <ActiveBookingRow
                    key={booking.manageToken}
                    booking={booking}
                    onCancel={handleCancelBooking}
                    cancelling={cancelling}
                  />
                ))}
              </ul>
            </div>
          )}

          {error && <p className="error" role="alert">{error}</p>}
          <button type="button" className="btn btn-primary" onClick={resetForm}>
            Reservar otro turno
          </button>

          {!cancelled && confirm.manageToken && (
            <div className="result-countdown" role="status" aria-live="polite">
              <svg className="result-countdown-ring" viewBox="0 0 44 44" aria-hidden="true">
                <circle className="result-countdown-track" cx="22" cy="22" r="19" />
                <circle
                  className="result-countdown-progress"
                  cx="22"
                  cy="22"
                  r="19"
                  style={{ animationDuration: `${CLOSE_COUNTDOWN}s` }}
                />
              </svg>
              <span className="result-countdown-number">{countdown}</span>
              <span className="result-countdown-label">Volviendo a tu agenda en {countdown}…</span>
            </div>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="booking-page">
      <header className="booking-topbar">
        <div className="booking-brand">
          <span className="booking-brand-mark">✂</span>
          <div className="booking-brand-copy">
            <strong>{barberName}</strong>
            <span>Reservas online</span>
          </div>
        </div>
        <button type="button" className="booking-admin-link" onClick={onAdmin}>
          Ingreso barbero <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="booking-hero" aria-label="Reservá tu turno">
        <img className="booking-hero-image" src={HERO_IMG} alt="" />
        <div className="booking-hero-overlay" />
        <div className="booking-hero-content">
          <span className="booking-hero-kicker">Barbershop</span>
          <BarberPole />
          <h1>Reservá tu turno</h1>
          <p>{message}</p>
        </div>
      </section>

      <div className="booking-features" aria-label="Ventajas de reservar online">
        <span>✓ Sin esperas</span>
        <span>✓ Confirmación rápida</span>
        <span>✓ Agenda online</span>
      </div>

      {activeBookings.length > 0 && (
        <section className="booking-card active-bookings-card">
          <div className="active-bookings-head">
            <div className="active-bookings-title">
              <h2>Tus turnos activos</h2>
              <span className="active-bookings-count">{activeBookings.length}</span>
            </div>
            <p>Acá podés cancelar cualquiera de tus turnos reservados.</p>
          </div>
          <ul className="active-bookings">
            {activeBookings.map((booking) => (
              <ActiveBookingRow
                key={booking.manageToken}
                booking={booking}
                onCancel={handleCancelBooking}
                cancelling={cancelling}
              />
            ))}
          </ul>
        </section>
      )}

      <BookingProgress step={step} />

      {step === 1 && (
        <section className="booking-card">
          <StepHeading n={1} eyebrow="Paso 1 de 4" title="Elegí tu próximo look" subtitle="Seleccioná un servicio para ver los horarios disponibles." />
          <div className="booking-services">
            {services.map((service) => (
              <button
                key={service.name}
                type="button"
                className={`booking-service ${selectedService === service.name ? 'active' : ''}`}
                style={service.color ? { '--service-accent': service.color } : undefined}
                onClick={() => {
                  setSelectedService(service.name)
                  setDate('')
                  setSelectedSlot('')
                  setStep(2)
                  setError('')
                }}
              >
                <ServiceIcon service={service.name} icon={service.icon} />
                <span className="booking-service-copy">
                  <strong>{service.name}</strong>
                  <span>{service.duration} min · {currency(service.price)}</span>
                </span>
                <span className="booking-service-arrow" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
          {loading && services.length === 0 && <p className="empty">Cargando servicios…</p>}
          {error && services.length === 0 && <p className="error" role="alert">{error}</p>}
        </section>
      )}

      {step === 2 && (
        <section className="booking-card">
          <StepHeading n={2} eyebrow="Paso 2 de 4" title="¿Qué día te queda cómodo?" subtitle={`${selectedService} · Elegí una fecha para mostrarte los horarios.`} />
          {error && <p className="error" role="alert">{error}</p>}
          <ScheduleCalendar
            value={date}
            minDate={today}
            maxDate={maxDate}
            service={selectedService}
            onSelect={(selectedDate) => {
              setDate(selectedDate)
              setSelectedSlot('')
              setStep(3)
              setError('')
            }}
          />
          <WizardBackButton label="Cambiar servicio" onClick={() => { setSelectedSlot(''); setStep(1) }} />
        </section>
      )}

      {step === 3 && date && (
        <section className="booking-card">
          <StepHeading n={3} eyebrow="Paso 3 de 4" title="Elegí un horario" subtitle={`${selectedService} · ${formatDate(date)}`} />
          {error && <p className="error" role="alert">{error}</p>}
          {loading ? (
            <p className="empty">Cargando horarios…</p>
          ) : slots.length === 0 ? (
            <p className="empty">No hay horarios disponibles para este día. Probá con otra fecha.</p>
          ) : (
            <>
              {freeCount === 0 && <p className="empty">Este día está lleno. Probá con otra fecha.</p>}
              <div className="slots-grid">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    className={`slot-btn ${slot.free ? (slot.ocupadas > 0 ? 'partial' : 'free') : 'taken'} ${selectedSlot === slot.time ? 'active' : ''}`}
                    disabled={!slot.free}
                    style={slot.free && slot.ocupadas > 0 && slot.sillas
                      ? { background: `linear-gradient(90deg, rgba(248, 113, 113, 0.24) 0 ${Math.round((slot.ocupadas / slot.sillas) * 100)}%, rgba(52, 211, 153, 0.25) ${Math.round((slot.ocupadas / slot.sillas) * 100)}% 100%)` }
                      : undefined}
                    onClick={() => {
                      setSelectedSlot(slot.time)
                      setStep(4)
                      setError('')
                    }}
                  >
                    <span>{slot.time}</span>
                    {Number.isFinite(slot.sillas) && (
                      <small>{slot.ocupadas || 0}/{slot.sillas} sillas</small>
                    )}
                  </button>
                ))}
              </div>
              <div className="cal-legend">
                <span className="cal-legend-item"><i className="dot free" /> Libre</span>
                <span className="cal-legend-item"><i className="dot full" /> Ocupado</span>
                <span className="cal-legend-item"><i className="dot partial" /> Medio ocupado</span>
              </div>
            </>
          )}
          <WizardBackButton label="Cambiar fecha" onClick={() => { setSelectedSlot(''); setStep(2) }} />
        </section>
      )}

      {step === 4 && selectedSlot && (
        <section className="booking-card booking-form-card">
          <StepHeading n={4} eyebrow="Paso 4 de 4" title="Confirmá tus datos" subtitle={`${selectedService} · ${formatDate(date)} a las ${selectedSlot} h`} />
          {error && <p className="error" role="alert">{error}</p>}
          <form className="booking-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Nombre</span>
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" autoComplete="name" />
            </label>
            <label className="field">
              <span>Teléfono / WhatsApp</span>
              <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Ej: 1155667788" inputMode="tel" autoComplete="tel" />
            </label>
            <p className="booking-note">Al confirmar, tu solicitud queda registrada en la agenda de la barbería.</p>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(3)}>Cambiar horario</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Reservando…' : 'Confirmar turno'}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  )
}

function ActiveBookingRow({ booking, onCancel, cancelling }) {
  const d = new Date(`${booking.date}T00:00:00`)
  const dayNum = d.getDate()
  const monthShort = MONTH_NAMES[d.getMonth()].slice(0, 3)
  const dayName = DAY_NAMES[d.getDay()]
  const status = STATUS_LABELS[booking.status] || 'Activo'

  return (
    <li className="active-booking-row">
      <span className="booking-cal-badge" aria-hidden="true">
        <small>{monthShort}</small>
        <strong>{dayNum}</strong>
      </span>

      <div className="active-booking-info">
        <div className="active-booking-top">
          <strong className="active-booking-service">{booking.service}</strong>
          <span className={`booking-status booking-status-${booking.status}`}>{status}</span>
        </div>
        <div className="active-booking-meta">
          <span className="active-booking-meta-item">
            <i className="meta-ico" aria-hidden="true">◷</i>
            {dayName} {booking.time} h
          </span>
          <span className="active-booking-meta-item">
            <i className="meta-ico" aria-hidden="true">⏱</i>
            {booking.duration} min
          </span>
          <span className="active-booking-meta-item active-booking-price">
            <i className="meta-ico" aria-hidden="true">$</i>
            {currency(booking.price)}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-ghost btn-small active-booking-cancel"
        onClick={() => onCancel(booking.manageToken)}
        disabled={cancelling}
      >
        {cancelling ? 'Cancelando…' : 'Cancelar'}
      </button>
    </li>
  )
}

function BookingProgress({ step }) {
  const items = [
    { n: 1, label: 'Servicio' },
    { n: 2, label: 'Fecha' },
    { n: 3, label: 'Horario' },
    { n: 4, label: 'Datos' },
  ]

  return (
    <nav className="booking-progress" aria-label="Progreso de la reserva">
      {items.map((item, index) => (
        <div key={item.n} className={`booking-progress-step ${item.n === step ? 'current' : ''} ${item.n < step ? 'complete' : ''}`}>
          {index > 0 && <span className="booking-progress-line" aria-hidden="true" />}
          <span className="booking-progress-dot" aria-current={item.n === step ? 'step' : undefined}>
            {item.n < step ? '✓' : item.n}
          </span>
          <span>{item.label}</span>
        </div>
      ))}
    </nav>
  )
}

function StepHeading({ n, eyebrow, title, subtitle }) {
  return (
    <div className="booking-step-heading">
      <span className="step-number">{n}</span>
      <div>
        <p className="booking-step-eyebrow">{eyebrow}</p>
        <h2 className="booking-step-title">{title}</h2>
        <p className="booking-step-subtitle">{subtitle}</p>
      </div>
    </div>
  )
}

function WizardBackButton({ label, onClick }) {
  return <button type="button" className="wizard-back" onClick={onClick}>← {label}</button>
}

function ConfirmRow({ label, value }) {
  return (
    <li>
      <span>{label}</span>
      <strong>{value}</strong>
    </li>
  )
}
