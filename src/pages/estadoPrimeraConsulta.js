import { supabase } from '../supabaseClient'

// Los pasos del asistente de primera consulta
export const PASOS = [
  { id: 1, titulo: 'Paciente y acceso', detalle: 'Cuenta del paciente en la app' },
  { id: 2, titulo: 'Historia clínica', detalle: 'Motivo, antecedentes, alergias y hábitos' },
  { id: 3, titulo: 'Medidas', detalle: 'Peso, talla, cintura y cadera' },
  { id: 4, titulo: 'Notas de la consulta', detalle: 'Valoración, indicaciones y próximo control' },
  { id: 5, titulo: 'Diagnóstico y objetivo', detalle: 'CIE-10 y objetivo del tratamiento' },
]

// Un paso está "hecho" según los datos guardados, no según una marca aparte:
// así el estado siempre es fiel a la realidad, aunque algo se haya registrado desde otra pestaña.
// Devuelve { 1: true, 2: bool, 3: bool, 4: bool, 5: bool } o null si no se pudo consultar.
export async function consultarEstado(pacienteId) {
  const [historia, medidas, consultas, diagnosticos, plan] = await Promise.all([
    supabase.from('HISTORIA-CLINICA').select('paciente_id', { count: 'exact', head: true }).eq('paciente_id', pacienteId),
    supabase.from('HISTORIAL-MEDIDAS').select('id', { count: 'exact', head: true }).eq('paciente_id', pacienteId),
    supabase.from('CONSULTAS').select('id', { count: 'exact', head: true }).eq('paciente_id', pacienteId),
    supabase.from('DIAGNOSTICOS-PACIENTE').select('id', { count: 'exact', head: true }).eq('paciente_id', pacienteId),
    supabase.from('PLAN-NUTRICIONAL').select('objetivo').eq('paciente_id', pacienteId).maybeSingle(),
  ])

  if (historia.error || medidas.error || consultas.error || diagnosticos.error || plan.error) return null

  return {
    1: true,
    2: (historia.count ?? 0) > 0,
    3: (medidas.count ?? 0) > 0,
    4: (consultas.count ?? 0) > 0,
    5: (diagnosticos.count ?? 0) > 0 || Boolean(plan.data?.objetivo),
  }
}

// Ids de los pasos que faltan, en orden
export function pasosPendientes(estado) {
  return PASOS.filter((paso) => !estado[paso.id]).map((paso) => paso.id)
}