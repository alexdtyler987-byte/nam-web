import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatoFecha } from './utilidades'

const VACIO = {
  motivo_consulta: '',
  tipo_sangre: '',
  alergias: '',
  antecedentes: '',
  medicacion: '',
  actividad_fisica: '',
  horas_sueno: '',
  agua_litros: '',
  tabaco: '',
  alcohol: '',
  comidas_fuera_semana: '',
  notas: '',
}

const SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const ACTIVIDAD = ['Sedentaria', 'Ligera', 'Moderada', 'Intensa']
const FRECUENCIA = ['No', 'Ocasional', 'Frecuente']

function aFormulario(fila) {
  const resultado = { ...VACIO }
  Object.keys(VACIO).forEach((clave) => {
    resultado[clave] = fila?.[clave] ?? ''
  })
  return resultado
}

function textoONulo(valor) {
  const texto = String(valor).trim()
  return texto || null
}

function numeroONulo(valor) {
  return valor === '' ? null : Number(valor)
}

function HistoriaClinica({ paciente, onGuardada }) {
  const [form, setForm] = useState(VACIO)
  const [alergiasGuardadas, setAlergiasGuardadas] = useState('')
  const [actualizado, setActualizado] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)
      setMensaje('')
      setError('')

      const { data, error: consultaError } = await supabase
        .from('HISTORIA-CLINICA')
        .select('*')
        .eq('paciente_id', paciente.id)
        .maybeSingle()

      if (cancelado) return

      if (consultaError) {
        setError('No se pudo cargar la ficha: ' + consultaError.message)
        setCargando(false)
        return
      }

      setForm(aFormulario(data))
      setAlergiasGuardadas(data?.alergias ?? '')
      setActualizado(data?.actualizado_en ?? null)
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
    setGuardando(true)
    setMensaje('')
    setError('')

    const fila = {
      paciente_id: paciente.id,
      motivo_consulta: textoONulo(form.motivo_consulta),
      tipo_sangre: form.tipo_sangre || null,
      alergias: textoONulo(form.alergias),
      antecedentes: textoONulo(form.antecedentes),
      medicacion: textoONulo(form.medicacion),
      actividad_fisica: form.actividad_fisica || null,
      horas_sueno: numeroONulo(form.horas_sueno),
      agua_litros: numeroONulo(form.agua_litros),
      tabaco: form.tabaco || null,
      alcohol: form.alcohol || null,
      comidas_fuera_semana: numeroONulo(form.comidas_fuera_semana),
      notas: textoONulo(form.notas),
      actualizado_en: new Date().toISOString(),
    }

    const { data, error: guardarError } = await supabase
      .from('HISTORIA-CLINICA')
      .upsert(fila, { onConflict: 'paciente_id' })
      .select()
      .single()

    setGuardando(false)

    if (guardarError) {
      setError('No se pudo guardar: ' + guardarError.message)
      return
    }

    setAlergiasGuardadas(data.alergias ?? '')
    setActualizado(data.actualizado_en)
    setMensaje('Ficha guardada correctamente.')
        if (onGuardada) onGuardada()
  }

  if (cargando) return <div className="esqueleto esq-tira" aria-label="Cargando ficha clínica" />

  return (
    <form className="tarjeta" onSubmit={guardar}>
      <h2>Ficha clínica</h2>

      {alergiasGuardadas ? (
        <p className="hc-aviso" role="status">
          Alergias o intolerancias: {alergiasGuardadas}
        </p>
      ) : null}

      {error ? <p className="registro-error" role="alert">{error}</p> : null}

      <h3 className="hc-seccion">Historial médico</h3>
      <div className="form-grid">
        <label className="campo">
          Tipo de sangre
          <select value={form.tipo_sangre} onChange={(e) => cambiar('tipo_sangre', e.target.value)}>
            <option value="">Sin especificar</option>
            {SANGRE.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className="campo campo-ancho">
          Motivo de consulta
          <textarea rows={2} value={form.motivo_consulta} onChange={(e) => cambiar('motivo_consulta', e.target.value)} />
        </label>

        <label className="campo campo-ancho">
          Alergias e intolerancias
          <textarea rows={2} value={form.alergias} onChange={(e) => cambiar('alergias', e.target.value)} />
        </label>

        <label className="campo campo-ancho">
          Antecedentes y enfermedades
          <textarea rows={2} value={form.antecedentes} onChange={(e) => cambiar('antecedentes', e.target.value)} />
        </label>

        <label className="campo campo-ancho">
          Medicación actual
          <textarea rows={2} value={form.medicacion} onChange={(e) => cambiar('medicacion', e.target.value)} />
        </label>
      </div>

      <h3 className="hc-seccion">Estilo de vida</h3>
      <div className="form-grid">
        <label className="campo">
          Actividad física
          <select value={form.actividad_fisica} onChange={(e) => cambiar('actividad_fisica', e.target.value)}>
            <option value="">Sin especificar</option>
            {ACTIVIDAD.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        <label className="campo">
          Horas de sueño
          <input type="number" step="0.5" min="0" max="24" value={form.horas_sueno} onChange={(e) => cambiar('horas_sueno', e.target.value)} />
        </label>

        <label className="campo">
          Agua al día (litros)
          <input type="number" step="0.1" min="0" value={form.agua_litros} onChange={(e) => cambiar('agua_litros', e.target.value)} />
        </label>

        <label className="campo">
          Comidas fuera de casa por semana
          <input type="number" min="0" max="21" value={form.comidas_fuera_semana} onChange={(e) => cambiar('comidas_fuera_semana', e.target.value)} />
        </label>

        <label className="campo">
          Tabaco
          <select value={form.tabaco} onChange={(e) => cambiar('tabaco', e.target.value)}>
            <option value="">Sin especificar</option>
            {FRECUENCIA.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>

        <label className="campo">
          Alcohol
          <select value={form.alcohol} onChange={(e) => cambiar('alcohol', e.target.value)}>
            <option value="">Sin especificar</option>
            {FRECUENCIA.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>

        <label className="campo campo-ancho">
          Notas sobre el estilo de vida
          <textarea rows={2} value={form.notas} onChange={(e) => cambiar('notas', e.target.value)} />
        </label>
      </div>

      <div className="modal-acciones">
        {mensaje ? <span className="mensaje-guardado">{mensaje}</span> : null}
        {actualizado ? (
          <span className="actualizacion" style={{ margin: 0 }}>
            Última actualización: {formatoFecha(actualizado)}
          </span>
        ) : null}
        <button type="submit" className="registro-boton" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar ficha'}
        </button>
      </div>
    </form>
  )
}

export default HistoriaClinica