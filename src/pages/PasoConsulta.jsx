import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { fechaHoy } from './utilidades'

const CAMPOS_TEXTO = ['motivo', 'valoracion', 'intervencion', 'acuerdos']

// Paso 4: notas de la primera consulta. Se guardan en la pestaña «Consultas» como consulta de tipo «primera».
// Si ya existe una primera consulta de este paciente (por ejemplo, al volver atrás), se EDITA en vez de duplicarla.
function PasoConsulta({ paciente, onAtras, onOmitir, onSiguiente }) {
  const [cargando, setCargando] = useState(true)
  const [consultaId, setConsultaId] = useState(null)
  const [form, setForm] = useState({
    fecha: fechaHoy(),
    proximaCita: '',
    motivo: '',
    valoracion: '',
    intervencion: '',
    acuerdos: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)

      const [consulta, historia] = await Promise.all([
        supabase
          .from('CONSULTAS')
          .select('*')
          .eq('paciente_id', paciente.id)
          .eq('tipo', 'primera')
          .order('id', { ascending: false })
          .limit(1),
        supabase.from('HISTORIA-CLINICA').select('motivo_consulta').eq('paciente_id', paciente.id).maybeSingle(),
      ])

      if (cancelado) return

      const existente = consulta.error ? null : consulta.data?.[0]

      if (existente) {
        setConsultaId(existente.id)
        setForm({
          fecha: String(existente.fecha).slice(0, 10),
          proximaCita: existente.proxima_cita ? String(existente.proxima_cita).slice(0, 10) : '',
          motivo: existente.motivo ?? '',
          valoracion: existente.valoracion ?? '',
          intervencion: existente.intervencion ?? '',
          acuerdos: existente.acuerdos ?? '',
        })
      } else if (!historia.error && historia.data?.motivo_consulta) {
        // El motivo ya se preguntó en la historia clínica: se propone el mismo para no escribirlo dos veces
        setForm((actual) => ({ ...actual, motivo: historia.data.motivo_consulta }))
      }

      setCargando(false)
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [paciente.id])

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  async function guardar(event) {
    event.preventDefault()
    setError('')

    if (!form.fecha) return setError('La fecha de la consulta es obligatoria.')
    if (form.fecha > fechaHoy()) return setError('La fecha de la consulta no puede ser futura.')
    if (!CAMPOS_TEXTO.some((campo) => form[campo].trim())) {
      return setError('Escribe al menos una nota (motivo, valoración, intervención o acuerdos), o usa «Omitir por ahora».')
    }
    if (form.proximaCita && form.proximaCita < form.fecha) {
      return setError('El próximo control no puede ser anterior a la fecha de la consulta.')
    }

    const datos = {
      fecha: form.fecha,
      tipo: 'primera',
      motivo: form.motivo.trim() || null,
      valoracion: form.valoracion.trim() || null,
      intervencion: form.intervencion.trim() || null,
      acuerdos: form.acuerdos.trim() || null,
      proxima_cita: form.proximaCita || null,
    }

    setGuardando(true)

    const respuesta = consultaId
      ? await supabase
          .from('CONSULTAS')
          .update({ ...datos, updated_at: new Date().toISOString() })
          .eq('id', consultaId)
          .select()
      : await supabase.from('CONSULTAS').insert({ ...datos, paciente_id: paciente.id }).select()

    setGuardando(false)

    if (respuesta.error || !respuesta.data?.[0]) {
      return setError(
        'No se pudo guardar la consulta: ' +
          (respuesta.error ? respuesta.error.message : 'la base de datos no devolvió el registro.'),
      )
    }

    setConsultaId(respuesta.data[0].id)
    onSiguiente()
  }

  if (cargando) return <div className="esqueleto esq-tira" aria-label="Cargando consulta" />

  return (
    <form className="asistente-form" onSubmit={guardar} noValidate>
      <p className="asistente-ayuda">
        Registra lo que se evaluó y acordó en esta primera consulta. Estas notas son del profesional: el paciente no las
        ve. Aparecerán en la pestaña «Consultas».
      </p>

      {error ? (
        <p className="registro-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="form-grid">
        <label className="campo">
          Fecha de la consulta
          <input
            type="date"
            max={fechaHoy()}
            value={form.fecha}
            onChange={(e) => cambiar('fecha', e.target.value)}
            disabled={guardando}
          />
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
        />
      </label>

      <label className="campo" style={{ marginTop: '12px' }}>
        Valoración
        <textarea
          rows={3}
          value={form.valoracion}
          onChange={(e) => cambiar('valoracion', e.target.value)}
          disabled={guardando}
          placeholder="Hallazgos: antropometría, alimentación habitual, exámenes, adherencia."
        />
      </label>

      <label className="campo" style={{ marginTop: '12px' }}>
        Intervención e indicaciones
        <textarea
          rows={3}
          value={form.intervencion}
          onChange={(e) => cambiar('intervencion', e.target.value)}
          disabled={guardando}
          placeholder="Recomendaciones, educación nutricional, cambios a realizar."
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

      <div className="asistente-acciones">
        <button type="button" className="btn-secundario" onClick={onAtras} disabled={guardando}>
          Atrás
        </button>
        <span className="asistente-acciones-espacio" />
        <button type="button" className="btn-secundario" onClick={onOmitir} disabled={guardando}>
          Omitir por ahora
        </button>
        <button type="submit" className="registro-boton" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar y continuar'}
        </button>
      </div>
    </form>
  )
}

export default PasoConsulta