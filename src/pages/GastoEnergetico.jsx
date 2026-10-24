import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { edadDesde } from './utilidades'

const FACTORES = {
  Sedentaria: 1.2,
  Ligera: 1.375,
  Moderada: 1.55,
  Intensa: 1.725,
}

function aNumero(valor) {
  const n = Number(String(valor ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

function tasaBasal(formula, sexo, peso, tallaCm, edad) {
  const hombre = sexo === 'Hombre'

  if (formula === 'harris') {
    return hombre
      ? 88.362 + 13.397 * peso + 4.799 * tallaCm - 5.677 * edad
      : 447.593 + 9.247 * peso + 3.098 * tallaCm - 4.33 * edad
  }

  return 10 * peso + 6.25 * tallaCm - 5 * edad + (hombre ? 5 : -161)
}

function GastoEnergetico({ paciente, version }) {
  const [actividad, setActividad] = useState('')
  const [formula, setFormula] = useState('mifflin')
  const [ajuste, setAjuste] = useState('0')
  const [error, setError] = useState('')

  useEffect(() => {
    setAjuste('0')
  }, [paciente.id])

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setError('')

      const { data, error: consultaError } = await supabase
        .from('HISTORIA-CLINICA')
        .select('actividad_fisica')
        .eq('paciente_id', paciente.id)
        .maybeSingle()

      if (cancelado) return

      if (consultaError) {
        setError('No se pudo leer la actividad física: ' + consultaError.message)
        return
      }

      setActividad(data?.actividad_fisica ?? '')
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [paciente.id, version])

  const peso = aNumero(paciente['Peso actual'])
  const altura = aNumero(paciente.Altura)
  const edad = edadDesde(paciente.fecha_nacimiento)
  const sexo = paciente.sexo

  const faltan = []
  if (!peso || peso < 10 || peso > 400) faltan.push('peso')
  if (!altura || altura < 0.5 || altura > 2.5) faltan.push('talla en metros')
  if (edad == null) faltan.push('fecha de nacimiento')
  if (!sexo) faltan.push('sexo')

  const esMenor = edad != null && edad < 18
  const calculable = faltan.length === 0 && !esMenor && actividad !== ''

  let basal = null
  let total = null
  let meta = null

  if (calculable) {
    basal = tasaBasal(formula, sexo, peso, altura * 100, edad)
    total = basal * FACTORES[actividad]
    meta = total + (Number(ajuste) || 0)
  }

  return (
    <section className="tarjeta">
      <h2>Gasto energético estimado</h2>

      {error ? <p className="registro-error" role="alert">{error}</p> : null}

      {faltan.length > 0 ? (
        <p className="estado">
          Para calcularlo falta completar: {faltan.join(', ')}. Se actualizan en "Actualizar datos".
        </p>
      ) : null}

      {esMenor ? (
        <p className="estado">
          Estas fórmulas son para adultos. Para menores de 18 años hay que usar otros métodos.
        </p>
      ) : null}

      <div className="form-grid">
        <label className="campo">
          Fórmula
          <select value={formula} onChange={(e) => setFormula(e.target.value)}>
            <option value="mifflin">Mifflin-St Jeor</option>
            <option value="harris">Harris-Benedict revisada</option>
          </select>
        </label>

        <label className="campo">
          Actividad física
          <select value={actividad} onChange={(e) => setActividad(e.target.value)}>
            <option value="">Elige un nivel</option>
            {Object.keys(FACTORES).map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel} (×{FACTORES[nivel]})
              </option>
            ))}
          </select>
        </label>

        <label className="campo">
          Ajuste (kcal)
          <input
            type="number"
            step="50"
            min="-1500"
            max="1500"
            value={ajuste}
            onChange={(e) => setAjuste(e.target.value)}
          />
        </label>
      </div>

      {faltan.length === 0 && !esMenor && actividad === '' ? (
        <p className="estado" style={{ marginTop: '12px' }}>
          Elige un nivel de actividad, o complétalo en la ficha clínica.
        </p>
      ) : null}

      {calculable ? (
        <>
          <div className="medidas" style={{ marginTop: '14px' }}>
            <div className="medida">
              <span>Tasa basal</span>
              <strong>{Math.round(basal)} kcal</strong>
            </div>
            <div className="medida">
              <span>Gasto total</span>
              <strong>{Math.round(total)} kcal</strong>
            </div>
            <div className="medida medida-imc">
              <span>Meta calórica</span>
              <strong>{Math.round(meta)} kcal</strong>
            </div>
          </div>

          {meta < basal ? (
            <p className="hc-aviso" role="status" style={{ marginTop: '12px' }}>
              La meta está por debajo de la tasa basal. Revisa el ajuste.
            </p>
          ) : null}
        </>
      ) : null}

      <p className="actualizacion">
        Estimación orientativa para adultos: el criterio final es de la nutricionista. No considera embarazo,
        lactancia ni condiciones clínicas especiales.
      </p>
    </section>
  )
}

export default GastoEnergetico