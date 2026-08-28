import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import ModalConfirmacao from '../../components/ModalConfirmacao'

import ChamadosList from './components/ChamadosList'
import ChamadoDetalhes from './components/ChamadoDetalhes'
import ChamadoForm from './components/ChamadoForm'

export default function ChamadosPage() {
  const location = useLocation()
  const { moduloAtivo } = useModulo() 
  const queryClient = useQueryClient()
  
  const [view, setView] = useState('lista')
  const [chamadoSelecionado, setChamadoSelecionado] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [usuarioAtual, setUsuarioAtual] = useState({ id: '', nome: 'Carregando...' })

  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const scrollPositionRef = useRef(0);

  const [modalConfirm, setModalConfirm] = useState({
    isOpen: false, titulo: '', mensagem: '', textoConfirmar: 'Confirmar', onConfirm: () => {}
  });

  const [auxiliares, setAuxiliares] = useState({
    equipamentos: [], status: [], prestadores: []
  })

  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    const handleScroll = () => {
      if (view === 'lista') {
        scrollPositionRef.current = mainContent.scrollTop;
      }
    };

    mainContent.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainContent.removeEventListener('scroll', handleScroll);
  }, [view]);

  useLayoutEffect(() => {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    if (view !== 'lista') {
      mainContent.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      mainContent.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
    }
  }, [view]);

  useEffect(() => {
    if (!moduloAtivo) return;
    const fetchData = async () => {
      setLoading(true);
      await identificarUsuario();
      await carregarAuxiliares();
      
      if (location.state?.action === 'novo') {
        setView('novo');
        window.history.replaceState({}, document.title);
      } else if (location.state?.openDetailsId) {
        // Se viermos com um ID específico, buscamos esse chamado para abrir os detalhes
        const { data } = await supabase
          .from('chamados')
          .select(`*, equipamento:equipamento_id(nome, patrimonio, numero_serie), status:status_id(nome), prestador:prestador_id(nome), aberto_por:aberto_por_id(nome)`)
          .eq('id', location.state.openDetailsId)
          .single();
          
        if (data) {
          setChamadoSelecionado(data);
          setView('detalhes');
          window.history.replaceState({}, document.title);
        }
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
      supabase.from('equipamentos').select('id, nome, patrimonio, numero_serie').eq('modulo', moduloAtivo).order('nome'),
      supabase.from('status_chamado').select('*').order('nome'),
      supabase.from('prestadores').select('*').contains('modulo', [moduloAtivo]).order('nome')
    ])
    setAuxiliares({ equipamentos: eq.data || [], status: st.data || [], prestadores: pr.data || [] })
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
            .select('anexos, equipamento:equipamento_id(nome)')
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

          await supabase.from('logs_auditoria').insert([{
            usuario_nome: usuarioAtual?.nome || 'Usuário Desconhecido',
            acao: 'EXCLUSÃO',
            modulo: moduloAtivo,
            detalhes: `Excluiu a Ordem de Serviço ID #${id} e os seus anexos. Equipamento vinculado: ${chamadoParaApagar?.equipamento?.nome || 'N/A'}.`
          }]);

          toast.success('Ordem de Serviço e anexos excluídos com sucesso!')
          // 🚀 Invalida o cache global para recarregar a lista no background
          queryClient.invalidateQueries({ queryKey: ['chamados', moduloAtivo] })
          voltarParaLista()
          setRefreshTrigger(prev => prev + 1); 
        } catch (error) {
          toast.error('Erro ao excluir: ' + error.message)
        } finally {
          setLoading(false)
          setModalConfirm({ ...modalConfirm, isOpen: false })
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
    // 🚀 Invalida o cache para mostrar a nova O.S imediatamente
    queryClient.invalidateQueries({ queryKey: ['chamados', moduloAtivo] })
    setRefreshTrigger(prev => prev + 1); 
    voltarParaLista();
  }

  return (
    <div className="relative min-h-full font-sans pb-10 animate-in fade-in duration-300 w-full max-w-full overflow-x-hidden min-w-0">
      <ModalConfirmacao
        isOpen={modalConfirm.isOpen} onClose={() => setModalConfirm({ ...modalConfirm, isOpen: false })}
        onConfirm={modalConfirm.onConfirm} titulo={modalConfirm.titulo}
        mensagem={modalConfirm.mensagem} textoConfirmar={modalConfirm.textoConfirmar}
      />

      <div style={{ display: view === 'lista' ? 'block' : 'none' }}>
        <ChamadosList 
          auxiliares={auxiliares} 
          setView={setView} setChamadoSelecionado={setChamadoSelecionado} 
        />
      </div>

      {view === 'detalhes' && chamadoSelecionado && (
        <div className="animate-in fade-in duration-300 w-full min-w-0">
          <ChamadoDetalhes 
            chamado={chamadoSelecionado} voltarParaLista={voltarParaLista} 
            iniciarEdicao={(ch) => setView('editar')} handleExcluir={handleExcluir} 
          />
        </div>
      )}

      {(view === 'novo' || view === 'editar') && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 w-full min-w-0">
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