import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { diaLima, fechaHoy, horaLima, iniciales, nombrePaciente, rangoDiaLima } from './utilidades'
import FotoComida from './FotoComida'
import { esReciente, textoAlerta } from './fotos'
import './Panel.css'

function Panel() {
  const navigate = useNavigate()
  const location = useLocation()
  const [nutricionista, setNutricionista] = useState('')
  const [pacientes, setPacientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [comidasHoy, setComidasHoy] = useState([])
  const [alertas, setAlertas] = useState([])
  const [conteoPlanes, setConteoPlanes] = useState(null)
  const [versionPlanes, setVersionPlanes] = useState(0)

  const enInicio = location.pathname.replace(/\/$/, '') === '/panel'

  function refrescarPlanes() {
    setVersionPlanes((v) => v + 1)
  }

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelado) return

      if (!user) {
        navigate('/login', { replace: true })
        return
      }

      setNutricionista(user.user_metadata?.nombre || user.email || '')

      const { data, error: consultaError } = await supabase
        .from('PACIENTES')
        .select('*')
        .eq('nutricionista_id', user.id)
        .order('Nombre')

      if (cancelado) return

      if (consultaError) {
        setError(consultaError.message || 'No se pudieron cargar los pacientes.')
        setPacientes([])
      } else {
        setPacientes(data ?? [])
      }
      setCargando(false)
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [navigate])

  useEffect(() => {
    if (cargando) return
    let cancelado = false

    async function cargarPlanes() {
      const { data, error: rpcError } = await supabase.rpc('conteo_planes')
      if (cancelado) return

      if (rpcError) {
        console.error('conteo_planes:', rpcError.message)
        setConteoPlanes(null)
        return
      }

      const mapa = {}
      ;(data ?? []).forEach((fila) => {
        mapa[fila.paciente_id] = Number(fila.total)
      })
      setConteoPlanes(mapa)
    }

    cargarPlanes()

    return () => {
      cancelado = true
    }
  }, [cargando, versionPlanes])

  useEffect(() => {
    if (pacientes.length === 0) return

    const ids = pacientes.map((p) => p.id)
    let cancelado = false

    async function cargarComidasHoy() {
      const { data } = await supabase
        .from('PROGRESO-COMIDAS')
        .select('*')
        .in('paciente_id', ids)
        .eq('completado', true)
        .gte('hora_completado', rangoDiaLima(fechaHoy())[0])
        .lt('hora_completado', rangoDiaLima(fechaHoy())[1])

      if (!cancelado) setComidasHoy(data ?? [])
    }

    cargarComidasHoy()

    const canal = supabase
      .channel('progreso-comidas-nutricionista')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'PROGRESO-COMIDAS' },
        (payload) => {
          const fila = payload.new
          if (!fila || !ids.includes(fila.paciente_id)) return

          setComidasHoy((actual) => {
            const sinEsta = actual.filter((c) => c.id !== fila.id)
            return fila.completado && diaLima(fila.hora_completado) === fechaHoy()
              ? [...sinEsta, fila]
              : sinEsta
          })

          // Solo hay alerta cuando llega una comida NUEVA (hace pocos minutos).
          // Así la limpieza automática de fotos viejas no genera avisos falsos.
          const momento = fila.foto_subida_en || fila.hora_completado
          if (fila.completado && !fila.foto_borrada_en && esReciente(momento)) {
            const paciente = pacientes.find((p) => p.id === fila.paciente_id)
            setAlertas((actual) =>
              [
                {
                  clave: `${fila.id}-${Date.now()}`,
                  filaId: fila.id,
                  nombre: paciente ? nombrePaciente(paciente) : 'Un paciente',
                  tipo: fila.tipo_comida,
                  hora: fila.hora_completado || momento || new Date().toISOString(),
                  fotoPath: fila.foto_path || null,
                },
                // Si el paciente repite la foto, reemplaza el aviso anterior de esa comida.
                ...actual.filter((x) => x.filaId !== fila.id),
              ].slice(0, 10),
            )
          }
        },
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(canal)
    }
  }, [pacientes])

  async function cerrarSesion() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell">
      <aside className="barra">
        <span className="logo barra-logo">ñam</span>

        <nav className="barra-nav">
          <NavLink
            to="/panel"
            end
            className={({ isActive }) => (isActive ? 'nav-item nav-activo' : 'nav-item')}
          >
            Inicio
          </NavLink>
          <NavLink
            to="/panel/pacientes"
            className={({ isActive }) => (isActive ? 'nav-item nav-activo' : 'nav-item')}
          >
            Pacientes
          </NavLink>
        </nav>

        <div className="barra-perfil">
          <div className="perfil">
            <span className="avatar" style={{ background: '#9BDE5B' }}>
              {iniciales(nutricionista)}
            </span>
            <div>
              <strong>{nutricionista || 'Nutricionista'}</strong>
              <span className="rol">Nutricionista</span>
            </div>
          </div>
          <button type="button" className="btn-secundario" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="contenido">
        {alertas.length > 0 && !enInicio ? (
          <section className="alertas" aria-live="polite">
            <div className="alertas-cabecera">
              <h2>Alertas recientes</h2>
              <button type="button" onClick={() => setAlertas([])}>
                Limpiar todas
              </button>
            </div>
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
                    onClick={() => setAlertas((actual) => actual.filter((x) => x.clave !== a.clave))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Outlet
          context={{
            pacientes,
            setPacientes,
            comidasHoy,
            cargando,
            error,
            nutricionista,
            conteoPlanes,
            refrescarPlanes,
            alertas,
            setAlertas,
          }}
        />
      </main>
    </div>
  )
}

export default Panel