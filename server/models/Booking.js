import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    service: { type: String, required: true },
    duration: { type: Number, required: true },
    price: { type: Number, default: 0 },
    date: { type: String, required: true },
    time: { type: String, required: true },
    manageTokenHash: { type: String, default: '', index: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'done'],
      default: 'pending',
    },
  },
  { timestamps: true }
)

export default mongoose.model('Booking', bookingSchema)
