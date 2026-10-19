import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import mongoose from 'mongoose'
import Booking from './models/Booking.js'
import BookingLock from './models/BookingLock.js'
import Setting from './models/Setting.js'

const app = express()
app.use(cors())
app.use(express.json())

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'turno-admin-token'
const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@turnobarberya.com').trim().toLowerCase()
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234'

let dbConnection
export function connectDB() {
  if (!dbConnection) {
    dbConnection = mongoose.connect(process.env.MONGODB_URI)
  }
  return dbConnection
}

function defaultSettings() {
  const days = Array.from({ length: 7 }, (_, day) => ({
    day,
    enabled: day !== 0,
    open: '09:00',
    close: '20:00',
  }))
  return {
    barberName: 'Barbería TurnoBarberYa',
    message: 'Reservá tu turno online sin esperas.',
    services: [
      { name: 'Corte de cabello', price: 5000, duration: 30 },
      { name: 'Barba', price: 3000, duration: 20 },
      { name: 'Corte y barba', price: 7000, duration: 40 },
    ],
    days,
    slotMinutes: 30,
    cantidadBarberos: 1,
    adminEmail: DEFAULT_ADMIN_EMAIL,
    adminPasswordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    pin: DEFAULT_ADMIN_PASSWORD,
    unavailableDates: [],
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derivedKey}`
}

function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string') return false
  const [salt, expectedHex] = storedHash.split(':')
  if (!salt || !expectedHex || !/^[a-f0-9]+$/i.test(expectedHex)) return false
  const actual = crypto.scryptSync(password, salt, expectedHex.length / 2)
  const expected = Buffer.from(expectedHex, 'hex')
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

function publicSettings(settings) {
  const data = settings.toObject()
  delete data.adminPasswordHash
  delete data.pin
  data.adminPassword = ''
  return data
}

async function getSettings() {
  let doc = await Setting.findOne()
  if (!doc) {
    doc = await Setting.create(defaultSettings())
  } else {
    let changed = false
    if (!doc.adminEmail) {
      doc.adminEmail = DEFAULT_ADMIN_EMAIL
      changed = true
    }
    if (!doc.adminPasswordHash) {
      doc.adminPasswordHash = hashPassword(doc.pin || DEFAULT_ADMIN_PASSWORD)
      changed = true
    }
    if (!Number.isFinite(doc.cantidadBarberos) || doc.cantidadBarberos < 1) {
      doc.cantidadBarberos = 1
      changed = true
    }
    if (changed) await doc.save()
  }
  return doc
}

function normalizeDate(date) {
  if (typeof date !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return null
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`)
  if (
    Number.isNaN(d.getTime()) ||
    d.getFullYear() !== +m[1] ||
    d.getMonth() !== +m[2] - 1 ||
    d.getDate() !== +m[3]
  ) {
    return null
  }
  return date
}

