import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Registro.css'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setEnviando(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setEnviando(false)

    if (loginError) {
      setError('Correo o contraseña incorrectos.')
      return
    }

    navigate('/panel')
  }

  return (
    <main className="registro">
      <form className="registro-card" onSubmit={handleSubmit} noValidate>
        <h1 className="registro-titulo">Iniciar sesión</h1>
        <p className="registro-subtitulo">Accede a tu panel de nutricionista.</p>

        {error ? <p className="registro-error" role="alert">{error}</p> : null}

        <label className="registro-campo">
          Correo electrónico
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={enviando}
          />
        </label>

        <label className="registro-campo">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={enviando}
          />
        </label>

        <button className="registro-boton" type="submit" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>
    </main>
  )
}

export default Login