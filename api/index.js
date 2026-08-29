import { app, connectDB } from '../server/app.js'

let db

export default function handler(req, res) {
  connect()
    .then(() => app(req, res))
    .catch((err) => {
      console.error(err)
      if (!res.headersSent) res.status(500).json({ error: 'Error del servidor' })
    })
}

function connect() {
  if (!db) {
    db = connectDB().catch((e) => {
      db = null
      throw e
    })
  }
  return db
}