import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import { 
  LayoutDashboard, Monitor, Wrench, CalendarDays, FileText, 
  Settings, LogOut, Bell, X, Key, ArrowLeftRight, Droplet, Rocket 
} from 'lucide-react'

export default function MenuSidebar({ 
  profile, 
  hasFullAccess, 
  isTrocaSenhaObrigatoria, 
  isMobileMenuOpen, 
  setIsMobileMenuOpen, 
  handleLogout, 
  setModalSenhaAberto 
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { moduloAtivo, limparModulo } = useModulo()
  
  const [showNotif, setShowNotif] = useState(false)
  const [alertas, setAlertas] = useState([])

  // 🏷️ VERSÃO DA RELEASE ATUAL DO SISTEMA
  const VERSAO_ATUAL = "v1.25.4"

  const nomesModulos = {
    medicos: 'Equipamentos Médicos',
    ti: 'Tecnologia da Informação',
    infra: 'Nobreaks & Baterias',
    manutencao: 'Manutenção Predial',
    impressoras: 'Impressoras & Copiadoras'
  }

  useEffect(() => {
    if (!moduloAtivo) return;

    if (profile && !profile.esta_bloqueado && !isTrocaSenhaObrigatoria) {
      buscarAlertas()
      
      const canalNotificacoes = supabase
        .channel(`fluxo-alertas-${moduloAtivo}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados', filter: `modulo=eq.${moduloAtivo}` }, () => buscarAlertas())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'equipamentos', filter: `modulo=eq.${moduloAtivo}` }, () => buscarAlertas())
        .subscribe();

      return () => { supabase.removeChannel(canalNotificacoes); };
    }
  }, [profile, isTrocaSenhaObrigatoria, moduloAtivo])

  const buscarAlertas = async () => {
    let novosAlertas = []
    const isModuloTecnologia = ['ti', 'impressoras'].includes(moduloAtivo)

    try {
      // 1. REGRA: Sem Etiqueta (Apenas para módulos biomédicos/infra/manutenção)
      if (!isModuloTecnologia) {
        const { data: semEtiqueta } = await supabase.from('equipamentos').select('id, nome, patrimonio').eq('possui_etiqueta', false).eq('modulo', moduloAtivo)
        if (semEtiqueta) {
          semEtiqueta.forEach(eq => novosAlertas.push({ id: `eq-${eq.id}`, tipo: 'etiqueta', texto: `${eq.nome} (${eq.patrimonio || 'S/N'}) sem etiqueta.`, link: `/${moduloAtivo}/equipamentos`, targetId: eq.id }))
        }
      }

      // 2. REGRA: Sem Patrimônio (Geral para todos os módulos)
      const { data: semPatrimonio } = await supabase.from('equipamentos').select('id, nome').eq('sem_patrimonio', true).eq('modulo', moduloAtivo)
      if (semPatrimonio) {
        semPatrimonio.forEach(eq => novosAlertas.push({ id: `pat-${eq.id}`, tipo: 'patrimonio', texto: `URGENTE: ${eq.nome} sem património.`, link: `/${moduloAtivo}/equipamentos`, targetId: eq.id }))
      }

      // 3. REGRA: OS Atrasada (Geral para todos os módulos)
      const hoje = new Date().toISOString().split('T')[0]
      const { data: statusConcluido } = await supabase.from('status_chamado').select('id').ilike('nome', '%Concluído%').maybeSingle()
      
      let query = supabase.from('chamados').select('id, tipo_intervencao, data_prevista, equipamento:equipamento_id(nome)').lte('data_prevista', hoje).eq('modulo', moduloAtivo)
      if (statusConcluido) query = query.neq('status_id', statusConcluido.id)

      const { data: chamadosAtrasados } = await query
      if (chamadosAtrasados) {
        chamadosAtrasados.forEach(ch => novosAlertas.push({ 
          id: `ch-${ch.id}`, 
          tipo: 'manutencao', 
          texto: `${ch.tipo_intervencao} PENDENTE: ${ch.equipamento?.nome || 'Equipamento'}`, 
          link: `/${moduloAtivo}/chamados`,
          targetId: ch.id // 🚨 CORREÇÃO AQUI: Agora passamos o ID do chamado para abrir direto!
        }))
      }
      
      setAlertas(novosAlertas)
    } catch (error) { console.error("Erro ao buscar alertas:", error) }
  }

  const handleTrocarModulo = () => {
    limparModulo()
    navigate('/modulos')
  }

  const handleNotifClick = (e, path, targetId) => {
    e.preventDefault(); setIsMobileMenuOpen(false);
    const targetPath = !hasFullAccess ? `/${moduloAtivo}/agenda` : path;
    
    const statePayload = targetId ? { openDetailsId: targetId, _t: Date.now() } : { _t: Date.now() };
    navigate(targetPath, { state: statePayload });
  }

  const isActive = (path) => location.pathname.includes(path)
  const handleMainMenuClick = (e, path) => {
    setIsMobileMenuOpen(false);
    if (location.pathname === path) { e.preventDefault(); window.location.href = path; }
  }

  const menuItems = [
    { path: `/${moduloAtivo}/dashboard`, name: 'Dashboard', icon: LayoutDashboard, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/equipamentos`, name: 'Equipamentos', icon: Monitor, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/chamados`, name: 'Chamados', icon: Wrench, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/agenda`, name: 'Agenda', icon: CalendarDays, roles: ['administrador', 'analista', 'visualizador'] },
    { path: `/${moduloAtivo}/relatorios`, name: 'Relatórios', icon: FileText, roles: ['administrador', 'analista'] },
  ]

  return (
    <aside className={`
      fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col shadow-2xl md:shadow-sm h-screen z-50 
      transform transition-transform duration-300 ease-in-out select-none
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
      ${isTrocaSenhaObrigatoria ? 'md:hidden' : 'md:relative md:translate-x-0'}
    `}>
      {/* LOGO */}
      <div className="h-16 md:h-20 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-800 text-white rounded-lg flex items-center justify-center font-bold text-lg mr-2 shadow-sm">IOFV</div>
          <div>
            <h1 className="font-bold text-slate-800 leading-tight">IOFV - GESTÃO</h1>
            <p className="text-[10px] md:text-xs text-slate-500">Sistema Integrado</p>
          </div>
        </div>
        <button className="md:hidden text-slate-500 hover:text-slate-800" onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
      </div>

      {/* AMBIENTE */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <div onClick={handleTrocarModulo} className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between group cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="overflow-hidden">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ambiente Atual</p>
            <p className="font-bold text-slate-700 text-xs truncate">{nomesModulos[moduloAtivo] || 'Carregando...'}</p>
          </div>
          <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0"><ArrowLeftRight size={14} /></div>
        </div>
      </div>

      {/* PERFIL */}
      <div className="px-6 py-3 border-b border-slate-100 shrink-0">
        <p className="font-semibold text-slate-800 truncate text-sm">{profile ? profile.nome : 'Carregando...'}</p>
        {profile && (
          <span className={`inline-flex items-center px-2 py-0.5 mt-0.5 rounded-md text-[10px] font-bold capitalize ${hasFullAccess ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'}`}>
            {hasFullAccess ? profile.perfil : 'Usuário'}
          </span>
        )}
      </div>

      {/* PENDÊNCIAS COM CONTAINER DE ROLAGEM CORRIGIDO */}
      <div className="px-3 py-2 border-b border-slate-100 shrink-0 bg-slate-50/30">
        <button onClick={() => setShowNotif(!showNotif)} className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-slate-100/80 transition-colors group">
          <div className="flex items-center text-xs font-bold text-slate-700 group-hover:text-blue-700">
            <Bell className={`w-3.5 h-3.5 mr-2 ${alertas.length > 0 ? 'text-red-500' : 'text-slate-400'}`} />
            Pendências
          </div>
          {alertas.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">{alertas.length}</span>}
        </button>

        {showNotif && (
          <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar transition-all">
            {alertas.length === 0 ? (
              <div className="p-2 text-center bg-emerald-50 border border-emerald-100 rounded-lg"><p className="text-[11px] font-bold text-emerald-700">Tudo em dia! 🎉</p></div>
            ) : (
              alertas.map(al => (
                <div key={al.id} onClick={(e) => handleNotifClick(e, al.link, al.targetId)} className={`cursor-pointer block text-[11px] p-2 rounded-lg border transition-all ${al.tipo === 'etiqueta' ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100' : al.tipo === 'patrimonio' ? 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100' : 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100'}`}>
                  <span className="font-bold block text-[10px] mb-0.5">{al.tipo === 'etiqueta' ? '🏷️ Falta Etiqueta' : al.tipo === 'patrimonio' ? '🚨 Sem Patrimônio' : '⚠️ OS Atrasada'}</span>
                  {al.text || al.texto}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* LINKS DE NAVEGAÇÃO PRINCIPAL (FLEX-1 SEM SCROLL DUPLO) */}
      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.filter(item => (!hasFullAccess ? item.path.includes('/agenda') : item.roles.includes(profile?.perfil))).map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link key={item.path} to={item.path} onClick={(e) => handleMainMenuClick(e, item.path)} className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <Icon className={`w-4 h-4 mr-3 ${active ? 'text-blue-600' : 'text-slate-400'}`} /> {item.name}
            </Link>
          )
        })}

        {moduloAtivo === 'impressoras' && hasFullAccess && (
          <Link 
            to={`/${moduloAtivo}/bilhetagem`} 
            onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/bilhetagem`)} 
            className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isActive('/bilhetagem') ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-100/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Droplet className={`w-4 h-4 mr-3 ${isActive('/bilhetagem') ? 'text-rose-600' : 'text-slate-400'}`} /> Auditoria de Cor
          </Link>
        )}

        {/* CONFIGURAÇÕES E RELEASES */}
        {hasFullAccess && (
          <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
            {profile?.perfil === 'administrador' && (
              <Link to={`/${moduloAtivo}/configuracoes`} onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/configuracoes`)} className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isActive('/configuracoes') ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                <Settings className="w-4 h-4 mr-3 text-slate-400" /> Configurações Gerais
              </Link>
            )}
            
            {/* 🚀 NOVA ABA DE RELEASES / HISTÓRICO */}
            <Link to={`/${moduloAtivo}/releases`} onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/releases`)} className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isActive('/releases') ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <Rocket className={`w-4 h-4 mr-3 ${isActive('/releases') ? 'text-blue-600' : 'text-slate-400'}`} /> Notas de Atualização
            </Link>
          </div>
        )}
      </nav>

      {/* RODAPÉ DO MENU */}
      <div className="p-3 border-t border-slate-100 shrink-0 space-y-1.5 bg-slate-50/20">
        <button onClick={() => setModalSenhaAberto(true)} className="flex items-center justify-center w-full px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent">
          <Key className="w-3.5 h-3.5 mr-2" /> Alterar senha
        </button>
        <button onClick={handleLogout} className="flex items-center justify-center w-full px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent">
          <LogOut className="w-3.5 h-3.5 mr-2" /> Sair do sistema
        </button>
        <div className="pt-1 text-center border-t border-slate-100/70">
          <span className="text-[9px] font-black text-slate-400 tracking-wider">RELEASE {VERSAO_ATUAL}</span>
        </div>
      </div>
    </aside>
  )
}