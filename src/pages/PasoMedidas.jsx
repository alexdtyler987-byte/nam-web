import { useState } from 'react'
import { calcularIMC, categoriaIMC, claseChip } from './utilidades'
import { guardarMedicion } from './medicion'
import './Pestanas.css'

function aNumero(valor) {
  const n = Number(String(valor ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Paso 3: medidas del paciente. Se guardan en PACIENTES y en el historial (gráfica de evolución).
// - onPaciente(paciente): la fila del paciente cambió
// - onSiguiente(): guardado correcto, pasar al siguiente paso
function PasoMedidas({ paciente, onPaciente, onAtras, onOmitir, onSiguiente }) {
  const [form, setForm] = useState({
    peso: paciente['Peso actual'] ?? '',
    altura: paciente.Altura ?? '',
    cintura: paciente.cintura ?? '',
    cadera: paciente.cadera ?? '',
    pesoIdeal: paciente['Peso ideal'] ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  const imc = calcularIMC(form.peso, form.altura)
  const categoria = categoriaIMC(imc)

  async function guardar(event) {
    event.preventDefault()
    setError('')

    const peso = aNumero(form.peso)
    const altura = aNumero(form.altura)
    const ideal = aNumero(form.pesoIdeal)

    if (!peso || peso < 10 || peso > 400) return setError('Escribe un peso válido (entre 10 y 400 kg).')
    if (!altura || altura < 0.5 || altura > 2.5) return setError('Escribe una talla válida en metros (por ejemplo 1.65).')
    if (form.pesoIdeal !== '' && (!ideal || ideal < 20 || ideal > 400)) {
      return setError('El peso ideal no es válido (entre 20 y 400 kg).')
    }
    if (form.cintura !== '' && !aNumero(form.cintura)) return setError('La cintura no es válida.')
    if (form.cadera !== '' && !aNumero(form.cadera)) return setError('La cadera no es válida.')

    setGuardando(true)
    const resultado = await guardarMedicion(paciente, form)
    setGuardando(false)

    if (resultado.paciente) onPaciente(resultado.paciente)
    if (!resultado.ok) return setError(resultado.mensaje)

    onSiguiente()
  }

  return (
    <form className="asistente-form" onSubmit={guardar} noValidate>
      <p className="asistente-ayuda">
        Estas medidas se guardan en el historial: son el primer punto de la gráfica de evolución del paciente.
      </p>

      {error ? (
        <p className="registro-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="form-grid">
        <label className="campo">
          Peso (kg) *
          <input
            type="number"
            step="0.1"
            value={form.peso}
            onChange={(e) => cambiar('peso', e.target.value)}
            disabled={guardando}
          />
        </label>
        <label className="campo">
          Talla (m) *
          <input
            type="number"
            step="0.01"
            value={form.altura}
            onChange={(e) => cambiar('altura', e.target.value)}
            disabled={guardando}
          />
        </label>
        <label className="campo">
          Cintura (cm)
          <input
            type="number"
            step="0.1"
            value={form.cintura}
            onChange={(e) => cambiar('cintura', e.target.value)}
            disabled={guardando}
          />
        </label>
        <label className="campo">
          Cadera (cm)
          <input
            type="number"
            step="0.1"
            value={form.cadera}
            onChange={(e) => cambiar('cadera', e.target.value)}
            disabled={guardando}
          />
        </label>
        <label className="campo">
          Peso ideal (kg)
          <input
            type="number"
            step="0.1"
            value={form.pesoIdeal}
            onChange={(e) => cambiar('pesoIdeal', e.target.value)}
            disabled={guardando}
          />
        </label>
      </div>

      <p className="medicion-imc" aria-live="polite">
        {imc != null ? (
          <>
            IMC resultante: <strong>{imc.toFixed(1)}</strong>
            <span className={claseChip(categoria)}>{categoria}</span>
          </>
        ) : (
          'Ingresa peso y talla para calcular el IMC.'
        )}
      </p>

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

export default PasoMedidas