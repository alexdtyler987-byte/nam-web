import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const TIPOS = ['Desayuno', 'Almuerzo', 'Cena']
const ABREV = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function diasDeLaSemana() {
  const hoy = new Date()
  const posicionHoy = (hoy.getDay() + 6) % 7
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - posicionHoy)

  return ABREV.map((nombre, i) => {
    const fecha = new Date(lunes)
    fecha.setDate(lunes.getDate() + i)
    return { nombre, numero: fecha.getDate(), esHoy: i === posicionHoy }
  })
}

function TiraSemanal({ paciente, completadasHoy }) {
  const [mapa, setMapa] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)
      setError('')

      const [dieta, comidas] = await Promise.all([
        supabase.from('DIETA-PACIENTE').select('*').eq('paciente_id', paciente.id),
        supabase.from('COMIDAS').select('id, nombre'),
      ])

      if (cancelado) return

      const fallo = dieta.error || comidas.error
      if (fallo) {
        setError('No se pudo cargar el plan: ' + fallo.message)
        setCargando(false)
        return
      }

      const nombres = {}
      ;(comidas.data ?? []).forEach((c) => {
        nombres[c.id] = c.nombre
      })

      const nuevo = {}
      ;(dieta.data ?? []).forEach((f) => {
        nuevo[`${f.dia_semana}-${f.tipo_comida}`] = nombres[f.comida_id] || 'Comida'
      })

      setMapa(nuevo)
      setCargando(false)
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [paciente.id])

  if (cargando) return <div className="esqueleto esq-tira" aria-label="Cargando plan" />
  if (error) return <p className="registro-error" role="alert">{error}</p>

  const dias = diasDeLaSemana()

  return (
    <div className="tira">
      {dias.map((dia, i) => (
        <div key={dia.nombre} className={dia.esHoy ? 'tira-dia tira-hoy' : 'tira-dia'}>
          <div className="tira-fecha">
            {dia.nombre} {dia.numero}
          </div>

          {TIPOS.map((tipo) => {
            const nombre = mapa[`${i + 1}-${tipo}`]
            const listo = dia.esHoy && completadasHoy.includes(tipo.toLowerCase())

            return (
              <div
                key={tipo}
                className={nombre ? `tira-comida tira-${tipo.toLowerCase()}` : 'tira-comida tira-vacia'}
              >
                <small>{tipo}</small>
                <span>{nombre || 'Sin asignar'}</span>
                {listo ? <em className="tira-listo">Listo</em> : null}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default TiraSemanal