import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './DietaSemanal.css'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const TIPOS = ['Desayuno', 'Almuerzo', 'Cena']
const PORCIONES = [0.5, 0.75, 1, 1.25, 1.5, 2]
const CONFLICTO = 'paciente_id,dia_semana,tipo_comida'

function DietaSemanal({ paciente }) {
  const [comidas, setComidas] = useState([])
  const [ingredientes, setIngredientes] = useState([])
  const [productos, setProductos] = useState([])
  const [dieta, setDieta] = useState([])
  const [porciones, setPorciones] = useState({ Desayuno: 1, Almuerzo: 1, Cena: 1 })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    let cancelado = false

    async function cargarCatalogo() {
      const [c, i, p] = await Promise.all([
        supabase.from('COMIDAS').select('*').order('nombre'),
        supabase.from('COMIDA-INGREDIENTES').select('*'),
        supabase.from('PRODUCTOS').select('id, nombre, stock'),
      ])

      if (cancelado) return

      const fallo = c.error || i.error || p.error
      if (fallo) {
        setError('No se pudo cargar el catálogo: ' + fallo.message)
        return
      }

      setComidas(c.data ?? [])
      setIngredientes(i.data ?? [])
      setProductos(p.data ?? [])
    }

    cargarCatalogo()

    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    let cancelado = false

    setCargando(true)
    setDieta([])
    setError('')
    setMensaje('')

    async function cargarDieta() {
      const { data, error: consultaError } = await supabase
        .from('DIETA-PACIENTE')
        .select('*')
        .eq('paciente_id', paciente.id)

      if (cancelado) return

      if (consultaError) {
        setError('No se pudo cargar la dieta: ' + consultaError.message)
        setCargando(false)
        return
      }

      const lista = data ?? []
      const nuevas = { Desayuno: 1, Almuerzo: 1, Cena: 1 }
      lista.forEach((f) => {
        nuevas[f.tipo_comida] = Number(f.porcion)
      })

      setDieta(lista)
      setPorciones(nuevas)
      setCargando(false)
    }

    cargarDieta()

    return () => {
      cancelado = true
    }
  }, [paciente.id])

  function buscarFila(dia, tipo) {
    return dieta.find((f) => f.dia_semana === dia && f.tipo_comida === tipo)
  }

  function productosSinStock(comidaId) {
    return ingredientes
      .filter((i) => i.comida_id === comidaId)
      .map((i) => productos.find((p) => p.id === i.producto_id))
      .filter((p) => p && !(p.stock > 0))
      .map((p) => p.nombre)
  }

  async function cambiarComida(dia, tipo, valor) {
    setError('')
    setMensaje('')

    if (valor === '') {
      const { error: borrarError } = await supabase
        .from('DIETA-PACIENTE')
        .delete()
        .eq('paciente_id', paciente.id)
        .eq('dia_semana', dia)
        .eq('tipo_comida', tipo)

      if (borrarError) {
        setError('No se pudo quitar la comida: ' + borrarError.message)
        return
      }

      setDieta((actual) =>
        actual.filter((f) => !(f.dia_semana === dia && f.tipo_comida === tipo)),
      )
      return
    }

    const fila = {
      paciente_id: paciente.id,
      dia_semana: dia,
      tipo_comida: tipo,
      comida_id: Number(valor),
      porcion: porciones[tipo],
    }

    const { data, error: guardarError } = await supabase
      .from('DIETA-PACIENTE')
      .upsert(fila, { onConflict: CONFLICTO })
      .select()

    if (guardarError) {
      setError('No se pudo guardar: ' + guardarError.message)
      return
    }

    setDieta((actual) => [
      ...actual.filter((f) => !(f.dia_semana === dia && f.tipo_comida === tipo)),
      data[0],
    ])
  }

  async function repetirLunes(tipo) {
    setError('')
    setMensaje('')

    const base = buscarFila(1, tipo)
    if (!base) {
      setError('Primero elige una comida para el lunes.')
      return
    }

    const filas = [2, 3, 4, 5, 6, 7].map((dia) => ({
      paciente_id: paciente.id,
      dia_semana: dia,
      tipo_comida: tipo,
      comida_id: base.comida_id,
      porcion: porciones[tipo],
    }))

    const { data, error: guardarError } = await supabase
      .from('DIETA-PACIENTE')
      .upsert(filas, { onConflict: CONFLICTO })
      .select()

    if (guardarError) {
      setError('No se pudo repetir la comida: ' + guardarError.message)
      return
    }

    setDieta((actual) => [
      ...actual.filter((f) => !(f.tipo_comida === tipo && f.dia_semana !== 1)),
      ...data,
    ])
    setMensaje(`${tipo} del lunes repetido toda la semana.`)
  }

  async function cambiarPorcion(tipo, valor) {
    setError('')
    setMensaje('')

    const nueva = Number(valor)
    setPorciones((actual) => ({ ...actual, [tipo]: nueva }))

    if (!dieta.some((f) => f.tipo_comida === tipo)) return

    const { error: actualizarError } = await supabase
      .from('DIETA-PACIENTE')
      .update({ porcion: nueva })
      .eq('paciente_id', paciente.id)
      .eq('tipo_comida', tipo)

    if (actualizarError) {
      setError('No se pudo cambiar la porción: ' + actualizarError.message)
      return
    }

    setDieta((actual) =>
      actual.map((f) => (f.tipo_comida === tipo ? { ...f, porcion: nueva } : f)),
    )
  }

  const resumen = {}
  dieta.forEach((fila) => {
    ingredientes
      .filter((i) => i.comida_id === fila.comida_id)
      .forEach((i) => {
        const clave = `${i.producto_id}-${i.unidad}`
        if (!resumen[clave]) {
          resumen[clave] = { producto_id: i.producto_id, unidad: i.unidad, total: 0 }
        }
        resumen[clave].total += Number(i.cantidad) * Number(fila.porcion)
      })
  })

  const listaResumen = Object.values(resumen)
    .map((r) => ({
      ...r,
      nombre: productos.find((p) => p.id === r.producto_id)?.nombre || 'Producto',
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <div className="dieta">
      <h3>Dieta semanal</h3>

      {error ? <p className="dieta-error">{error}</p> : null}
      {mensaje ? <p className="dieta-ok">{mensaje}</p> : null}
      {cargando ? <p>Cargando dieta…</p> : null}

      {!cargando && comidas.length === 0 && !error ? (
        <p>Todavía no hay comidas en el catálogo.</p>
      ) : null}

      {!cargando && comidas.length > 0 ? (
        <>
          <div className="dieta-scroll">
            <table className="dieta-tabla">
              <thead>
                <tr>
                  <th></th>
                  {DIAS.map((dia) => (
                    <th key={dia}>{dia}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIPOS.map((tipo) => (
                  <tr key={tipo}>
                    <th scope="row">
                      {tipo}
                      <div className="dieta-fila-controles">
                        <label>
                          Porción
                          <select
                            value={porciones[tipo]}
                            onChange={(e) => cambiarPorcion(tipo, e.target.value)}
                          >
                            {PORCIONES.map((p) => (
                              <option key={p} value={p}>
                                {p}x
                              </option>
                            ))}
                          </select>
                        </label>
                        <button type="button" onClick={() => repetirLunes(tipo)}>
                          Repetir lunes
                        </button>
                      </div>
                    </th>
                    {DIAS.map((_, indice) => {
                      const dia = indice + 1
                      const fila = buscarFila(dia, tipo)
                      const faltantes = fila ? productosSinStock(fila.comida_id) : []

                      return (
                        <td key={dia}>
                          <select
                            value={fila ? String(fila.comida_id) : ''}
                            onChange={(e) => cambiarComida(dia, tipo, e.target.value)}
                          >
                            <option value="">—</option>
                            {comidas
                              .filter((c) => c.tipo === tipo)
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nombre}
                                </option>
                              ))}
                          </select>
                          {faltantes.length > 0 ? (
                            <small className="dieta-aviso">
                              ⚠ Sin stock: {faltantes.join(', ')}
                            </small>
                          ) : null}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="dieta-resumen">
            <summary>Ingredientes de la semana ({listaResumen.length})</summary>
            {listaResumen.length === 0 ? (
              <p>Aún no hay comidas asignadas.</p>
            ) : (
              <ul>
                {listaResumen.map((r) => (
                  <li key={`${r.producto_id}-${r.unidad}`}>
                    {r.nombre}: {Math.round(r.total * 10) / 10} {r.unidad}
                  </li>
                ))}
              </ul>
            )}
          </details>
        </>
      ) : null}
    </div>
  )
}

export default DietaSemanal