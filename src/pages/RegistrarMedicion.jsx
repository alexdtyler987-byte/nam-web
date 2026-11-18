import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { calcularIMC, categoriaIMC, claseChip, nombrePaciente } from './utilidades'
import { guardarMedicion } from './medicion'
import './Pestanas.css'

function valoresDe(p) {
  return {
    peso: p['Peso actual'] ?? '',
    altura: p.Altura ?? '',
    cintura: p.cintura ?? '',
    cadera: p.cadera ?? '',
    sexo: p.sexo ?? '',
    fechaNacimiento: p.fecha_nacimiento ?? '',
    pesoIdeal: p['Peso ideal'] ?? '',
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

    const resultado = await guardarMedicion(paciente, form)

    setGuardando(false)

    // Si el paciente se guardó (aunque haya fallado el historial), la lista se actualiza
    if (resultado.paciente) onPacienteGuardado(resultado.paciente)

    if (!resultado.ok) {
      setAviso(resultado.mensaje)
      return
    }

    onExito({ historial: resultado.historial })
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
            Peso ideal (kg)
            <input
              type="number"
              step="0.1"
              value={form.pesoIdeal}
              onChange={(e) => cambiar('pesoIdeal', e.target.value)}
              disabled={guardando}
            />
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