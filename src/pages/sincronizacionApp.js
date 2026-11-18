import { supabase } from '../supabaseClient'

// La app móvil lee estas columnas de PACIENTES: Diagnostico, "Plan recomendado", Historial y "Peso ideal".
// La web guarda la información en tablas estructuradas (diagnósticos, plan nutricional, historia clínica)
// y, con estas funciones, copia un resumen en texto a esas columnas para que la app siga mostrándolo.

// "Bajar de peso · 1616 kcal al día"
export function textoPlanRecomendado(plan) {
  if (!plan) return ''
  const partes = []
  if (plan.objetivo) partes.push(plan.objetivo)
  if (plan.meta_kcal != null) partes.push(`${Math.round(Number(plan.meta_kcal))} kcal al día`)
  return partes.join(' · ')
}

// El historial que ve la app son los antecedentes y enfermedades de la historia clínica
export function textoHistorial(ficha) {
  return String(ficha?.antecedentes ?? '').trim()
}

// Actualiza una columna de PACIENTES solo si hay texto nuevo y es distinto del actual.
// Si no hay texto, NO borra lo que ya había (por ejemplo, un historial escrito antes a mano).
// Devuelve la fila actualizada del paciente, o null si no hizo falta (o falló).
async function actualizarColumna(paciente, columna, texto) {
  if (!paciente || !texto) return null
  if (String(paciente[columna] ?? '') === texto) return null

  const { data, error } = await supabase
    .from('PACIENTES')
    .update({ [columna]: texto })
    .eq('id', paciente.id)
    .select()

  if (error || !data?.[0]) {
    console.error(`No se pudo sincronizar "${columna}" con la app:`, error?.message)
    return null
  }
  return data[0]
}

export function sincronizarPlanRecomendado(paciente, plan) {
  return actualizarColumna(paciente, 'Plan recomendado', textoPlanRecomendado(plan))
}

export function sincronizarHistorial(paciente, ficha) {
  return actualizarColumna(paciente, 'Historial', textoHistorial(ficha))
}