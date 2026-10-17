import { Routes, Route } from 'react-router-dom'
import Registro from './pages/Registro'
import Login from './pages/Login'
import Panel from './pages/Panel'
import ListaPacientes from './pages/ListaPacientes'
import DetallePaciente from './pages/DetallePaciente'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Registro />} />
      <Route path="/login" element={<Login />} />
      <Route path="/panel" element={<Panel />}>
        <Route index element={<ListaPacientes />} />
        <Route path=":id" element={<DetallePaciente />} />
      </Route>
    </Routes>
  )
}

export default App