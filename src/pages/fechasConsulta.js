// Utilidades de fechas para las consultas.
// Las fechas "AAAA-MM-DD" se leen como fecha LOCAL: si se usara new Date("2026-10-31") a secas,
// JavaScript la toma como medianoche UTC y en Lima se mostraría el día anterior.

export const TIPOS_CONSULTA = {
  primera: 'Primera consulta',
  control: 'Control',
}

export function aFechaLocal(iso) {
  const [anio, mes, dia] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

export function fechaLarga(iso) {
  return aFechaLocal(iso).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Días entre dos fechas "AAAA-MM-DD" (positivo si "hasta" es posterior a "desde")
export function diasEntre(desde, hasta) {
  const aUtc = (texto) => {
    const [anio, mes, dia] = texto.split('-').map(Number)
    return Date.UTC(anio, mes - 1, dia)
  }
  return Math.round((aUtc(hasta) - aUtc(desde)) / 86400000)
}

// Texto para un próximo control respecto de hoy: "hoy", "en 4 días", "venció hace 3 días"...
export function textoPlazo(dias) {
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  if (dias > 1) return `en ${dias} días`
  if (dias === -1) return 'venció ayer'
  return `venció hace ${Math.abs(dias)} días`
}