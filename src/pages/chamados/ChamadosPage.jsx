import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import toast from 'react-hot-toast'
import ModalConfirmacao from '../../components/ModalConfirmacao'

import ChamadosList from './components/ChamadosList'
import ChamadoDetalhes from './components/ChamadoDetalhes'
import ChamadoForm from './components/ChamadoForm'

export default function ChamadosPage() {
  const location = useLocation()
  const { moduloAtivo } = useModulo() 
  
  const [view, setView] = useState('lista')
  const [chamados, setChamados] = useState([])
  const [chamadoSelecionado, setChamadoSelecionado] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [usuarioAtual, setUsuarioAtual] = useState({ id: '', nome: 'Carregando...' })

  // Gatilho para atualizar a lista em background
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Referências para o scroll blindado
  const scrollPositionRef = useRef(0);

  const [modalConfirm, setModalConfirm] = useState({
    isOpen: false, titulo: '', mensagem: '', textoConfirmar: 'Confirmar', onConfirm: () => {}
  });

  const [auxiliares, setAuxiliares] = useState({
    equipamentos: [], status: [], prestadores: []
  })

  // 1. RASTREADOR DE SCROLL EM TEMPO REAL 🚀
  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    const handleScroll = () => {
      // Só grava a posição se estiver ativamente a ver a lista
      if (view === 'lista') {
        scrollPositionRef.current = mainContent.scrollTop;
      }
    };

    mainContent.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainContent.removeEventListener('scroll', handleScroll);
  }, [view]);

  // 2. RESTAURAÇÃO SÍNCRONA DE SCROLL (Antes da tela desenhar) 🚀
  useLayoutEffect(() => {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    if (view !== 'lista') {
      mainContent.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      mainContent.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
    }
  }, [view]);

  // 3. BUSCA DE DADOS AO ABRIR (OU AO ATUALIZAR O GATILHO)
  useEffect(() => {
    if (!moduloAtivo) return;
    const fetchData = async () => {
      setLoading(true);
      await identificarUsuario();
      await carregarAuxiliares();
      await buscarChamados();
      
      if (location.state?.action === 'novo') {
        setView('novo');
        window.history.replaceState({}, document.title);
      }
      setLoading(false);
    };
    fetchData();
  }, [location.state, moduloAtivo, refreshTrigger])

  const identificarUsuario = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data: perfil } = await supabase.from('perfis').select('id, nome').eq('user_id', session.user.id).single()
      if (perfil) setUsuarioAtual(perfil)
    }
  }

  const carregarAuxiliares = async () => {
    const [eq, st, pr] = await Promise.all([
      supabase.from('equipamentos').select('id, nome, patrimonio').eq('modulo', moduloAtivo).order('nome'),
      supabase.from('status_chamado').select('*').order('nome'),
      supabase.from('prestadores').select('*').contains('modulo', [moduloAtivo]).order('nome')
    ])
    setAuxiliares({ equipamentos: eq.data || [], status: st.data || [], prestadores: pr.data || [] })
  }

  const buscarChamados = async () => {
    const { data, error } = await supabase
      .from('chamados')
      .select(`*, equipamento:equipamento_id(nome, patrimonio), status:status_id(nome), prestador:prestador_id(nome), aberto_por:aberto_por_id(nome)`)
      .eq('modulo', moduloAtivo) 
      .order('created_at', { ascending: false })

    if (!error) {
      setChamados(data || [])
      if (location.state?.openDetailsId && data) {
        const chTarget = data.find(c => String(c.id) === String(location.state.openDetailsId));
        if (chTarget) {
          setChamadoSelecionado(chTarget);
          setView('detalhes');
          window.history.replaceState({}, document.title);
        }
      }
    }
  }

  const handleExcluir = (id) => {
    setModalConfirm({
      isOpen: true,
      titulo: 'Excluir Ordem de Serviço',
      mensagem: 'Tem certeza que deseja excluir esta OS e TODOS os seus anexos? Esta ação apagará definitivamente os arquivos do servidor e o registro do histórico.',
      textoConfirmar: 'Sim, Excluir OS e Arquivos',
      onConfirm: async () => {
        setLoading(true)
        try {
          const { data: chamadoParaApagar, error: fetchError } = await supabase
            .from('chamados')
            .select('anexos')
            .eq('id', id)
            .single();
            
          if (fetchError) throw fetchError;

          if (chamadoParaApagar && chamadoParaApagar.anexos && chamadoParaApagar.anexos.length > 0) {
            const pathsParaRemover = chamadoParaApagar.anexos.map(url => {
              const partes = url.split('/equipamentos/');
              return partes[1]; 
            }).filter(Boolean);

            if (pathsParaRemover.length > 0) {
              const { error: storageError } = await supabase.storage.from('equipamentos').remove(pathsParaRemover);
              if (storageError) console.error('Erro ao limpar arquivos órfãos:', storageError);
            }
          }

          const { error: deleteError } = await supabase.from('chamados').delete().eq('id', id);
          if (deleteError) throw deleteError;

          toast.success('Ordem de Serviço e anexos excluídos com sucesso!')
          voltarParaLista()
          setRefreshTrigger(prev => prev + 1); // Avisa a lista que algo mudou
        } catch (error) {
          toast.error('Erro ao excluir: ' + error.message)
        } finally {
          setLoading(false)
        }
      }
    });
  }

  const voltarParaLista = () => {
    setView('lista')
    setChamadoSelecionado(null)
    window.history.replaceState({}, document.title)
  }

  const handleSalvo = () => {
    setRefreshTrigger(prev => prev + 1); // Força os dados a ficarem novos
    voltarParaLista();
  }

  return (
    <div className="relative min-h-full font-sans pb-10 animate-in fade-in duration-300">
      <ModalConfirmacao
        isOpen={modalConfirm.isOpen} onClose={() => setModalConfirm({ ...modalConfirm, isOpen: false })}
        onConfirm={modalConfirm.onConfirm} titulo={modalConfirm.titulo}
        mensagem={modalConfirm.mensagem} textoConfirmar={modalConfirm.textoConfirmar}
      />

      {/* MODO PERSISTENTE: O display none guarda tudo se não estivermos nela! */}
      <div style={{ display: view === 'lista' ? 'block' : 'none' }}>
        <ChamadosList 
          chamados={chamados} loading={loading} auxiliares={auxiliares} 
          setView={setView} setChamadoSelecionado={setChamadoSelecionado} 
        />
      </div>

      {view === 'detalhes' && chamadoSelecionado && (
        <div className="animate-in fade-in duration-300">
          <ChamadoDetalhes 
            chamado={chamadoSelecionado} voltarParaLista={voltarParaLista} 
            iniciarEdicao={(ch) => setView('editar')} handleExcluir={handleExcluir} 
          />
        </div>
      )}

      {(view === 'novo' || view === 'editar') && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <ChamadoForm 
            view={view} chamadoInicial={chamadoSelecionado} equipamentoIdNovo={location.state?.equipamentoId}
            auxiliares={auxiliares} usuarioAtual={usuarioAtual} moduloAtivo={moduloAtivo} 
            voltarParaLista={voltarParaLista} onSalvo={handleSalvo} 
          />
        </div>
      )}
    </div>
  )
}