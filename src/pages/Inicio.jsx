import { useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import NuevoPaciente from './NuevoPaciente'
import FotoComida from './FotoComida'
import { textoAlerta } from './fotos'
import {
  calcularIMC,
  capitalizar,
  colorAvatar,
  edadDesde,
  horaLima,
  iniciales,
  nombrePaciente,
} from './utilidades'

const COMIDAS_SEMANA = 21
const MAX_FOTOS_HOY = 8

function Inicio() {
  const navigate = useNavigate()
  const {
    pacientes,
    setPacientes,
    comidasHoy,
    cargando,
    error,
    nutricionista,
    conteoPlanes,
    alertas,
    setAlertas,
  } = useOutletContext()

  const [busqueda, setBusqueda] = useState('')
  const [mostrarNuevo, setMostrarNuevo] = useState(false)
  const [mostrarAlertas, setMostrarAlertas] = useState(false)

  const planesListos = conteoPlanes !== null
  const primerNombre =
    nutricionista && !nutricionista.includes('@') ? nutricionista.split(' ')[0] : ''

  const total = pacientes.length
  const activos = planesListos ? pacientes.filter((p) => (conteoPlanes[p.id] || 0) > 0).length : null
  const porActualizar = planesListos
    ? pacientes.filter((p) => (conteoPlanes[p.id] || 0) < COMIDAS_SEMANA).length
    : null

  const recientes = [...pacientes].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 5)

  // Fotos de hoy: las más recientes primero. Se limitan para cuidar la transferencia de Supabase.
  const nombresPorId = Object.fromEntries(pacientes.map((p) => [p.id, nombrePaciente(p)]))
  const conFoto = comidasHoy
    .filter((c) => c.completado && c.foto_path)
    .sort((a, b) => new Date(b.hora_completado) - new Date(a.hora_completado))
  const fotosHoy = conFoto.slice(0, MAX_FOTOS_HOY)

  function buscar(event) {
    event.preventDefault()
    const texto = busqueda.trim()
    navigate(texto ? `/panel/pacientes?q=${encodeURIComponent(texto)}` : '/panel/pacientes')
  }

  function alCrear(paciente) {
    setPacientes((actual) => [...actual, paciente])
    setMostrarNuevo(false)
    navigate(`/panel/pacientes/${paciente.id}`)
  }

  return (
    <div className="inicio">
      <header className="inicio-cabecera">
        <div>
          <h1>{primerNombre ? `Hola, ${primerNombre}` : 'Hola'}</h1>
          <p className="inicio-sub">Aquí tienes un resumen de tus pacientes y planes.</p>
        </div>

        <div className="inicio-herramientas">
          <form onSubmit={buscar} role="search">
            <input
              type="search"
              className="buscador"
              placeholder="Buscar paciente…"
              aria-label="Buscar paciente"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </form>

          <div className="campana-wrap">
            <button
              type="button"
              className="campana"
              aria-label={`Alertas (${alertas.length})`}
              aria-expanded={mostrarAlertas}
              onClick={() => setMostrarAlertas((v) => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0-6 6v3.5L4.5 16h15L18 12.5V9a6 6 0 0 0-6-6z" />
                <path d="M10 19a2 2 0 0 0 4 0" />
              </svg>
              {alertas.length > 0 ? <span className="campana-punto" /> : null}
            </button>

            {mostrarAlertas ? (
              <div className="campana-menu" aria-live="polite">
                <h2>Alertas</h2>
                {alertas.length === 0 ? (
                  <p className="estado">No hay alertas nuevas.</p>
                ) : (
                  <>
                    <ul>
                      {alertas.map((a) => (
                        <li key={a.clave}>
                          <div className="alerta-info">
                            {a.fotoPath ? (
                              <FotoComida
                                path={a.fotoPath}
                                titulo={`${a.nombre}: ${String(a.tipo).toLowerCase()}`}
                                tamano="mini"
                              />
                            ) : null}
                            <span>
                              <strong>{a.nombre}</strong> {textoAlerta(a)} · {horaLima(a.hora)}
                            </span>
                          </div>
                          <button
                            type="button"
                            aria-label="Descartar alerta"
                            onClick={() =>
                              setAlertas((actual) => actual.filter((x) => x.clave !== a.clave))
                            }
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button type="button" className="campana-limpiar" onClick={() => setAlertas([])}>
                      Limpiar todas
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {error ? <p className="registro-error" role="alert">{error}</p> : null}

      <section className="stats" aria-label="Resumen">
        {cargando ? (
          [0, 1, 2].map((n) => <div key={n} className="esqueleto esq-stat" />)
        ) : (
          <>
            <div className="stat stat-verde">
              <strong>{total}</strong>
              <span>Total de pacientes</span>
            </div>
            <div className="stat stat-rosa" style={{ animationDelay: '60ms' }}>
              <strong>{activos ?? '—'}</strong>
              <span>Pacientes activos</span>
            </div>
            <div className="stat stat-celeste" style={{ animationDelay: '120ms' }}>
              <strong>{porActualizar ?? '—'}</strong>
              <span>Planes por actualizar</span>
            </div>
          </>
        )}
      </section>

      <section aria-label="Fotos de hoy">
        <div className="inicio-subcabecera">
          <h2>Fotos de hoy</h2>
        </div>

        {!cargando && fotosHoy.length === 0 ? (
          <p className="estado">
            Todavía no hay fotos hoy. Aparecerán aquí apenas tus pacientes las suban.
          </p>
        ) : null}

        {fotosHoy.length > 0 ? (
          <ul className="fotos-hoy">
            {fotosHoy.map((c) => {
              const nombre = nombresPorId[c.paciente_id] || 'Paciente'
              const comida = capitalizar(String(c.tipo_comida).toLowerCase())

              return (
                <li key={c.id} className="foto-tarjeta">
                  <FotoComida path={c.foto_path} titulo={`${comida} de ${nombre}`} />
                  <Link to={`/panel/pacientes/${c.paciente_id}`}>{nombre}</Link>
                  <small>
                    {comida} · {horaLima(c.hora_completado)}
                  </small>
                </li>
              )
            })}
          </ul>
        ) : null}

        {conFoto.length > MAX_FOTOS_HOY ? (
          <p className="actualizacion">
            Mostrando las {MAX_FOTOS_HOY} más recientes de hoy. Las demás están en la ficha de cada paciente.
          </p>
        ) : null}
      </section>

      <section>
        <div className="inicio-subcabecera">
          <h2>Pacientes recientes</h2>
          <div className="inicio-acciones">
            <Link to="/panel/pacientes">Ver todos</Link>
            <button type="button" className="registro-boton" onClick={() => setMostrarNuevo(true)}>
              + Nuevo paciente
            </button>
          </div>
        </div>

        {cargando ? (
          <div aria-label="Cargando pacientes">
            {[0, 1, 2].map((n) => (
              <div key={n} className="esqueleto esq-fila" />
            ))}
          </div>
        ) : null}

        {!cargando && !error && pacientes.length === 0 ? (
          <p className="estado">Aún no tienes pacientes registrados. Crea el primero con "+ Nuevo paciente".</p>
        ) : null}

        {!cargando && recientes.length > 0 ? (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Edad</th>
                  <th>IMC</th>
                  <th>Estado</th>
                  <th>Plan</th>
                  <th>
                    <span className="sr-only">Ver paciente</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recientes.map((p) => {
                  const imc = calcularIMC(p['Peso actual'], p.Altura)
                  const edad = edadDesde(p.fecha_nacimiento)
                  const comidas = planesListos ? conteoPlanes[p.id] || 0 : null

                  return (
                    <tr key={p.id} onClick={() => navigate(`/panel/pacientes/${p.id}`)}>
                      <td>
                        <Link
                          to={`/panel/pacientes/${p.id}`}
                          className="tabla-nombre"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="avatar" style={{ background: colorAvatar(p.sexo) }}>
                            {iniciales(nombrePaciente(p))}
                          </span>
                          {nombrePaciente(p)}
                        </Link>
                      </td>
                      <td>{edad ?? '—'}</td>
                      <td>{imc != null ? imc.toFixed(1) : '—'}</td>
                      <td>
                        {comidas === null ? (
                          '—'
                        ) : comidas > 0 ? (
                          <span className="pill pill-activo">Activo</span>
                        ) : (
                          <span className="pill pill-pendiente">Pendiente</span>
                        )}
                      </td>
                      <td>{comidas === null ? '—' : comidas > 0 ? 'Semanal' : 'Sin plan'}</td>
                      <td className="tabla-flecha" aria-hidden="true">›</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {mostrarNuevo ? (
        <NuevoPaciente onCerrar={() => setMostrarNuevo(false)} onCreado={alCrear} />
      ) : null}
    </div>
  )
}

export default Inicio