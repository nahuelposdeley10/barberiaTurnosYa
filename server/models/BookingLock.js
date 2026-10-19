import mongoose from 'mongoose'

const bookingLockSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
)

export default mongoose.model('BookingLock', bookingLockSchema)
