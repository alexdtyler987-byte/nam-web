// Contraseña inicial sugerida para el paciente: 4 letras + 4 números, fácil de dictar o copiar.
// Se omiten las letras y números que se confunden entre sí (l, i, o, 0, 1).
const LETRAS = 'abcdefghjkmnpqrstuvwxyz'
const DIGITOS = '23456789'

function sorteo(limite) {
  const valor = new Uint32Array(1)
  globalThis.crypto.getRandomValues(valor)
  return valor[0] % limite
}

export function generarContrasena() {
  let texto = ''
  for (let i = 0; i < 4; i += 1) texto += LETRAS[sorteo(LETRAS.length)]
  for (let i = 0; i < 4; i += 1) texto += DIGITOS[sorteo(DIGITOS.length)]
  return texto
}