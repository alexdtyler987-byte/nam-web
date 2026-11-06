import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabaseClient'
import { calcularIMC, categoriaIMC, claseChip, fechaHoy, nombrePaciente } from './utilidades'
import './Pestanas.css'

function valoresDe(p) {
  return {
    peso: p['Peso actual'] ?? '',
    altura: p.Altura ?? '',
    cintura: p.cintura ?? '',
    cadera: p.cadera ?? '',
    sexo: p.sexo ?? '',
    fechaNacimiento: p.fecha_nacimiento ?? '',
  }
}

// Ventana emergente para registrar una nueva medición.
// - onPacienteGuardado(paciente): el paciente ya se actualizó en la base (para refrescar la lista).
// - onExito({ historial }): todo salió bien; historial indica si se agregó un punto a la gráfica.
// - onCerrar(): cerrar la ventana.
function RegistrarMedicion({ paciente, onPacienteGuardado, onExito, onCerrar }) {
  const [inicial] = useState(() => valoresDe(paciente))
  const [form, setForm] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState('')
  const cajaRef = useRef(null)
  const pesoRef = useRef(null)

  const hayCambios = Object.keys(inicial).some((k) => String(form[k]) !== String(inicial[k]))
  const imcPrevio = calcularIMC(form.peso, form.altura)
  const categoria = categoriaIMC(imcPrevio)

  useEffect(() => {
    pesoRef.current?.focus()
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

  // Mantiene el foco dentro de la ventana mientras está abierta.
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

  // Un clic fuera solo cierra si no hay datos sin guardar (para no perder lo escrito por accidente).
  function alPresionarFondo(event) {
    if (event.target === event.currentTarget && !hayCambios && !guardando) onCerrar()
  }

  async function guardar(event) {
    event.preventDefault()
    setGuardando(true)
    setAviso('')

    const { data, error } = await supabase
      .from('PACIENTES')
      .update({
        'Peso actual': String(form.peso).trim() || null,
        Altura: String(form.altura).trim() || null,
        IMC: calcularIMC(form.peso, form.altura),
        cintura: form.cintura === '' ? null : Number(form.cintura),
        cadera: form.cadera === '' ? null : Number(form.cadera),
        sexo: form.sexo || null,
        fecha_nacimiento: form.fechaNacimiento || null,
        ultima_actualizacion: new Date().toISOString(),
      })
      .eq('id', paciente.id)
      .select()

    if (error || !data?.[0]) {
      setGuardando(false)
      setAviso('Error al guardar: ' + (error ? error.message : 'no se pudo actualizar al paciente.'))
      return
    }

    onPacienteGuardado(data[0])

    const pesoNum = Number(form.peso)
    const alturaNum = Number(form.altura)
    let historial = false

    if (pesoNum > 0 && alturaNum > 0) {
      const { error: errorHistorial } = await supabase.from('HISTORIAL-MEDIDAS').upsert(
        {
          paciente_id: paciente.id,
          fecha: fechaHoy(),
          peso: pesoNum,
          altura: alturaNum,
          imc: calcularIMC(form.peso, form.altura),
          cintura: form.cintura === '' ? null : Number(form.cintura),
          cadera: form.cadera === '' ? null : Number(form.cadera),
        },
        { onConflict: 'paciente_id,fecha' },
      )

      if (errorHistorial) {
        setGuardando(false)
        setAviso(
          'Datos guardados, pero no se pudo registrar el historial: ' + errorHistorial.message,
        )
        return
      }
      historial = true
    }

    setGuardando(false)
    onExito({ historial })
  }

  return createPortal(
    <div className="modal-fondo" onMouseDown={alPresionarFondo}>
      <form
        ref={cajaRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-medicion"
        onSubmit={guardar}
        onKeyDown={atraparTab}
        noValidate
      >
        <h2 id="titulo-medicion">Registrar nueva medición</h2>
        <p className="medicion-ayuda">
          {nombrePaciente(paciente)} · Se guarda en el historial y actualiza el IMC y la gráfica de
          evolución. Si registras otra medición el mismo día, se conserva la última.
        </p>

        {aviso ? (
          <p className="registro-error" role="alert" style={{ marginTop: '12px' }}>
            {aviso}
          </p>
        ) : null}

        <h3 className="modal-seccion">Medidas</h3>
        <div className="form-grid">
          <label className="campo">
            Peso (kg)
            <input
              ref={pesoRef}
              type="number"
              step="0.1"
              value={form.peso}
              onChange={(e) => cambiar('peso', e.target.value)}
              disabled={guardando}
            />
          </label>
          <label className="campo">
            Talla (m)
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
        </div>

        <p className="medicion-imc" aria-live="polite">
          {imcPrevio != null ? (
            <>
              IMC resultante: <strong>{imcPrevio.toFixed(1)}</strong>
              <span className={claseChip(categoria)}>{categoria}</span>
            </>
          ) : (
            'Ingresa peso y talla para calcular el IMC.'
          )}
        </p>

        <h3 className="modal-seccion">Datos personales</h3>
        <div className="form-grid">
          <label className="campo">
            Sexo
            <select
              value={form.sexo}
              onChange={(e) => cambiar('sexo', e.target.value)}
              disabled={guardando}
            >
              <option value="">Sin especificar</option>
              <option value="Mujer">Mujer</option>
              <option value="Hombre">Hombre</option>
            </select>
          </label>
          <label className="campo">
            Fecha de nacimiento
            <input
              type="date"
              value={form.fechaNacimiento}
              onChange={(e) => cambiar('fechaNacimiento', e.target.value)}
              disabled={guardando}
            />
          </label>
        </div>

        <div className="modal-acciones">
          <button type="button" className="btn-secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="registro-boton" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar medición'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

export default RegistrarMedicion