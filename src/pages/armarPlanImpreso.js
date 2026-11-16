// Datos del plan impreso. Son funciones puras: reciben las filas de la base de datos y devuelven
// la estructura lista para dibujar. Usan los mismos cálculos que el resto de la página (nutricionPlan.js).
import { TIPOS_DIETA, nutrientesDeFila, redondear, totalesPorDia } from './nutricionPlan'

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// 1,25 -> "1,25x" (coma decimal). La porción 1x no se muestra.
export function textoPorcion(porcion) {
  return Number(porcion) === 1 ? '' : `${String(porcion).replace('.', ',')}x`
}

// Cantidad de un ingrediente para mostrar: 112,5 g · 2 unid.
export function textoCantidad(ingrediente) {
  const unidad = ingrediente.unidad === 'un' ? 'unid.' : ingrediente.unidad
  return `${String(ingrediente.cantidad).replace('.', ',')} ${unidad}`
}

// Una fila por día con sus tres comidas y el total de calorías
export function armarSemana(dieta, comidas, nutrientes) {
  const comidaPorId = Object.fromEntries(comidas.map((c) => [c.id, c]))
  const totales = totalesPorDia(dieta, nutrientes)

  return DIAS_SEMANA.map((nombre, indice) => {
    const dia = indice + 1

    const delDia = TIPOS_DIETA.map((tipo) => {
      const fila = dieta.find((f) => f.dia_semana === dia && f.tipo_comida === tipo)
      if (!fila) return { tipo, vacia: true }

      const n = nutrientesDeFila(nutrientes[fila.comida_id], fila)
      return {
        tipo,
        vacia: false,
        nombre: comidaPorId[fila.comida_id]?.nombre ?? 'Comida',
        porcion: Number(fila.porcion) || 1,
        kcal: n ? redondear(n.kcal) : null,
        incompleto: n ? n.incompleto : false,
      }
    })

    return { nombre, comidas: delDia, total: totales[indice] }
  })
}

export function hayComidas(semana) {
  return semana.some((dia) => dia.comidas.some((c) => !c.vacia))
}

// Comidas distintas del plan, con su preparación y los ingredientes ajustados a la porción asignada.
// Orden: desayunos, almuerzos y cenas; dentro de cada tipo, por nombre.
export function preparaciones(dieta, comidas, ingredientes, productos) {
  const comidaPorId = Object.fromEntries(comidas.map((c) => [c.id, c]))
  const productoPorId = Object.fromEntries(productos.map((p) => [p.id, p]))
  const vistas = new Map()

  dieta.forEach((fila) => {
    if (vistas.has(fila.comida_id)) return
    const comida = comidaPorId[fila.comida_id]
    if (!comida) return
    vistas.set(fila.comida_id, {
      id: comida.id,
      nombre: comida.nombre,
      tipo: comida.tipo,
      preparacion: comida.preparacion ?? '',
      porcion: Number(fila.porcion) || 1,
    })
  })

  const orden = (tipo) => {
    const posicion = TIPOS_DIETA.indexOf(tipo)
    return posicion === -1 ? TIPOS_DIETA.length : posicion
  }

  return Array.from(vistas.values())
    .sort((a, b) => orden(a.tipo) - orden(b.tipo) || a.nombre.localeCompare(b.nombre))
    .map((comida) => ({
      ...comida,
      ingredientes: ingredientes
        .filter((i) => i.comida_id === comida.id)
        .map((i) => ({
          nombre: productoPorId[i.producto_id]?.nombre ?? 'Ingrediente',
          cantidad: redondear(Number(i.cantidad) * comida.porcion, 1),
          unidad: i.unidad,
        })),
    }))
}