import { FRUTAS } from './frutas'
import './EstadoVacio.css'

// Mensaje para cuando una sección no tiene datos todavía, con una ilustración de la marca.
// - fruta: nombre de la ilustración (pera, manzana, fresa, cebolla...)
// - titulo: frase corta
// - children: texto de apoyo o un botón (opcional)
function EstadoVacio({ fruta = 'pera', titulo, children }) {
  return (
    <div className="estado-vacio">
      <img
        src={FRUTAS[fruta] ?? FRUTAS.pera}
        alt=""
        width="96"
        height="96"
        className="estado-vacio-img"
        draggable="false"
      />
      <div className="estado-vacio-texto">
        <strong>{titulo}</strong>
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  )
}

export default EstadoVacio