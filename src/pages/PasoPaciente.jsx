import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { fechaHoy } from './utilidades'
import { fechaLarga } from './fechasConsulta'
import { generarContrasena } from './credenciales'

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

// Paso 1: datos de registro y creación de la cuenta del paciente en la app.
// - paciente: si ya está creado, se muestra un resumen (no se puede crear dos veces)
// - credencial: { dni, password } de la cuenta recién creada (solo se conoce en esta sesión)
// - pacientesExistentes: lista opcional para avisar de un DNI repetido antes de llamar al servidor
// - onCreado(paciente, credencial): la cuenta se creó bien
// - onSiguiente(): continuar al paso 2
// - onSucio(bool): avisa si hay datos escritos (para confirmar antes de cerrar)
function PasoPaciente({ paciente, credencial, pacientesExistentes = [], onCreado, onSiguiente, onSucio }) {
  const [form, setForm] = useState({ nombre: '', dni: '', sexo: '', fechaNacimiento: '' })
  const [password, setPassword] = useState(() => generarContrasena())
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState('')

  useEffect(() => {
    if (onSucio) onSucio(Boolean(form.nombre || form.dni || form.sexo || form.fechaNacimiento))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  async function alCopiar(texto, etiqueta) {
    const ok = await copiar(texto)
    setCopiado(ok ? etiqueta : '')
    if (ok) setTimeout(() => setCopiado(''), 2500)
  }

  async function enviar(event) {
    event.preventDefault()
    setError('')

    const nombre = form.nombre.trim()
    const dni = form.dni.trim()

    if (!nombre) return setError('El nombre es obligatorio.')
    if (!/^\d{8}$/.test(dni)) return setError('El DNI debe tener exactamente 8 números.')
    if (pacientesExistentes.some((p) => String(p.DNI) === dni)) {
      return setError('Ya tienes un paciente registrado con ese DNI.')
    }
    if (!form.sexo) return setError('Elige el sexo del paciente: se necesita para calcular el gasto energético.')
    if (!form.fechaNacimiento) {
      return setError('La fecha de nacimiento es obligatoria: se necesita para calcular la edad y el gasto energético.')
    }
    if (form.fechaNacimiento > fechaHoy()) return setError('La fecha de nacimiento no puede ser futura.')
    if (password.length < 6) return setError('La contraseña inicial debe tener al menos 6 caracteres.')

    setEnviando(true)

    const { data, error: fnError } = await supabase.functions.invoke('crear-paciente', {
      body: { nombre, dni, password, sexo: form.sexo, fechaNacimiento: form.fechaNacimiento },
    })

    setEnviando(false)

    if (fnError) {
      let mensaje = fnError.message
      try {
        const cuerpo = await fnError.context.json()
        if (cuerpo?.error) mensaje = cuerpo.error
      } catch {
        // se queda con el mensaje genérico
      }
      return setError(mensaje)
    }

    if (data?.error) return setError(data.error)
    if (!data?.paciente) return setError('No se pudo crear al paciente. Inténtalo de nuevo.')

    onCreado(data.paciente, { dni, password })
  }

  // ---------- Paciente ya creado: resumen ----------
  if (paciente) {
    return (
      <div className="asistente-form">
        <p className="asistente-ok" role="status">
          La cuenta del paciente ya está creada.
        </p>

        <dl className="asistente-resumen">
          <div>
            <dt>Paciente</dt>
            <dd>{paciente.Nombre}</dd>
          </div>
          <div>
            <dt>DNI</dt>
            <dd>{paciente.DNI}</dd>
          </div>
          <div>
            <dt>Sexo</dt>
            <dd>{paciente.sexo || '—'}</dd>
          </div>
          <div>
            <dt>Fecha de nacimiento</dt>
            <dd>{paciente.fecha_nacimiento ? fechaLarga(paciente.fecha_nacimiento) : '—'}</dd>
          </div>
        </dl>

        {credencial ? (
          <div className="credencial" role="status">
            <strong>Entrega estos datos al paciente para que ingrese a la app</strong>
            <p>
              Usuario: <code>{credencial.dni}</code> · Contraseña inicial: <code>{credencial.password}</code>
            </p>
            <p className="credencial-aviso">Anótala ahora: la contraseña no se puede volver a ver después.</p>
            <button
              type="button"
              className="btn-secundario"
              onClick={() => alCopiar(`DNI: ${credencial.dni}\nContraseña: ${credencial.password}`, 'datos')}
            >
              {copiado === 'datos' ? 'Copiado' : 'Copiar datos'}
            </button>
          </div>
        ) : null}

        <div className="asistente-acciones">
          <span className="asistente-acciones-espacio" />
          <button type="button" className="registro-boton" onClick={onSiguiente}>
            Continuar
          </button>
        </div>
      </div>
    )
  }

  // ---------- Formulario de registro ----------
  return (
    <form className="asistente-form" onSubmit={enviar} noValidate>
      <p className="asistente-ayuda">
        Estos son los datos para crear la cuenta del paciente. El diagnóstico, el plan y el resto de la consulta se
        registran en los pasos siguientes, cuando ya se haya evaluado al paciente.
      </p>

      {error ? (
        <p className="registro-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="form-grid">
        <label className="campo campo-ancho">
          Nombre completo *
          <input
            type="text"
            autoComplete="off"
            value={form.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
            disabled={enviando}
          />
        </label>

        <label className="campo">
          DNI (8 dígitos) *
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            autoComplete="off"
            value={form.dni}
            onChange={(e) => cambiar('dni', e.target.value.replace(/\D/g, ''))}
            disabled={enviando}
          />
        </label>

        <label className="campo">
          Sexo *
          <select value={form.sexo} onChange={(e) => cambiar('sexo', e.target.value)} disabled={enviando}>
            <option value="">Elige una opción</option>
            <option value="Mujer">Mujer</option>
            <option value="Hombre">Hombre</option>
          </select>
        </label>

        <label className="campo">
          Fecha de nacimiento *
          <input
            type="date"
            max={fechaHoy()}
            value={form.fechaNacimiento}
            onChange={(e) => cambiar('fechaNacimiento', e.target.value)}
            disabled={enviando}
          />
        </label>
      </div>

      <div className="clave-bloque">
        <label className="campo">
          Contraseña inicial *
          <input
            type="text"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={enviando}
          />
        </label>
        <button type="button" className="btn-secundario" onClick={() => setPassword(generarContrasena())} disabled={enviando}>
          Generar otra
        </button>
        <button type="button" className="btn-secundario" onClick={() => alCopiar(password, 'clave')} disabled={enviando}>
          {copiado === 'clave' ? 'Copiada' : 'Copiar'}
        </button>
      </div>
      <p className="asistente-ayuda">
        El paciente entrará a la app con su DNI y esta contraseña. Se sugiere una fácil de dictar; puedes cambiarla.
      </p>

      <div className="asistente-acciones">
        <span className="asistente-acciones-espacio" />
        <button type="submit" className="registro-boton" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : 'Crear cuenta y continuar'}
        </button>
      </div>
    </form>
  )
}

export default PasoPaciente