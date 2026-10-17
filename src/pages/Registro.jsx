import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Registro.css'

function Registro() {
  const navigate = useNavigate()
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const nombre = nombreCompleto.trim()
    const correo = email.trim()

    if (!nombre) {
      setError('El nombre completo es obligatorio.')
      return
    }

    if (!correo) {
      setError('El correo electrónico es obligatorio.')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setEnviando(true)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: correo,
        password,
        options: {
          data: {
            nombre,
            role: 'nutricionista',
          },
        },
      })

      if (signUpError) {
        setError(mensajeDeError(signUpError.message))
        return
      }

      navigate('/panel')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar el registro. Inténtalo de nuevo.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="registro">
      <section className="registro-formulario">
        <form className="registro-card" onSubmit={handleSubmit} noValidate>
          <span className="logo registro-logo">ñam</span>

          <div>
            <h1 className="registro-titulo">Crea tu cuenta de nutricionista</h1>
            <p className="registro-subtitulo">
              Planifica dietas y sigue el IMC de tus pacientes en un solo lugar.
            </p>
          </div>

          {error ? (
            <p className="registro-error" role="alert">
              {error}
            </p>
          ) : null}

          <label className="registro-campo">
            Nombre completo
            <input
              type="text"
              name="nombreCompleto"
              autoComplete="name"
              value={nombreCompleto}
              onChange={(event) => setNombreCompleto(event.target.value)}
              disabled={enviando}
            />
          </label>

          <label className="registro-campo">
            Correo electrónico
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={enviando}
            />
          </label>

          <label className="registro-campo">
            Contraseña
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={enviando}
            />
          </label>

          <label className="registro-campo">
            Confirmar contraseña
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={enviando}
            />
          </label>

          <button className="registro-boton" type="submit" disabled={enviando}>
            {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>

          <p className="registro-subtitulo">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
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

function mensajeDeError(mensaje) {
  const texto = mensaje.toLowerCase()

  if (texto.includes('already registered') || texto.includes('already been registered')) {
    return 'Este correo ya está registrado.'
  }

  if (texto.includes('database error') || texto.includes('no autorizado')) {
    return 'No se pudo crear la cuenta. Verifica que tu correo esté autorizado.'
  }

  if (texto.includes('rate limit')) {
    return 'Se enviaron demasiados correos. Espera un momento e inténtalo de nuevo.'
  }

  if (texto.includes('invalid email') || texto.includes('email address')) {
    return 'El correo electrónico no es válido.'
  }

  if (texto.includes('password')) {
    return 'La contraseña no cumple los requisitos de seguridad.'
  }

  if (texto.includes('failed to fetch') || texto.includes('network')) {
    return 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.'
  }

  return mensaje || 'No se pudo completar el registro. Inténtalo de nuevo.'
}

export default Registro