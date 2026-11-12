import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabaseClient'
import { fechaHoy, nombrePaciente } from './utilidades'
import './Pestanas.css'
import './Consultas.css'

const CAMPOS_TEXTO = ['motivo', 'valoracion', 'intervencion', 'acuerdos']

function valoresIniciales(consulta, tipoSugerido) {
  return {
    fecha: consulta?.fecha ?? fechaHoy(),
    tipo: consulta?.tipo ?? tipoSugerido,
    motivo: consulta?.motivo ?? '',
    valoracion: consulta?.valoracion ?? '',
    intervencion: consulta?.intervencion ?? '',
    acuerdos: consulta?.acuerdos ?? '',
    proximaCita: consulta?.proxima_cita ?? '',
  }
}

// Ventana para registrar una consulta nueva o editar una existente.
// - consulta: la consulta a editar (null para una nueva)
// - tipoSugerido: 'primera' si el paciente aún no tiene consultas, si no 'control'
// - onGuardada(): se llama al guardar bien
// - onCerrar(): cerrar la ventana
function FormularioConsulta({ paciente, consulta, tipoSugerido, onGuardada, onCerrar }) {
  const [inicial] = useState(() => valoresIniciales(consulta, tipoSugerido))
  const [form, setForm] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const cajaRef = useRef(null)
  const primerCampoRef = useRef(null)

  const hayCambios = Object.keys(inicial).some((k) => form[k] !== inicial[k])

  useEffect(() => {
    primerCampoRef.current?.focus()
  }, [])

  useEffect(() => {
    function alTeclear(event) {
      if (event.key === 'Escape' && !guardando) onCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [guardando, onCerrar])

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  function atraparTab(event) {
    if (event.key !== 'Tab' || !cajaRef.current) return
    const enfocables = Array.from(
      cajaRef.current.querySelectorAll('input, select, textarea, button'),
    ).filter((el) => !el.disabled)
    if (enfocables.length === 0) return

    const primero = enfocables[0]
    const ultimo = enfocables[enfocables.length - 1]
    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault()
      ultimo.focus()
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault()
      primero.focus()
    }
  }

  function alPresionarFondo(event) {
    if (event.target === event.currentTarget && !hayCambios && !guardando) onCerrar()
  }

  async function guardar(event) {
    event.preventDefault()
    setError('')

    if (!form.fecha) {
      setError('La fecha de la consulta es obligatoria.')
      return
    }
    if (form.fecha > fechaHoy()) {
      setError('La fecha de la consulta no puede ser futura.')
      return
    }
    if (!CAMPOS_TEXTO.some((campo) => form[campo].trim())) {
      setError('Escribe al menos una nota de la consulta (motivo, valoración, intervención o acuerdos).')
      return
    }
    if (form.proximaCita && form.proximaCita < form.fecha) {
      setError('El próximo control no puede ser anterior a la fecha de la consulta.')
      return
    }

    const datos = {
      fecha: form.fecha,
      tipo: form.tipo,
      motivo: form.motivo.trim() || null,
      valoracion: form.valoracion.trim() || null,
      intervencion: form.intervencion.trim() || null,
      acuerdos: form.acuerdos.trim() || null,
      proxima_cita: form.proximaCita || null,
    }

    setGuardando(true)

    const respuesta = consulta
      ? await supabase
          .from('CONSULTAS')
          .update({ ...datos, updated_at: new Date().toISOString() })
          .eq('id', consulta.id)
          .select()
      : await supabase
          .from('CONSULTAS')
          .insert({ ...datos, paciente_id: paciente.id })
          .select()

    setGuardando(false)

    if (respuesta.error || !respuesta.data?.[0]) {
      setError(
        'No se pudo guardar la consulta: ' +
          (respuesta.error ? respuesta.error.message : 'la base de datos no devolvió el registro.'),
      )
      return
    }

    onGuardada(Boolean(consulta))
  }

  return createPortal(
    <div className="modal-fondo" onMouseDown={alPresionarFondo}>
      <form
        ref={cajaRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-consulta"
        onSubmit={guardar}
        onKeyDown={atraparTab}
        noValidate
      >
        <h2 id="titulo-consulta">{consulta ? 'Editar consulta' : 'Nueva consulta'}</h2>
        <p className="medicion-ayuda">
          {nombrePaciente(paciente)} · Estas notas son del profesional: el paciente no las ve.
        </p>

        {error ? (
          <p className="registro-error" role="alert" style={{ marginTop: '12px' }}>
            {error}
          </p>
        ) : null}

        <div className="form-grid" style={{ marginTop: '14px' }}>
          <label className="campo">
            Fecha de la consulta
            <input
              ref={primerCampoRef}
              type="date"
              max={fechaHoy()}
              value={form.fecha}
              onChange={(e) => cambiar('fecha', e.target.value)}
              disabled={guardando}
            />
          </label>
          <label className="campo">
            Tipo
            <select
              value={form.tipo}
              onChange={(e) => cambiar('tipo', e.target.value)}
              disabled={guardando}
            >
              <option value="primera">Primera consulta</option>
              <option value="control">Control</option>
            </select>
          </label>
          <label className="campo">
            Próximo control
            <input
              type="date"
              min={form.fecha}
              value={form.proximaCita}
              onChange={(e) => cambiar('proximaCita', e.target.value)}
              disabled={guardando}
            />
          </label>
        </div>

        <label className="campo" style={{ marginTop: '12px' }}>
          Motivo o resumen de la consulta
          <textarea
            rows={2}
            value={form.motivo}
            onChange={(e) => cambiar('motivo', e.target.value)}
            disabled={guardando}
            placeholder="Por qué acude y cómo ha estado desde el último control."
          />
        </label>

        <label className="campo" style={{ marginTop: '12px' }}>
          Valoración
          <textarea
            rows={3}
            value={form.valoracion}
            onChange={(e) => cambiar('valoracion', e.target.value)}
            disabled={guardando}
            placeholder="Hallazgos: antropometría, alimentación habitual, exámenes, adherencia al plan."
          />
        </label>

        <label className="campo" style={{ marginTop: '12px' }}>
          Intervención e indicaciones
          <textarea
            rows={3}
            value={form.intervencion}
            onChange={(e) => cambiar('intervencion', e.target.value)}
            disabled={guardando}
            placeholder="Cambios al plan, recomendaciones, educación nutricional."
          />
        </label>

        <label className="campo" style={{ marginTop: '12px' }}>
          Acuerdos y metas
          <textarea
            rows={2}
            value={form.acuerdos}
            onChange={(e) => cambiar('acuerdos', e.target.value)}
            disabled={guardando}
            placeholder="Qué se compromete a hacer el paciente hasta el próximo control."
          />
        </label>

        <div className="modal-acciones">
          <button type="button" className="btn-secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="registro-boton" disabled={guardando}>
            {guardando ? 'Guardando…' : consulta ? 'Guardar cambios' : 'Guardar consulta'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

export default FormularioConsulta