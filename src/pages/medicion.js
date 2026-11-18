import { supabase } from '../supabaseClient'
import { calcularIMC, fechaHoy } from './utilidades'

function numeroONulo(valor) {
  return valor === '' || valor == null ? null : Number(valor)
}

// Guarda una medición: actualiza al paciente y agrega un punto al historial (gráfica de evolución).
// La usan la ventana «Registrar nueva medición» y el asistente de primera consulta.
//
// valores: { peso, altura, cintura, cadera }
//   y, opcionalmente: pesoIdeal, sexo, fechaNacimiento (solo se guardan si vienen en el objeto)
//
// Devuelve:
//   { ok: true, paciente, historial }              todo salió bien (historial = si se agregó un punto a la gráfica)
//   { ok: false, mensaje }                          no se pudo guardar al paciente
//   { ok: false, mensaje, paciente }                el paciente se guardó, pero falló el historial
export async function guardarMedicion(paciente, valores) {
  const peso = String(valores.peso ?? '').trim()
  const altura = String(valores.altura ?? '').trim()

  const cambios = {
    'Peso actual': peso || null,
    Altura: altura || null,
    IMC: calcularIMC(valores.peso, valores.altura),
    cintura: numeroONulo(valores.cintura),
    cadera: numeroONulo(valores.cadera),
    ultima_actualizacion: new Date().toISOString(),
  }
  if ('pesoIdeal' in valores) cambios['Peso ideal'] = String(valores.pesoIdeal ?? '').trim() || null
  if ('sexo' in valores) cambios.sexo = valores.sexo || null
  if ('fechaNacimiento' in valores) cambios.fecha_nacimiento = valores.fechaNacimiento || null

  const { data, error } = await supabase.from('PACIENTES').update(cambios).eq('id', paciente.id).select()

  if (error || !data?.[0]) {
    return {
      ok: false,
      mensaje: 'Error al guardar: ' + (error ? error.message : 'no se pudo actualizar al paciente.'),
    }
  }

  const actualizado = data[0]
  const pesoNum = Number(valores.peso)
  const alturaNum = Number(valores.altura)
  let historial = false

  if (pesoNum > 0 && alturaNum > 0) {
    const { error: errorHistorial } = await supabase.from('HISTORIAL-MEDIDAS').upsert(
      {
        paciente_id: paciente.id,
        fecha: fechaHoy(),
        peso: pesoNum,
        altura: alturaNum,
        imc: calcularIMC(valores.peso, valores.altura),
        cintura: numeroONulo(valores.cintura),
        cadera: numeroONulo(valores.cadera),
      },
      { onConflict: 'paciente_id,fecha' },
    )

    if (errorHistorial) {
      return {
        ok: false,
        paciente: actualizado,
        mensaje: 'Datos guardados, pero no se pudo registrar el historial: ' + errorHistorial.message,
      }
    }
    historial = true
  }

  return { ok: true, paciente: actualizado, historial }
}