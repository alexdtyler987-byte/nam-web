import { useState } from 'react'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import NuevoPaciente from './NuevoPaciente'
import {
  calcularIMC,
  categoriaIMC,
  claseChip,
  colorAvatar,
  edadDesde,
  iniciales,
  nombrePaciente,
} from './utilidades'

function ListaPacientes() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { pacientes, setPacientes, cargando, error } = useOutletContext()
  const [busqueda, setBusqueda] = useState(params.get('q') || '')
  const [mostrarNuevo, setMostrarNuevo] = useState(false)

  const texto = busqueda.trim().toLowerCase()
  const filtrados = pacientes.filter((p) => {
    if (!texto) return true
    return (
      nombrePaciente(p).toLowerCase().includes(texto) ||
      String(p.DNI || '').includes(texto)
    )
  })

  function alCrear(paciente) {
    setPacientes((actual) => [...actual, paciente])
    setMostrarNuevo(false)
    navigate(`/panel/pacientes/${paciente.id}`)
  }

  return (
    <div>
      <div className="barra-superior">
        <input
          type="search"
          className="buscador"
          placeholder="Buscar por nombre o DNI…"
          aria-label="Buscar paciente"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button type="button" className="registro-boton" onClick={() => setMostrarNuevo(true)}>
          + Nuevo paciente
        </button>
      </div>

      <h1 className="titulo-pagina">Mis pacientes</h1>

      {cargando ? (
        <div className="pacientes-grid" aria-label="Cargando pacientes">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="esqueleto esq-card" />
          ))}
        </div>
      ) : null}

      {error ? <p className="registro-error" role="alert">{error}</p> : null}

      {!cargando && !error && pacientes.length === 0 ? (
        <p className="estado">Aún no tienes pacientes registrados.</p>
      ) : null}

      {!cargando && pacientes.length > 0 && filtrados.length === 0 ? (
        <p className="estado">Ningún paciente coincide con la búsqueda.</p>
      ) : null}

      <div className="pacientes-grid">
        {filtrados.map((p, i) => {
          const imc = calcularIMC(p['Peso actual'], p.Altura)
          const categoria = categoriaIMC(imc)
          const edad = edadDesde(p.fecha_nacimiento)

          return (
            <Link
              key={p.id}
              to={`/panel/pacientes/${p.id}`}
              className="paciente-card"
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
            >
              <span className="avatar" style={{ background: colorAvatar(p.sexo) }}>
                {iniciales(nombrePaciente(p))}
              </span>
              <span className="paciente-card-datos">
                <strong>{nombrePaciente(p)}</strong>
                <small>
                  DNI {p.DNI || '—'}
                  {edad != null ? ` · ${edad} años` : ''}
                </small>
              </span>
              {imc != null ? <span className={claseChip(categoria)}>{imc.toFixed(1)}</span> : null}
            </Link>
          )
        })}
      </div>

      {mostrarNuevo ? (
        <NuevoPaciente onCerrar={() => setMostrarNuevo(false)} onCreado={alCrear} />
      ) : null}
    </div>
  )
}

export default ListaPacientes