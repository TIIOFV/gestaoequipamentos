import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast' // 1. Importação da Lib
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AppLayout from './layouts/AppLayout'
import EquipamentosPage from './pages/EquipamentosPage'
import ChamadosPage from './pages/ChamadosPage'
import AgendaPage from './pages/AgendaPage'
import RelatoriosPage from './pages/RelatoriosPage'
import ConfiguracoesPage from './pages/ConfiguracoesPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* 2. O Toaster aqui, no topo, garante que ele funcione em QUALQUER página */}
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
        />
        
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="equipamentos" element={<EquipamentosPage />} />
              <Route path="configuracoes" element={<ConfiguracoesPage />} />
              <Route path="agenda" element={<AgendaPage />} />
              <Route path="relatorios" element={<RelatoriosPage />} />
              <Route path="chamados" element={<ChamadosPage />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}