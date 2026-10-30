import { supabase } from '../supabaseClient'

// El catálogo es pequeño y casi no cambia: se descarga una sola vez por sesión.
let promesa = null

export function cargarCatalogo() {
  if (!promesa) {
    promesa = supabase
      .from('CATALOGO-CIE10')
      .select('codigo, descripcion, grupo, orden')
      .order('orden')
      .then(({ data, error }) => {
        if (error) {
          promesa = null
          throw error
        }
        return data ?? []
      })
  }
  return promesa
}

// Quita tildes y pasa a minúsculas para que "nutricion" encuentre "nutrición".
export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

// Texto que se guarda también en PACIENTES.Diagnostico (lo ve la app móvil).
export function textoCIE10(item) {
  return item ? `${item.codigo} · ${item.descripcion}` : null
}