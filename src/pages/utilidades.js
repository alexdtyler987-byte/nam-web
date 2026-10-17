export function calcularIMC(peso, altura) {
  const pesoNum = Number(peso)
  const alturaNum = Number(altura)

  if (!Number.isFinite(pesoNum) || !Number.isFinite(alturaNum) || pesoNum <= 0 || alturaNum <= 0) {
    return null
  }

  return Math.round((pesoNum / (alturaNum * alturaNum)) * 10) / 10
}

export function categoriaIMC(imc) {
  if (imc == null) return 'Sin datos'
  if (imc < 18.5) return 'Bajo peso'
  if (imc < 25) return 'Normal'
  if (imc < 30) return 'Sobrepeso'
  return 'Obesidad'
}

export function claseChip(categoria) {
  const clases = {
    'Bajo peso': 'chip chip-bajo',
    Normal: 'chip chip-normal',
    Sobrepeso: 'chip chip-sobrepeso',
    Obesidad: 'chip chip-obesidad',
  }
  return clases[categoria] || 'chip'
}

export function colorCategoria(imc) {
  if (imc == null) return '#B9C2BB'
  if (imc < 18.5) return '#4FA8D8'
  if (imc < 25) return '#6FBF3C'
  if (imc < 30) return '#F2B33D'
  return '#E4572E'
}

export function nombrePaciente(paciente) {
  return paciente.Nombre || 'Sin nombre'
}

export function iniciales(nombre) {
  const letras = String(nombre || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => (parte[0] || '').toUpperCase())
    .join('')
  return letras || '?'
}

export function colorAvatar(sexo) {
  if (sexo === 'Mujer') return '#F6A8D0'
  if (sexo === 'Hombre') return '#6BC8F2'
  return '#F5C518'
}

export function edadDesde(fecha) {
  if (!fecha) return null
  const nacimiento = new Date(`${fecha}T00:00:00`)
  if (Number.isNaN(nacimiento.getTime())) return null

  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const meses = hoy.getMonth() - nacimiento.getMonth()
  if (meses < 0 || (meses === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1
  return edad
}

export function fechaHoy() {
  return new Date().toLocaleDateString('en-CA')
}

export function formatoFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function capitalizar(texto) {
  const t = String(texto || '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}