import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { ModuloProvider } from './contexts/ModuloContext'
import ProtectedRoute from './routes/ProtectedRoute'

// Componente de carregamento para o Suspense
const Loading = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-500 font-medium">
    Carregando sistema...
  </div>
)

// Páginas importadas com Lazy Loading
const LoginPage = lazy(() => import('./pages/LoginPage'))
const ModulosPage = lazy(() => import('./pages/ModulosPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const AppLayout = lazy(() => import('./layouts/AppLayout'))
const EquipamentosPage = lazy(() => import('./pages/equipamentos/EquipamentosPage'))
const ChamadosPage = lazy(() => import('./pages/chamados/ChamadosPage'))
const AgendaPage = lazy(() => import('./pages/AgendaPage'))
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage'))
const ConfiguracoesPage = lazy(() => import('./pages/configuracoes/ConfiguracoesPage'))

export default function App() {
  return (
    <AuthProvider>
      <ModuloProvider>
        <BrowserRouter>
          <Toaster 
            position="top-right" 
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '14px',
              },
            }} 
            containerStyle={{ zIndex: 999999 }}
          />
          
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              
              <Route element={<ProtectedRoute />}>
                <Route path="/modulos" element={<ModulosPage />} />

                <Route path="/:moduloId" element={<AppLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="equipamentos" element={<EquipamentosPage />} />
                  <Route path="configuracoes" element={<ConfiguracoesPage />} />
                  <Route path="agenda" element={<AgendaPage />} />
                  <Route path="relatorios" element={<RelatoriosPage />} />
                  <Route path="chamados" element={<ChamadosPage />} />
                </Route>

                <Route path="/" element={<Navigate to="/modulos" replace />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ModuloProvider>
    </AuthProvider>
  )
}