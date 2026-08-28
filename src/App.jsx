import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { get, set, del } from 'idb-keyval'
import { AuthProvider } from './contexts/AuthContext'
import { ModuloProvider } from './contexts/ModuloContext'
import ProtectedRoute from './routes/ProtectedRoute'

// 🚀 CRIAÇÃO DO MOTOR DE PERSISTÊNCIA (IndexedDB)
const idbPersister = {
  persistClient: async (client) => {
    await set('iofv-offline-cache', client)
  },
  restoreClient: async () => {
    return await get('iofv-offline-cache')
  },
  removeClient: async () => {
    await del('iofv-offline-cache')
  }
}

// 🚀 Configuração do Cache Global Otimizado para PWA Offline
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos sem recarregar ecrãs
      gcTime: 1000 * 60 * 60 * 24, // 24 HORAS no disco do telemóvel (Permite uso offline no dia seguinte)
      refetchOnWindowFocus: false, 
      retry: 1,
    },
  },
})

// Componente de carregamento para o Suspense
const Loading = () => (
  <div className="flex h-[100dvh] w-full items-center justify-center bg-slate-50 text-slate-500 font-medium">
    A carregar o seu ambiente...
  </div>
)

// Páginas importadas com Lazy Loading
const LoginPage = lazy(() => import('./pages/LoginPage'))
const ModulosPage = lazy(() => import('./pages/ModulosPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const AppLayout = lazy(() => import('./layouts/AppLayout'))
const EquipamentosPage = lazy(() => import('./pages/equipamentos/EquipamentosPage'))
const ChamadosPage = lazy(() => import('./pages/chamados/ChamadosPage'))
const AgendaPage = lazy(() => import('./pages/agenda/AgendaPage'))
const RelatoriosPage = lazy(() => import('./pages/relatorios/RelatoriosPage'))
const ConfiguracoesPage = lazy(() => import('./pages/configuracoes/ConfiguracoesPage'))
const BilhetagemPage = lazy(() => import('./pages/impressoras/BilhetagemPage'))
const ReleasesPage = lazy(() => import('./pages/releases/ReleasesPage'))
const LogsAuditoriaPage = lazy(() => import('./pages/auditoria/AuditoriaPage'))

export default function App() {
  return (
    // 🚀 Provedor de Persistência Offline
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: idbPersister }}>
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
                    <Route path="bilhetagem" element={<BilhetagemPage />} />
                    <Route path="releases" element={<ReleasesPage />} />
                    <Route path="logs" element={<LogsAuditoriaPage />} />
                  </Route>

                  <Route path="/" element={<Navigate to="/modulos" replace />} />
                </Route>
                
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ModuloProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  )
}