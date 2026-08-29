import { useState } from 'react'
import './App.css'
import BookingPage from './components/BookingPage'
import AdminLogin from './components/AdminLogin'
import AdminPage from './components/AdminPage'

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('tby_token') || '')
  const [view, setView] = useState('booking')

  function handleLogin(t) {
    localStorage.setItem('tby_token', t)
    setToken(t)
    setView('admin')
  }

  function handleLogout() {
    localStorage.removeItem('tby_token')
    setToken('')
    setView('booking')
  }

  return (
    <div className="app">
      {view === 'admin' && !token && (
        <AdminLogin onLogin={handleLogin} onBack={() => setView('booking')} />
      )}
      {view === 'admin' && token && <AdminPage token={token} onLogout={handleLogout} />}
      {view !== 'admin' && <BookingPage onAdmin={() => setView('admin')} />}
    </div>
  )
}

export default App