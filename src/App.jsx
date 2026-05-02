import { Outlet } from 'react-router-dom'
import { DiagnosisProvider } from './context/DiagnosisContext'

export default function App() {
  return (
    <DiagnosisProvider>
      <Outlet />
    </DiagnosisProvider>
  )
}
