import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from '../App'
import Landing from '../pages/Landing'
import Onboarding from '../pages/Onboarding'
import Phase1Diagnose from '../pages/Phase1Diagnose'
import Phase2Contain from '../pages/Phase2Contain'
import Phase3Destroy from '../pages/Phase3Destroy'

const routes = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'onboarding', element: <Onboarding /> },
      { path: 'diagnose', element: <Phase1Diagnose /> },
      { path: 'contain', element: <Phase2Contain /> },
      { path: 'destroy', element: <Phase3Destroy /> },
      { path: '*', element: <Navigate to='/' replace /> },
    ],
  },
])

export default routes
