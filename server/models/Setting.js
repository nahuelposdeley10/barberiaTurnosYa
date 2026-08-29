import mongoose from 'mongoose'

const daySchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    enabled: { type: Boolean, default: true },
    open: { type: String, default: '09:00' },
    close: { type: String, default: '20:00' },
  },
  { _id: false }
)

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    duration: { type: Number, default: 30 },
  },
  { _id: false }
)

const settingSchema = new mongoose.Schema({
  barberName: { type: String, default: 'Barbería' },
  message: { type: String, default: 'Reservá tu turno online' },
  services: { type: [serviceSchema], default: [] },
  days: { type: [daySchema], default: [] },
  slotMinutes: { type: Number, default: 30 },
  pin: { type: String, default: '1234' },
  unavailableDates: { type: [String], default: [] },
})

export default mongoose.model('Setting', settingSchema)