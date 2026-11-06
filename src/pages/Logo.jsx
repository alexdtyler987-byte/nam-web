import logoNam from '../assets/logo-nam.webp'
import './Logo.css'

// El archivo del logo mide 720 x 278 px. Se indica el ancho y el alto para que el navegador
// reserve el espacio antes de cargar la imagen (evita que la página "salte").
const RELACION = 720 / 278

// ancho: ancho en píxeles con el que se muestra. className: para ajustes puntuales de cada pantalla.
function Logo({ ancho = 180, className = '' }) {
  return (
    <img
      src={logoNam}
      alt="ÑAM"
      className={`logo-img ${className}`.trim()}
      width={ancho}
      height={Math.round(ancho / RELACION)}
    />
  )
}

export default Logo