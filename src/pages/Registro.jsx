import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
      <form className="registro-card" onSubmit={handleSubmit} noValidate>
        <h1 className="registro-titulo">Registro de nutricionistas</h1>
        <p className="registro-subtitulo">
          Crea tu cuenta para acceder al panel.
        </p>

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
      </form>
    </main>
  )
}

function mensajeDeError(mensaje) {
  const texto = mensaje.toLowerCase()

  if (texto.includes('already registered') || texto.includes('already been registered')) {
    return 'Este correo ya está registrado.'
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
