import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Carga el plan nutricional del paciente (meta calórica, objetivos y macronutrientes) y permite guardarlo.
// Devuelve:
//  - plan: la fila de PLAN-NUTRICIONAL (o null si aún no tiene)
//  - cargando: true mientras se consulta
//  - error: texto si no se pudo cargar
//  - guardar(cambios): guarda SOLO los campos indicados y devuelve { ok, mensaje, plan }
//  - recargar(): vuelve a consultar el plan (por ejemplo, si otra pantalla lo modificó)
function usePlanNutricional(pacienteId) {
  const [plan, setPlan] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    if (pacienteId == null) return
    let cancelado = false

    setCargando(true)
    setError('')
    setPlan(null)

    supabase
      .from('PLAN-NUTRICIONAL')
      .select('*')
      .eq('paciente_id', pacienteId)
      .maybeSingle()
      .then(({ data, error: consultaError }) => {
        if (cancelado) return
        if (consultaError) setError('No se pudo cargar el plan nutricional: ' + consultaError.message)
        else setPlan(data ?? null)
        setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [pacienteId, recarga])

  const recargar = useCallback(() => setRecarga((n) => n + 1), [])

  const guardar = useCallback(
    async (cambios) => {
      if (pacienteId == null) return { ok: false, mensaje: 'No hay un paciente seleccionado.' }

      // upsert: crea la fila si no existe y, si existe, cambia solo los campos enviados
      const { data, error: guardarError } = await supabase
        .from('PLAN-NUTRICIONAL')
        .upsert(
          { ...cambios, paciente_id: pacienteId, updated_at: new Date().toISOString() },
          { onConflict: 'paciente_id' },
        )
        .select()
        .single()

      if (guardarError) return { ok: false, mensaje: guardarError.message }

      setPlan(data)
      return { ok: true, mensaje: '', plan: data }
    },
    [pacienteId],
  )

  return { plan, cargando, error, guardar, recargar }
}

export default usePlanNutricional