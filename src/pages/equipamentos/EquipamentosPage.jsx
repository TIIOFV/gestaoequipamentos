import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'

// Importação das listas específicas
import ImpressorasList from './components/lists/ImpressorasList'
import MedicosList from './components/lists/MedicosList'
import PadraoList from './components/lists/PadraoList'

// Importações dos seus componentes de CRUD
import EquipamentoDetalhes from './EquipamentoDetalhes'
import EquipamentoForm from './EquipamentoForm'

import { useLocation } from 'react-router-dom'

export default function EquipamentosPage() {
  const location = useLocation()
  const { moduloAtivo } = useModulo()
  const [view, setView] = useState('lista')
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState(null)
  
  // Gatilho de atualização para forçar a lista a buscar dados novos no Supabase
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Estado para os auxiliares que o formulário exige
  const [auxiliares, setAuxiliares] = useState({ 
    fabricantes: [], unidades: [], setores: [], status: [], prestadores: [] 
  });

  // Referências
  const lastClickRef = useRef(null);
  const scrollPositionRef = useRef(0);

  // 1. RASTREADOR DE SCROLL EM TEMPO REAL
  // Fotografa a posição exata da barra de rolagem ANTES do DOM encolher
  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    const handleScroll = () => {
      // Só gravamos a posição se estivermos ativamente na lista
      if (view === 'lista') {
        scrollPositionRef.current = mainContent.scrollTop;
      }
    };

    mainContent.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainContent.removeEventListener('scroll', handleScroll);
  }, [view]);

  // 2. RESTAURAÇÃO SINCRONA (useLayoutEffect)
  // Atua milissegundos ANTES do navegador desenhar o novo layout na tela
  useLayoutEffect(() => {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    if (view !== 'lista') {
      // Força o topo absoluto instantaneamente ao abrir os Detalhes ou Formulário
      mainContent.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      // Devolve para a posição rastreada instantaneamente ao voltar para a lista
      mainContent.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
    }
  }, [view]);

  // Lógica para lidar com navegação via links externos/notificações
  useEffect(() => {
    const idAlvo = location.state?.openDetailsId;
    const clickTimestamp = location.state?._t;

    if (idAlvo) {
      if (clickTimestamp !== lastClickRef.current || (view === 'detalhes' && equipamentoSelecionado?.id !== idAlvo)) {
        lastClickRef.current = clickTimestamp; 
        if (view !== 'lista') {
          setView('lista');
          setEquipamentoSelecionado(null);
        }
      }
    }
  }, [location.state, view, equipamentoSelecionado]);

  // Carregamento dos dados auxiliares
  useEffect(() => {
    async function carregarAuxiliares() {
      const [f, u, s, st, p] = await Promise.all([
        supabase.from('fabricantes').select('*').order('nome'),
        supabase.from('unidades').select('*').order('nome'),
        supabase.from('setores').select('*').order('nome'),
        supabase.from('status_equipamento').select('*').order('nome'),
        supabase.from('prestadores').select('*').order('nome')
      ]);

      const filtrarPorModulo = (lista) => 
        lista.filter(item => !item.modulo || item.modulo.includes(moduloAtivo));

      setAuxiliares({ 
        fabricantes: filtrarPorModulo(f.data || []),
        unidades: filtrarPorModulo(u.data || []),
        setores: filtrarPorModulo(s.data || []),
        status: st.data || [], 
        prestadores: filtrarPorModulo(p.data || [])
      });
    }
    carregarAuxiliares();
  }, [moduloAtivo]); 

  const voltarParaLista = () => {
    setView('lista')
    setEquipamentoSelecionado(null)
  }

  const handleSucessoForm = () => {
    setRefreshTrigger(prev => prev + 1);
    voltarParaLista();
  }

  const renderLista = () => {
    const propsComuns = { setView, setEquipamentoSelecionado, refreshTrigger };

    switch (moduloAtivo) {
      case 'impressoras':
        return <ImpressorasList {...propsComuns} />
      case 'medicos':
        return <MedicosList {...propsComuns} />
      case 'ti':
      case 'infra':
      case 'manutencao':
      default:
        return <PadraoList moduloAtivo={moduloAtivo} {...propsComuns} />
    }
  }

  return (
    <div className="w-full relative">
      {/* LISTA OCULTA NO FUNDO */}
      <div style={{ display: view === 'lista' ? 'block' : 'none' }}>
        {renderLista()}
      </div>

      {/* RENDERIZAÇÃO DOS DETALHES */}
      {view === 'detalhes' && equipamentoSelecionado && (
        !equipamentoSelecionado.nome ? (
          <div className="p-10 text-center text-slate-500 font-medium animate-pulse">
            Carregando detalhes do equipamento...
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <EquipamentoDetalhes 
              equipamento={equipamentoSelecionado} 
              moduloAtivo={moduloAtivo}
              onVoltar={voltarParaLista}
              onEditar={() => { setView('editar'); }}
            />
          </div>
        )
      )}

      {/* RENDERIZAÇÃO DO FORMULÁRIO */}
      {(view === 'novo' || view === 'editar') && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <EquipamentoForm 
            view={view} 
            formDataInicial={equipamentoSelecionado} 
            auxiliaresGlobais={auxiliares}            
            moduloAtivo={moduloAtivo}
            onVoltar={voltarParaLista} 
            onSucesso={handleSucessoForm} 
          />
        </div>
      )}
    </div>
  )
}