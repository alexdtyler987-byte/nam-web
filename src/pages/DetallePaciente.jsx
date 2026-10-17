import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Silueta from './Silueta'
import DietaSemanal from './DietaSemanal'
import {
  calcularIMC,
  capitalizar,
  categoriaIMC,
  claseChip,
  colorAvatar,
  colorCategoria,
  edadDesde,
  formatoFecha,
  iniciales,
  nombrePaciente,
} from './utilidades'

const TIPOS_COMIDA = ['desayuno', 'almuerzo', 'cena']

function DetallePaciente() {
  const { id } = useParams()
  const { pacientes, setPacientes, comidasHoy, cargando } = useOutletContext()
  const paciente = pacientes.find((p) => String(p.id) === id)

  const [form, setForm] = useState({
    peso: '',
    altura: '',
    cintura: '',
    cadera: '',
    sexo: '',
    fechaNacimiento: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [conPlan, setConPlan] = useState(null)

  useEffect(() => {
    if (!paciente) return
    setForm({
      peso: paciente['Peso actual'] ?? '',
      altura: paciente.Altura ?? '',
      cintura: paciente.cintura ?? '',
      cadera: paciente.cadera ?? '',
      sexo: paciente.sexo ?? '',
      fechaNacimiento: paciente.fecha_nacimiento ?? '',
    })
    setMensaje('')
  }, [paciente?.id])

  useEffect(() => {
    if (!paciente) return
    let cancelado = false

    supabase
      .from('DIETA-PACIENTE')
      .select('id', { count: 'exact', head: true })
      .eq('paciente_id', paciente.id)
      .then(({ count }) => {
        if (!cancelado) setConPlan((count ?? 0) > 0)
      })

    return () => {
      cancelado = true
    }
  }, [paciente?.id])

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  async function guardar(event) {
    event.preventDefault()
    setGuardando(true)
    setMensaje('')

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

    setGuardando(false)

    if (error) {
      setMensaje('Error al guardar: ' + error.message)
      return
    }

    const actualizado = data[0]
    setPacientes((lista) => lista.map((p) => (p.id === actualizado.id ? actualizado : p)))
    setMensaje('Cambios guardados correctamente.')
  }

  if (cargando) return <p className="estado">Cargando…</p>

  if (!paciente) {
    return (
      <div>
        <p className="estado">No se encontró este paciente.</p>
        <Link to="/panel" className="volver">‹ Volver a pacientes</Link>
      </div>
    )
  }

  const imc = calcularIMC(paciente['Peso actual'], paciente.Altura)
  const categoria = categoriaIMC(imc)
  const edad = edadDesde(paciente.fecha_nacimiento)
  const subtitulo = [
    paciente.DNI ? `DNI ${paciente.DNI}` : null,
    edad != null ? `${edad} años` : null,
    paciente.sexo,
  ]
    .filter(Boolean)
    .join(' · ')

  const comidasDelPaciente = comidasHoy.filter((c) => c.paciente_id === paciente.id)
  function comidaCompletada(tipo) {
    return comidasDelPaciente.some(
      (c) => c.completado && String(c.tipo_comida).toLowerCase() === tipo,
    )
  }

  return (
    <div className="detalle">
      <Link to="/panel" className="volver">‹ Volver a pacientes</Link>

      <header className="detalle-cabecera">
        <span className="avatar avatar-grande" style={{ background: colorAvatar(paciente.sexo) }}>
          {iniciales(nombrePaciente(paciente))}
        </span>
        <div>
          <h1>{nombrePaciente(paciente)}</h1>
          <p className="detalle-sub">{subtitulo}</p>
        </div>
        {conPlan !== null ? (
          <span className={conPlan ? 'badge badge-ok' : 'badge'}>
            {conPlan ? 'Con plan' : 'Sin plan'}
          </span>
        ) : null}
      </header>

      <div className="detalle-grid">
        <section className="tarjeta tarjeta-silueta">
          <Silueta sexo={paciente.sexo} color={colorCategoria(imc)} />
        </section>

        <section className="tarjeta">
          <h2>Datos antropométricos</h2>
          <div className="medidas">
            <div className="medida">
              <span>Peso (kg)</span>
              <strong>{paciente['Peso actual'] || '—'}</strong>
            </div>
            <div className="medida">
              <span>Talla (m)</span>
              <strong>{paciente.Altura || '—'}</strong>
            </div>
            <div className="medida medida-imc">
              <span>IMC</span>
              <strong>{imc != null ? imc.toFixed(1) : '—'}</strong>
              {imc != null ? <span className={claseChip(categoria)}>{categoria}</span> : null}
            </div>
          </div>

          <h2 style={{ marginTop: '20px' }}>Medidas adicionales</h2>
          <div className="medidas">
            <div className="medida">
              <span>Cintura</span>
              <strong>{paciente.cintura != null ? `${paciente.cintura} cm` : '—'}</strong>
            </div>
            <div className="medida">
              <span>Cadera</span>
              <strong>{paciente.cadera != null ? `${paciente.cadera} cm` : '—'}</strong>
            </div>
          </div>
          <p className="actualizacion">
            Última actualización: {formatoFecha(paciente.ultima_actualizacion)}
          </p>
        </section>
      </div>

      <section className="tarjeta">
        <h2>Comidas de hoy</h2>
        <ul className="comidas">
          {TIPOS_COMIDA.map((tipo) => (
            <li key={tipo} className={comidaCompletada(tipo) ? 'comida-ok' : 'comida-pendiente'}>
              {capitalizar(tipo)} · {comidaCompletada(tipo) ? 'Listo' : 'Pendiente'}
            </li>
          ))}
        </ul>
      </section>

      <form className="tarjeta" onSubmit={guardar}>
        <h2>Actualizar datos</h2>
        <div className="form-grid">
          <label className="campo">
            Peso (kg)
            <input type="number" step="0.1" value={form.peso} onChange={(e) => cambiar('peso', e.target.value)} />
          </label>
          <label className="campo">
            Talla (m)
            <input type="number" step="0.01" value={form.altura} onChange={(e) => cambiar('altura', e.target.value)} />
          </label>
          <label className="campo">
            Cintura (cm)
            <input type="number" step="0.1" value={form.cintura} onChange={(e) => cambiar('cintura', e.target.value)} />
          </label>
          <label className="campo">
            Cadera (cm)
            <input type="number" step="0.1" value={form.cadera} onChange={(e) => cambiar('cadera', e.target.value)} />
          </label>
          <label className="campo">
            Sexo
            <select value={form.sexo} onChange={(e) => cambiar('sexo', e.target.value)}>
              <option value="">Sin especificar</option>
              <option value="Mujer">Mujer</option>
              <option value="Hombre">Hombre</option>
            </select>
          </label>
          <label className="campo">
            Fecha de nacimiento
            <input type="date" value={form.fechaNacimiento} onChange={(e) => cambiar('fechaNacimiento', e.target.value)} />
          </label>
        </div>
        <div className="modal-acciones">
          {mensaje ? <span className="mensaje-guardado">{mensaje}</span> : null}
          <button type="submit" className="registro-boton" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      <DietaSemanal paciente={paciente} />
    </div>
  )
}

export default DetallePaciente