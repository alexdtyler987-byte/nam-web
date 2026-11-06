import './Registro.css'
import tomate from '../assets/frutas/tomate.webp'
import mandarina from '../assets/frutas/mandarina.webp'
import fresa from '../assets/frutas/fresa.webp'
import brocoli from '../assets/frutas/brocoli.webp'
import blueberry from '../assets/frutas/blueberry.webp'
import zanahoria from '../assets/frutas/zanahoria.webp'
import pera from '../assets/frutas/pera.webp'
import cebolla from '../assets/frutas/cebolla.webp'
import naranja from '../assets/frutas/naranja.webp'
import papa from '../assets/frutas/papa.webp'
import repollo from '../assets/frutas/repollo.webp'
import manzana from '../assets/frutas/manzana.webp'

// La posición, el tamaño y la rotación de cada pieza se definen en Registro.css (clases .f-nombre).
const FRUTAS = [
  ['tomate', tomate],
  ['mandarina', mandarina],
  ['fresa', fresa],
  ['brocoli', brocoli],
  ['blueberry', blueberry],
  ['zanahoria', zanahoria],
  ['pera', pera],
  ['cebolla', cebolla],
  ['naranja', naranja],
  ['papa', papa],
  ['repollo', repollo],
  ['manzana', manzana],
]

// Panel decorativo de las pantallas de registro y login.
function PanelVisual() {
  return (
    <aside className="registro-visual" aria-hidden="true">
      {FRUTAS.map(([nombre, src]) => (
        <img key={nombre} src={src} alt="" className={`fruta f-${nombre}`} decoding="async" draggable="false" />
      ))}
      <p className="registro-burbuja">Comer bien, vivir mejor</p>
    </aside>
  )
}

export default PanelVisual