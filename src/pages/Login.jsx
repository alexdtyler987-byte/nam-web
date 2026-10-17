import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
      if (loginError.message.toLowerCase().includes('not confirmed')) {
        setError('Debes confirmar tu correo antes de ingresar.')
      } else {
        setError('Correo o contraseña incorrectos.')
      }
      return
    }

    navigate('/panel')
  }

  return (
    <main className="registro">
      <section className="registro-formulario">
        <form className="registro-card" onSubmit={handleSubmit} noValidate>
          <span className="logo registro-logo">ñam</span>

          <div>
            <h1 className="registro-titulo">Bienvenido, Doctor(a)</h1>
            <p className="registro-subtitulo">Inicia sesión para ver a tus pacientes.</p>
          </div>

          {error ? (
            <p className="registro-error" role="alert">
              {error}
            </p>
          ) : null}

          <label className="registro-campo">
            Correo electrónico
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={enviando}
            />
          </label>

          <label className="registro-campo">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={enviando}
            />
          </label>

          <button className="registro-boton" type="submit" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Iniciar sesión'}
          </button>

          <p className="registro-subtitulo">
            ¿Aún no tienes cuenta? <Link to="/">Regístrate aquí</Link>
          </p>
        </form>
      </section>

      <aside className="registro-visual" aria-hidden="true">
        <span className="blob blob-rosa" />
        <span className="blob blob-amarillo" />
        <span className="blob blob-naranja" />
        <span className="blob blob-celeste" />
        <span className="blob blob-verde" />
        <p className="registro-burbuja">Comer bien, vivir mejor</p>
      </aside>
    </main>
  )
}

export default Login