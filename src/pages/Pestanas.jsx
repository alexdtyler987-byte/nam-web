import { useRef } from 'react'
import './Pestanas.css'

// Barra de pestañas accesible (lectores de pantalla y teclado).
// - items: [{ id, label }]
// - activa: id de la pestaña seleccionada
// - onCambiar(id): se llama al elegir otra pestaña
// Cada panel debe tener id="panel-<id>" y aria-labelledby="pestana-<id>".
function Pestanas({ items, activa, onCambiar, etiqueta }) {
  const botones = useRef({})

  function alTeclear(event, indice) {
    let destino = null
    if (event.key === 'ArrowRight') destino = (indice + 1) % items.length
    else if (event.key === 'ArrowLeft') destino = (indice - 1 + items.length) % items.length
    else if (event.key === 'Home') destino = 0
    else if (event.key === 'End') destino = items.length - 1
    if (destino === null) return

    event.preventDefault()
    onCambiar(items[destino].id)
    botones.current[items[destino].id]?.focus()
  }

  return (
    <div className="pestanas" role="tablist" aria-label={etiqueta}>
      {items.map((item, indice) => {
        const seleccionada = item.id === activa
        return (
          <button
            key={item.id}
            ref={(el) => {
              botones.current[item.id] = el
            }}
            type="button"
            role="tab"
            id={`pestana-${item.id}`}
            aria-selected={seleccionada}
            aria-controls={`panel-${item.id}`}
            tabIndex={seleccionada ? 0 : -1}
            className={seleccionada ? 'pestana pestana-activa' : 'pestana'}
            onClick={() => onCambiar(item.id)}
            onKeyDown={(event) => alTeclear(event, indice)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export default Pestanas