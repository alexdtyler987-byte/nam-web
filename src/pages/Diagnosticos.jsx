import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import SelectorCIE10 from './SelectorCIE10'
import { cargarCatalogo, textoCIE10 } from './cie10'
import { formatoFecha } from './utilidades'
import './Diagnosticos.css'

function Diagnosticos({ paciente, onPacienteActualizado }) {
  const [lista, setLista] = useState([])
  const [catalogo, setCatalogo] = useState({})
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  async function leer() {
    const { data, error: err } = await supabase
      .from('DIAGNOSTICOS-PACIENTE')
      .select('id, codigo, tipo, created_at')
      .eq('paciente_id', paciente.id)
      .order('id')
    if (err) throw err
    return data ?? []
  }

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setError('')
    setMensaje('')

    Promise.all([leer(), cargarCatalogo()])
      .then(([filas, filasCatalogo]) => {
        if (cancelado) return
        setCatalogo(Object.fromEntries(filasCatalogo.map((c) => [c.codigo, c])))
        setLista(filas)
        setCargando(false)
      })
      .catch((e) => {
        if (cancelado) return
        setError('No se pudieron cargar los diagnósticos: ' + e.message)
        setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [paciente.id])

  // Copia el diagnóstico principal al texto de PACIENTES.Diagnostico,
  // para que la app móvil siga mostrando algo legible.
  async function sincronizarTexto(filas) {
    const principal = filas.find((f) => f.tipo === 'principal')
    const texto = principal ? textoCIE10(catalogo[principal.codigo]) : null

    const { data, error: err } = await supabase
      .from('PACIENTES')
      .update({ Diagnostico: texto })
      .eq('id', paciente.id)
      .select()

    if (err) {
      setError('El diagnóstico se guardó, pero no se pudo actualizar la ficha: ' + err.message)
      return
    }
    if (data?.[0] && onPacienteActualizado) onPacienteActualizado(data[0])
  }

  async function agregar(item) {
    if (!item) return
    setOcupado(true)
    setError('')
    setMensaje('')

    try {
      const esPrimero = lista.length === 0
      const { error: err } = await supabase.from('DIAGNOSTICOS-PACIENTE').insert({
        paciente_id: paciente.id,
        codigo: item.codigo,
        tipo: esPrimero ? 'principal' : 'secundario',
      })
      if (err) throw err

      const filas = await leer()
      setLista(filas)
      if (esPrimero) await sincronizarTexto(filas)
      setMensaje(`Se agregó ${item.codigo}.`)
    } catch (e) {
      setError('No se pudo agregar el diagnóstico: ' + e.message)
    } finally {
      setOcupado(false)
    }
  }

  async function hacerPrincipal(fila) {
    setOcupado(true)
    setError('')
    setMensaje('')

    try {
      // Primero se libera el principal actual (solo puede haber uno).
      const { error: e1 } = await supabase
        .from('DIAGNOSTICOS-PACIENTE')
        .update({ tipo: 'secundario' })
        .eq('paciente_id', paciente.id)
        .eq('tipo', 'principal')
      if (e1) throw e1

      const { error: e2 } = await supabase
        .from('DIAGNOSTICOS-PACIENTE')
        .update({ tipo: 'principal' })
        .eq('id', fila.id)
      if (e2) throw e2

      const filas = await leer()
      setLista(filas)
      await sincronizarTexto(filas)
      setMensaje(`${fila.codigo} es ahora el diagnóstico principal.`)
    } catch (e) {
      setError('No se pudo cambiar el diagnóstico principal: ' + e.message)
      try {
        setLista(await leer())
      } catch {
        // se queda con la lista que ya estaba en pantalla
      }
    } finally {
      setOcupado(false)
    }
  }

  async function quitar(fila) {
    if (!window.confirm(`¿Quitar ${fila.codigo} de este paciente?`)) return

    setOcupado(true)
    setError('')
    setMensaje('')

    try {
      const { error: err } = await supabase
        .from('DIAGNOSTICOS-PACIENTE')
        .delete()
        .eq('id', fila.id)
      if (err) throw err

      let filas = await leer()

      // Si se quitó el principal y quedan otros, el más antiguo pasa a ser el principal.
      if (fila.tipo === 'principal' && filas.length > 0) {
        const { error: errPromo } = await supabase
          .from('DIAGNOSTICOS-PACIENTE')
          .update({ tipo: 'principal' })
          .eq('id', filas[0].id)
        if (errPromo) throw errPromo
        filas = await leer()
      }

      setLista(filas)
      if (fila.tipo === 'principal') await sincronizarTexto(filas)
      setMensaje(`Se quitó ${fila.codigo}.`)
    } catch (e) {
      setError('No se pudo quitar el diagnóstico: ' + e.message)
    } finally {
      setOcupado(false)
    }
  }

  const ordenada = [...lista].sort(
    (a, b) =>
      (b.tipo === 'principal' ? 1 : 0) - (a.tipo === 'principal' ? 1 : 0) || a.id - b.id,
  )

  return (
    <section className="tarjeta">
      <h2>Diagnósticos (CIE-10)</h2>
      <p className="cie-ayuda">
        Solo enfermedades y condiciones relacionadas con la nutrición. El diagnóstico principal
        también se guarda como texto en la ficha del paciente.
      </p>

      {cargando ? (
        <p className="estado">Cargando diagnósticos…</p>
      ) : ordenada.length === 0 ? (
        <p className="estado">Este paciente aún no tiene diagnósticos. Agrega el primero abajo.</p>
      ) : (
        <ul className="cie-diagnosticos">
          {ordenada.map((fila) => {
            const info = catalogo[fila.codigo]
            return (
              <li key={fila.id} className="cie-fila">
                <span className="cie-codigo">{fila.codigo}</span>
                <div className="cie-detalle">
                  <strong>{info?.descripcion ?? 'Código fuera del catálogo'}</strong>
                  <span className="cie-grupo">
                    {info?.grupo ? `${info.grupo} · ` : ''}
                    Agregado el {formatoFecha(fila.created_at)}
                  </span>
                </div>
                {fila.tipo === 'principal' ? (
                  <span className="badge badge-ok">Principal</span>
                ) : (
                  <button
                    type="button"
                    className="btn-secundario cie-boton"
                    onClick={() => hacerPrincipal(fila)}
                    disabled={ocupado}
                  >
                    Marcar como principal
                  </button>
                )}
                <button
                  type="button"
                  className="cie-quitar"
                  onClick={() => quitar(fila)}
                  disabled={ocupado}
                >
                  Quitar
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="campo cie-agregar">
        <span>Agregar diagnóstico</span>
        <SelectorCIE10
          value={null}
          onChange={agregar}
          excluir={lista.map((d) => d.codigo)}
          disabled={ocupado || cargando}
        />
      </div>

      {error ? (
        <p className="registro-error" role="alert">
          {error}
        </p>
      ) : null}
      {mensaje ? (
        <p className="mensaje-guardado" role="status">
          {mensaje}
        </p>
      ) : null}
    </section>
  )
}

export default Diagnosticos