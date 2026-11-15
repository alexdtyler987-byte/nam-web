// Cálculos del plan nutricional. Son funciones puras (sin pantalla ni base de datos),
// compartidas por el editor de dieta, el resumen y, más adelante, el plan impreso.
// Así los números son siempre los mismos en todas las pantallas.

export const TIPOS_DIETA = ['Desayuno', 'Almuerzo', 'Cena']

// Energía por gramo (factores de Atwater)
export const KCAL_POR_GRAMO = { proteinas: 4, carbohidratos: 4, grasas: 9 }

// Rangos de referencia de distribución para adultos (AMDR, Institute of Medicine), en % de las calorías
export const RANGOS_AMDR = {
  proteinas: [10, 35],
  carbohidratos: [45, 65],
  grasas: [20, 35],
}

// Punto de partida editable. La nutricionista decide la distribución final de cada paciente.
export const DISTRIBUCION_SUGERIDA = { proteinas: 20, carbohidratos: 50, grasas: 30 }

// Un día se considera "en meta" si queda dentro de ±10 % de la meta calórica
export const TOLERANCIA_META = 0.1

// Diferencia (en puntos porcentuales) aceptada entre la distribución real y la objetivo
export const TOLERANCIA_MACROS = 5

export function redondear(valor, decimales = 0) {
  const factor = 10 ** decimales
  return Math.round(valor * factor) / factor
}

// Gramos de un macronutriente que corresponden a un % de la meta calórica
export function gramosDeMacro(metaKcal, porcentaje, macro) {
  return (Number(metaKcal) * (Number(porcentaje) / 100)) / KCAL_POR_GRAMO[macro]
}

// Nutrientes de una comida asignada (valores por porción 1x multiplicados por la porción elegida)
export function nutrientesDeFila(base, fila) {
  if (!base) return null
  const porcion = Number(fila.porcion) || 1
  return {
    kcal: Number(base.kcal) * porcion,
    proteinas: Number(base.proteinas_g) * porcion,
    grasa: Number(base.grasa_g) * porcion,
    carbohidratos: Number(base.carbohidratos_g) * porcion,
    fibra: Number(base.fibra_g) * porcion,
    incompleto: Number(base.ingredientes_sin_dato) > 0,
  }
}

// Totales de los 7 días (lunes = 1 ... domingo = 7).
// dieta: filas de DIETA-PACIENTE. nutrientes: mapa comida_id -> fila de COMIDA-NUTRIENTES.
export function totalesPorDia(dieta, nutrientes) {
  return [1, 2, 3, 4, 5, 6, 7].map((dia) => {
    const total = {
      kcal: 0,
      proteinas: 0,
      grasa: 0,
      carbohidratos: 0,
      fibra: 0,
      comidas: 0,
      incompleto: false,
    }

    TIPOS_DIETA.forEach((tipo) => {
      const fila = dieta.find((f) => f.dia_semana === dia && f.tipo_comida === tipo)
      if (!fila) return
      const n = nutrientesDeFila(nutrientes[fila.comida_id], fila)
      if (!n) return
      total.kcal += n.kcal
      total.proteinas += n.proteinas
      total.grasa += n.grasa
      total.carbohidratos += n.carbohidratos
      total.fibra += n.fibra
      total.comidas += 1
      if (n.incompleto) total.incompleto = true
    })

    return total
  })
}

// Días que tienen desayuno, almuerzo y cena
export function diasCompletos(totales) {
  return totales.filter((t) => t.comidas === TIPOS_DIETA.length)
}

// Promedio de una lista de días (o null si no hay días)
export function promedioDeDias(dias) {
  if (!dias.length) return null
  const media = (campo) => dias.reduce((suma, d) => suma + d[campo], 0) / dias.length
  return {
    kcal: media('kcal'),
    proteinas: media('proteinas'),
    grasa: media('grasa'),
    carbohidratos: media('carbohidratos'),
    fibra: media('fibra'),
  }
}

// Qué porcentaje de las calorías aporta cada macronutriente (según los gramos del promedio)
export function porcentajesDeEnergia(promedio) {
  const p = promedio.proteinas * KCAL_POR_GRAMO.proteinas
  const c = promedio.carbohidratos * KCAL_POR_GRAMO.carbohidratos
  const g = promedio.grasa * KCAL_POR_GRAMO.grasas
  const suma = p + c + g
  if (suma <= 0) return null
  return {
    proteinas: (p / suma) * 100,
    carbohidratos: (c / suma) * 100,
    grasas: (g / suma) * 100,
  }
}

// Compara las calorías con la meta: 'ok' (dentro de ±10 %), 'bajo' o 'alto'
export function estadoContraMeta(kcal, meta) {
  const diferencia = kcal - meta
  const proporcion = meta > 0 ? kcal / meta : 0
  let estado = 'ok'
  if (proporcion < 1 - TOLERANCIA_META) estado = 'bajo'
  else if (proporcion > 1 + TOLERANCIA_META) estado = 'alto'
  return { estado, diferencia, porcentaje: proporcion * 100 }
}

// Ritmo necesario para llegar al peso objetivo, en kg por semana.
// Positivo = bajar de peso, negativo = subir. Devuelve null si los días no son válidos.
export function ritmoSemanal(pesoActual, pesoObjetivo, dias) {
  if (!(dias > 0)) return null
  return (pesoActual - pesoObjetivo) / (dias / 7)
}