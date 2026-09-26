import { Routes, Route } from 'react-router-dom'
import Registro from './pages/Registro'
import Panel from './pages/Panel'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Registro />} />
      <Route path="/panel" element={<Panel />} />
    </Routes>
  )
}

export default App