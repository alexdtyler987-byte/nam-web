import { supabase } from '../supabaseClient'

const BUCKET = 'fotos-comidas'
const VIGENCIA = 3600 // el enlace dura 1 hora (en segundos)
const MARGEN = 300 // se renueva 5 minutos antes de que venza

// path -> { promesa, vence }
// Guardar la promesa evita pedir dos veces el mismo enlace si dos componentes
// lo piden a la vez, y reutilizar el mismo enlace permite que el navegador
// guarde la imagen en su caché (menos transferencia de Supabase).
const cache = new Map()

export function urlFirmada(path, forzar = false) {
  if (!path) return Promise.resolve(null)

  const guardada = cache.get(path)
  if (!forzar && guardada && guardada.vence > Date.now()) return guardada.promesa

  const promesa = supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, VIGENCIA)
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) {
        cache.delete(path)
        return null
      }
      return data.signedUrl
    })
    .catch(() => {
      cache.delete(path)
      return null
    })

  cache.set(path, { promesa, vence: Date.now() + (VIGENCIA - MARGEN) * 1000 })
  return promesa
}

// Texto de las alertas: con foto "subió la foto", sin foto (app antigua) "confirmó".
export function textoAlerta(alerta) {
  const comida = String(alerta.tipo || '').toLowerCase()
  return alerta.fotoPath ? `subió la foto de su ${comida}` : `confirmó su ${comida}`
}

// ¿Pasó hace pocos minutos? Sirve para no mostrar alertas por cambios viejos
// (por ejemplo, cuando la limpieza automática borra una foto antigua).
export function esReciente(valor, minutos = 5) {
  if (!valor) return false
  const momento = new Date(valor).getTime()
  return Number.isFinite(momento) && Math.abs(Date.now() - momento) < minutos * 60 * 1000
}