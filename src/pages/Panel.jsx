import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { fechaHoy, iniciales, nombrePaciente } from './utilidades'
import './Panel.css'

function Panel() {
  const navigate = useNavigate()
  const [nutricionista, setNutricionista] = useState('')
  const [pacientes, setPacientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [comidasHoy, setComidasHoy] = useState([])
  const [alertas, setAlertas] = useState([])

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
    if (pacientes.length === 0) return

    const ids = pacientes.map((p) => p.id)
    let cancelado = false

    async function cargarComidasHoy() {
      const { data } = await supabase
        .from('PROGRESO-COMIDAS')
        .select('*')
        .in('paciente_id', ids)
        .eq('fecha', fechaHoy())

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
            return fila.fecha === fechaHoy() ? [...sinEsta, fila] : sinEsta
          })

          if (fila.completado) {
            const paciente = pacientes.find((p) => p.id === fila.paciente_id)
            setAlertas((actual) =>
              [
                {
                  clave: `${fila.id}-${Date.now()}`,
                  nombre: paciente ? nombrePaciente(paciente) : 'Un paciente',
                  tipo: fila.tipo_comida,
                  hora: fila.hora_completado || new Date().toISOString(),
                },
                ...actual,
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
          <span className="nav-item nav-off" aria-disabled="true">
            Inicio <small>Próximamente</small>
          </span>
          <NavLink
            to="/panel"
            className={({ isActive }) => (isActive ? 'nav-item nav-activo' : 'nav-item')}
          >
            Pacientes
          </NavLink>
          <span className="nav-item nav-off" aria-disabled="true">
            Calendario <small>Próximamente</small>
          </span>
          <span className="nav-item nav-off" aria-disabled="true">
            Perfil <small>Próximamente</small>
          </span>
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
        {alertas.length > 0 ? (
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
                  <span>
                    <strong>{a.nombre}</strong> confirmó su {String(a.tipo).toLowerCase()} ·{' '}
                    {new Date(a.hora).toLocaleTimeString('es-PE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
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

        <Outlet context={{ pacientes, setPacientes, comidasHoy, cargando, error }} />
      </main>
    </div>
  )
}

export default Panel