function localDateStr(date) {
  const y = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${month}-${day}`
}

function toMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function toTime(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const m = String(totalMinutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

function createManageToken() {
  const token = crypto.randomBytes(24).toString('hex')
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  return { token, hash }
}

function publicBooking(booking) {
  const result = booking.toObject()
  delete result.manageTokenHash
  return {
    ...result,
    address: 'Te esperamos en el local',
  }
}

function slotsBetween(open, close, step) {
  const slots = []
  const start = toMinutes(open)
  const end = toMinutes(close)
  for (let t = start; t < end; t += step) {
    slots.push(toTime(t))
  }
  return slots
}

function bookingCapacity(settings) {
  return Math.max(1, Math.round(Number(settings.cantidadBarberos) || 1))
}

function overlaps(startA, durA, startB, durB) {
  return startA < startB + durB && startB < startA + durA
}

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  next()
}

app.get('/api/availability', async (req, res) => {
  try {
    const date = normalizeDate(req.query.date || '')
    if (!date) return res.status(400).json({ error: 'Fecha inválida' })

    const settings = await getSettings()
    const today = localDateStr(new Date())
    const weekday = new Date(`${date}T00:00:00`).getDay()
    const dayCfg = settings.days.find((x) => x.day === weekday)
    const isUnavailable = settings.unavailableDates.includes(date)
    const canAttend = !isUnavailable && dayCfg && dayCfg.enabled && date >= today

    let slots = []
    if (canAttend) {
      const serviceName = req.query.service || ''
      const service = settings.services.find((s) => s.name === serviceName)
      const duration = service ? service.duration : settings.slotMinutes
      const sillas = bookingCapacity(settings)
      const openings = await Booking.find({ date, status: { $ne: 'cancelled' } })
      const now = new Date()
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      const isToday = date === today
      slots = slotsBetween(dayCfg.open, dayCfg.close, settings.slotMinutes).map((time) => {
        const start = toMinutes(time)
        const past = isToday && start <= nowMinutes
        const ocupadas = openings.filter((b) =>
          overlaps(start, duration, toMinutes(b.time), b.duration)
        ).length
        const free = !past && ocupadas < sillas
        return { time, free, ocupadas, sillas }
      })
    }

    res.json({
      barberName: settings.barberName,
      message: settings.message,
      services: settings.services,
      date,
      slots,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.get('/api/month', async (req, res) => {
  try {
    const from = normalizeDate(req.query.from || '')
    if (!from) return res.status(400).json({ error: 'Fecha inválida' })

    const settings = await getSettings()
    const serviceName = req.query.service || ''
    const service = settings.services.find((s) => s.name === serviceName)
    const duration = service ? service.duration : settings.slotMinutes
    const sillas = bookingCapacity(settings)
    const today = localDateStr(new Date())

    const toDate = new Date(`${from}T00:00:00`)
    toDate.setDate(toDate.getDate() + 41)
    const to = localDateStr(toDate)

    const openings = await Booking.find({
      date: { $gte: from, $lte: to },
      status: { $ne: 'cancelled' },
    })
    const byDate = {}
    for (const b of openings) {
      ;(byDate[b.date] ||= []).push(b)
    }

    const days = []
    const cursor = new Date(`${from}T00:00:00`)
    for (let i = 0; i < 42; i++) {
      const date = localDateStr(cursor)
      let status
      if (date < today) {
        status = 'past'
      } else {
        const weekday = cursor.getDay()
        const dayCfg = settings.days.find((x) => x.day === weekday)
        const blocked = settings.unavailableDates.includes(date)
        if (!dayCfg || !dayCfg.enabled || blocked) {
          status = 'closed'
        } else {
          const dayBookings = byDate[date] || []
          const free = slotsBetween(
            dayCfg.open,
            dayCfg.close,
            settings.slotMinutes
          ).some((time) => {
            const start = toMinutes(time)
            const ocupadas = dayBookings.filter((b) =>
              overlaps(start, duration, toMinutes(b.time), b.duration)
            ).length
            return ocupadas < sillas
          })
          status = free ? 'free' : 'full'
        }
      }
      days.push({ date, status })
      cursor.setDate(cursor.getDate() + 1)
    }

    res.json({ days })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.post('/api/bookings', async (req, res) => {
  try {
    const { name, phone, service, date, time } = req.body || {}
    if (!name || !phone || !service || !date || !time) {
      return res.status(400).json({ error: 'Completá todos los datos' })
    }
    const d = normalizeDate(date)
    if (!d) return res.status(400).json({ error: 'Fecha inválida' })
    if (!/^\d{2}:\d{2}$/.test(time)) return res.status(400).json({ error: 'Hora inválida' })

    const settings = await getSettings()
    const serviceCfg = settings.services.find((s) => s.name === service)
    if (!serviceCfg) return res.status(400).json({ error: 'Servicio inválido' })

    const today = localDateStr(new Date())
    if (d < today) return res.status(400).json({ error: 'No se puede reservar para una fecha pasada' })

    const weekday = new Date(`${d}T00:00:00`).getDay()
    const dayCfg = settings.days.find((x) => x.day === weekday)
    if (!dayCfg || !dayCfg.enabled) {
      return res.status(400).json({ error: 'Ese día no se atiende' })
    }
    if (settings.unavailableDates.includes(d)) {
      return res.status(400).json({ error: 'Ese día está bloqueado' })
    }

    const start = toMinutes(time)
    const end = start + serviceCfg.duration
    if (start < toMinutes(dayCfg.open) || end > toMinutes(dayCfg.close)) {
      return res.status(400).json({ error: 'Hora fuera del horario de atención' })
    }

    const manageToken = createManageToken()
    const session = await mongoose.startSession()
    let booking
    try {
      await session.withTransaction(async () => {
        // Serializa reservas del mismo día para evitar sobreventa con solicitudes simultáneas.
        await BookingLock.findOneAndUpdate(
          { date: d },
          { $setOnInsert: { date: d } },
          { upsert: true, new: true, session }
        )
        const openings = await Booking.find({ date: d, status: { $ne: 'cancelled' } }).session(session)
        const sillas = bookingCapacity(settings)
        const ocupadas = openings.filter((b) =>
          overlaps(start, serviceCfg.duration, toMinutes(b.time), b.duration)
        ).length
        if (ocupadas >= sillas) {
          const error = new Error('Ese horario está lleno en todas las sillas, elegí otro.')
          error.code = 'BOOKING_CAPACITY'
          throw error
        }

        const created = await Booking.create([{
          name: name.trim(),
          phone: phone.trim(),
          service,
          duration: serviceCfg.duration,
          price: serviceCfg.price,
          date: d,
          time,
          status: 'pending',
          manageTokenHash: manageToken.hash,
        }], { session })
        booking = created[0]
      })
    } catch (err) {
      if (err?.code === 'BOOKING_CAPACITY') {
        return res.status(409).json({ error: err.message })
      }
      throw err
    } finally {
      await session.endSession()
    }
    res.status(201).json({
      ...publicBooking(booking),
      manageToken: manageToken.token,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.get('/api/bookings/manage/:token', async (req, res) => {
  try {
    const token = typeof req.params.token === 'string' ? req.params.token : ''
    if (!/^[a-f0-9]{48}$/i.test(token)) {
      return res.status(404).json({ error: 'Turno no encontrado' })
    }
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    const booking = await Booking.findOne({ manageTokenHash: hash })
    if (!booking) return res.status(404).json({ error: 'Turno no encontrado' })
    res.json(publicBooking(booking))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.delete('/api/bookings/manage/:token', async (req, res) => {
  try {
    const token = typeof req.params.token === 'string' ? req.params.token : ''
    if (!/^[a-f0-9]{48}$/i.test(token)) {
      return res.status(404).json({ error: 'Turno no encontrado' })
    }
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    const booking = await Booking.findOne({ manageTokenHash: hash })
    if (!booking) return res.status(404).json({ error: 'Turno no encontrado' })
    if (booking.status === 'cancelled') {
      return res.json(publicBooking(booking))
    }
    if (booking.status === 'done') {
      return res.status(409).json({ error: 'No se puede cancelar un turno completado' })
    }
    booking.status = 'cancelled'
    await booking.save()
    res.json(publicBooking(booking))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.post('/api/admin/login', async (req, res) => {
  try {
    const settings = await getSettings()
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (email === settings.adminEmail && verifyPassword(password, settings.adminPasswordHash)) {
      return res.json({ token: ADMIN_TOKEN })
    }
    return res.status(401).json({ error: 'Email o contraseña incorrectos' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.get('/api/admin/bookings', auth, async (req, res) => {
  try {
    const filter = {}
    const { date, status } = req.query
    if (date) {
      const d = normalizeDate(date)
      if (!d) return res.status(400).json({ error: 'Fecha inválida' })
      filter.date = d
    }
    if (status && ['pending', 'confirmed', 'cancelled', 'done'].includes(status)) {
      filter.status = status
    }
    const bookings = await Booking.find(filter).select('-manageTokenHash').sort({ date: 1, time: 1 })
    res.json(bookings)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.patch('/api/admin/bookings/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' })
    }
    const { status } = req.body || {}
    if (!['pending', 'confirmed', 'cancelled', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' })
    }
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!booking) return res.status(404).json({ error: 'Turno no encontrado' })
    res.json(booking)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.delete('/api/admin/bookings/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' })
    }
    const booking = await Booking.findByIdAndDelete(req.params.id)
    if (!booking) return res.status(404).json({ error: 'Turno no encontrado' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.get('/api/admin/settings', auth, async (_req, res) => {
  try {
    res.json(publicSettings(await getSettings()))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.put('/api/admin/settings', auth, async (req, res) => {
  try {
    const current = await getSettings()
    const body = req.body || {}

    if (typeof body.barberName === 'string' && body.barberName.trim()) {
      current.barberName = body.barberName.trim().slice(0, 60)
    }
    if (typeof body.message === 'string') {
      current.message = body.message.trim().slice(0, 200)
    }
    if (Array.isArray(body.services)) {
      current.services = body.services
        .filter((s) => s && typeof s.name === 'string' && s.name.trim())
        .map((s) => ({
          name: s.name.trim().slice(0, 60),
          price: Number(s.price) || 0,
          duration: Math.min(Math.max(Number(s.duration) || 30, 5), 480),
        }))
    }
    if (Array.isArray(body.days) && body.days.length === 7) {
      current.days = body.days.map((d, i) => ({
        day: i,
        enabled: Boolean(d.enabled),
        open: typeof d.open === 'string' && /^\d{2}:\d{2}$/.test(d.open) ? d.open : '09:00',
        close: typeof d.close === 'string' && /^\d{2}:\d{2}$/.test(d.close) ? d.close : '20:00',
      }))
    }
    if (typeof body.slotMinutes === 'number') {
      current.slotMinutes = Math.min(Math.max(Math.round(body.slotMinutes), 10), 120)
    }
    if (typeof body.cantidadBarberos === 'number') {
      current.cantidadBarberos = Math.max(1, Math.round(body.cantidadBarberos))
    }
    if (typeof body.adminEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.adminEmail.trim())) {
      current.adminEmail = body.adminEmail.trim().toLowerCase().slice(0, 120)
    }
    if (typeof body.adminPassword === 'string' && body.adminPassword.trim()) {
      if (body.adminPassword.trim().length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
      }
      current.adminPasswordHash = hashPassword(body.adminPassword.trim())
    }
    if (Array.isArray(body.unavailableDates)) {
      current.unavailableDates = [...new Set(body.unavailableDates.filter((x) => normalizeDate(x)))]
    }

    await current.save()
    res.json(publicSettings(current))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

export { app }
