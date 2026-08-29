import 'dotenv/config'
import { app, connectDB } from './app.js'

const PORT = process.env.PORT || 3001

connectDB()
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => {
    console.error('Error conectando a MongoDB:', err.message)
    process.exit(1)
  })

app.listen(PORT, () => console.log(`API de turnos escuchando en http://localhost:${PORT}`))