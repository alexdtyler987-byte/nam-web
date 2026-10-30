import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { calcularIMC, fechaHoy } from './utilidades'
import SelectorCIE10 from './SelectorCIE10'
import { textoCIE10 } from './cie10'

const VACIO = {
  nombre: '',
  dni: '',
  password: '',
  sexo: '',
  fechaNacimiento: '',
  peso: '',
  altura: '',
  cintura: '',
  cadera: '',
  pesoIdeal: '',
  historial: '',
  plan: '',
}

function NuevoPaciente({ onCerrar, onCreado }) {
  const [form, setForm] = useState(VACIO)
  const [diagPrincipal, setDiagPrincipal] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  async function enviar(event) {
    event.preventDefault()
    setError('')

    const nombre = form.nombre.trim()
    const dni = form.dni.trim()

    if (!nombre) {
      setError('El nombre es obligatorio.')
      return
    }

    if (!/^\d{8}$/.test(dni)) {
      setError('El DNI debe tener exactamente 8 números.')
      return
    }

    if (form.password.length < 6) {
      setError('La contraseña inicial debe tener al menos 6 caracteres.')
      return
    }

    setGuardando(true)

    const { data, error: fnError } = await supabase.functions.invoke('crear-paciente', {
      body: {
        nombre,
        dni,
        password: form.password,
        sexo: form.sexo || null,
        fechaNacimiento: form.fechaNacimiento || null,
        peso: form.peso.trim() || null,
        altura: form.altura.trim() || null,
        cintura: form.cintura.trim() || null,
        cadera: form.cadera.trim() || null,
        pesoIdeal: form.pesoIdeal.trim() || null,
        historial: form.historial.trim() || null,
        // Se sigue enviando como texto (ej. "E66 · Obesidad") para que la app móvil lo muestre.
        diagnostico: textoCIE10(diagPrincipal),
        plan: form.plan.trim() || null,
        imc: calcularIMC(form.peso, form.altura),
      },
    })

    setGuardando(false)

    if (fnError) {
      let mensaje = fnError.message
      try {
        const cuerpo = await fnError.context.json()
        if (cuerpo?.error) mensaje = cuerpo.error
      } catch {
        // se queda con el mensaje genérico
      }
      setError(mensaje)
      return
    }

    if (data?.error) {
      setError(data.error)
      return
    }

    const pesoNum = Number(form.peso)
    const alturaNum = Number(form.altura)

    if (pesoNum > 0 && alturaNum > 0) {
      const { error: errorHistorial } = await supabase.from('HISTORIAL-MEDIDAS').upsert(
        {
          paciente_id: data.paciente.id,
          fecha: fechaHoy(),
          peso: pesoNum,
          altura: alturaNum,
          imc: calcularIMC(form.peso, form.altura),
          cintura: form.cintura.trim() === '' ? null : Number(form.cintura),
          cadera: form.cadera.trim() === '' ? null : Number(form.cadera),
        },
        { onConflict: 'paciente_id,fecha' },
      )

      if (errorHistorial) console.error('Historial inicial:', errorHistorial.message)
    }

    if (diagPrincipal) {
      const { error: errorDiag } = await supabase.from('DIAGNOSTICOS-PACIENTE').insert({
        paciente_id: data.paciente.id,
        codigo: diagPrincipal.codigo,
        tipo: 'principal',
      })

      if (errorDiag) console.error('Diagnóstico inicial:', errorDiag.message)
    }

    onCreado(data.paciente)
  }

  return (
    <div className="modal-fondo">
      <form className="modal" onSubmit={enviar} noValidate>
        <h2>Nuevo paciente</h2>

        {error ? (
          <p className="registro-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="form-grid">
          <label className="campo">
            Nombre completo *
            <input type="text" value={form.nombre} onChange={(e) => cambiar('nombre', e.target.value)} disabled={guardando} />
          </label>

          <label className="campo">
            DNI (8 dígitos) *
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={form.dni}
              onChange={(e) => cambiar('dni', e.target.value.replace(/\D/g, ''))}
              disabled={guardando}
            />
          </label>

          <label className="campo">
            Contraseña inicial *
            <input type="text" value={form.password} onChange={(e) => cambiar('password', e.target.value)} disabled={guardando} />
          </label>

          <label className="campo">
            Sexo
            <select value={form.sexo} onChange={(e) => cambiar('sexo', e.target.value)} disabled={guardando}>
              <option value="">Sin especificar</option>
              <option value="Mujer">Mujer</option>
              <option value="Hombre">Hombre</option>
            </select>
          </label>

          <label className="campo">
            Fecha de nacimiento
            <input type="date" value={form.fechaNacimiento} onChange={(e) => cambiar('fechaNacimiento', e.target.value)} disabled={guardando} />
          </label>

          <label className="campo">
            Peso (kg)
            <input type="number" step="0.1" value={form.peso} onChange={(e) => cambiar('peso', e.target.value)} disabled={guardando} />
          </label>

          <label className="campo">
            Talla (m)
            <input type="number" step="0.01" value={form.altura} onChange={(e) => cambiar('altura', e.target.value)} disabled={guardando} />
          </label>

          <label className="campo">
            Cintura (cm)
            <input type="number" step="0.1" value={form.cintura} onChange={(e) => cambiar('cintura', e.target.value)} disabled={guardando} />
          </label>

          <label className="campo">
            Cadera (cm)
            <input type="number" step="0.1" value={form.cadera} onChange={(e) => cambiar('cadera', e.target.value)} disabled={guardando} />
          </label>

          <label className="campo">
            Peso ideal (kg)
            <input type="number" step="0.1" value={form.pesoIdeal} onChange={(e) => cambiar('pesoIdeal', e.target.value)} disabled={guardando} />
          </label>

          <label className="campo">
            Plan recomendado
            <input type="text" value={form.plan} onChange={(e) => cambiar('plan', e.target.value)} disabled={guardando} />
          </label>
        </div>

        <div className="campo" style={{ marginTop: '12px' }}>
          <span>Diagnóstico principal (CIE-10)</span>
          <SelectorCIE10 value={diagPrincipal} onChange={setDiagPrincipal} disabled={guardando} />
        </div>

        <label className="campo" style={{ marginTop: '12px' }}>
          Historial
          <textarea rows={3} value={form.historial} onChange={(e) => cambiar('historial', e.target.value)} disabled={guardando} />
        </label>

        <div className="modal-acciones">
          <button type="button" className="btn-secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="registro-boton" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar paciente'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NuevoPaciente