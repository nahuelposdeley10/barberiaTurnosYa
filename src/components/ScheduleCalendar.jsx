import { useEffect, useState } from 'react'
import { getMonthAvailability } from '../api'

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function dateStr(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

export default function ScheduleCalendar({ value, minDate, maxDate, service, onSelect }) {
  const start = new Date(`${value || minDate}T00:00:00`)
  const [display, setDisplay] = useState({ y: start.getFullYear(), m: start.getMonth() })
  const [statusByDate, setStatusByDate] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const gridStart = new Date(display.y, display.m, 1)
    gridStart.setDate(1 - gridStart.getDay())
    const from = dateStr(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate())
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getMonthAvailability(from, service)
      .then((data) => {
        if (cancelled) return
        const map = {}
        for (const d of data.days || []) map[d.date] = d.status
        setStatusByDate(map)
      })
      .catch(() => {
        if (!cancelled) setStatusByDate({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [display.y, display.m, service])

  const minParts = minDate.split('-').map(Number)
  const maxParts = maxDate.split('-').map(Number)
  const atMinMonth = display.y === minParts[0] && display.m === minParts[1] - 1
  const atMaxMonth = display.y === maxParts[0] && display.m === maxParts[1] - 1

  function move(offset) {
    const d = new Date(display.y, display.m + offset, 1)
    setDisplay({ y: d.getFullYear(), m: d.getMonth() })
  }

  const gridStart = new Date(display.y, display.m, 1)
  const offset = gridStart.getDay()
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(display.y, display.m, 1 - offset + i)
    cells.push({
      ds: dateStr(d.getFullYear(), d.getMonth(), d.getDate()),
      day: d.getDate(),
      inMonth: d.getMonth() === display.m,
    })
  }

  return (
    <div className="calendar">
      <div className="cal-head">
        <button
          type="button"
          className="cal-nav"
          onClick={() => move(-1)}
          disabled={atMinMonth}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <strong className="cal-title">
          {MONTH_NAMES[display.m]} {display.y}
        </strong>
        <button
          type="button"
          className="cal-nav"
          onClick={() => move(1)}
          disabled={atMaxMonth}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="cal-weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w} className="cal-weekday">{w}</span>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map(({ ds, day, inMonth }) => {
          const status = statusByDate[ds]
          const isPast = ds < minDate
          const isBeyond = ds > maxDate
          const clickable = !isPast && !isBeyond && status === 'free'
          const classes = [
            'cal-day',
            inMonth ? '' : 'outside',
            isPast || isBeyond ? 'off' : status || '',
            ds === value ? 'selected' : '',
            clickable ? 'clickable' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={ds}
              type="button"
              className={classes}
              disabled={!clickable}
              onClick={() => onSelect(ds)}
            >
              {day}
              {ds === minDate && <i className="today-dot" />}
            </button>
          )
        })}
      </div>

      {loading && <p className="muted small">Actualizando disponibilidad…</p>}

      <div className="cal-legend">
        <span className="cal-legend-item"><i className="dot free" />Con turnos</span>
        <span className="cal-legend-item"><i className="dot full" />Día lleno</span>
        <span className="cal-legend-item"><i className="dot closed" />No se atiende</span>
      </div>
    </div>
  )
}