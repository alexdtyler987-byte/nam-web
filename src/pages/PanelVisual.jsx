import { FRUTAS } from './frutas'
import './Registro.css'

// La posición, el tamaño y la rotación de cada pieza se definen en Registro.css (clases .f-nombre).
const ORDEN = [
  'tomate',
  'mandarina',
  'fresa',
  'brocoli',
  'blueberry',
  'zanahoria',
  'pera',
  'cebolla',
  'naranja',
  'papa',
  'repollo',
  'manzana',
]

// Panel decorativo de las pantallas de registro y login.
function PanelVisual() {
  return (
    <aside className="registro-visual" aria-hidden="true">
      {ORDEN.map((nombre) => (
        <img
          key={nombre}
          src={FRUTAS[nombre]}
          alt=""
          className={`fruta f-${nombre}`}
          decoding="async"
          draggable="false"
        />
      ))}
      <p className="registro-burbuja">Comer bien, vivir mejor</p>
    </aside>
  )
}

export default PanelVisual