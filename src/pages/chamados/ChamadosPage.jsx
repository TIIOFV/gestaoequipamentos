import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import toast from 'react-hot-toast'
import ModalConfirmacao from '../../components/ModalConfirmacao'

// Importando os nossos novos componentes
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

  const [modalConfirm, setModalConfirm] = useState({
    isOpen: false, titulo: '', mensagem: '', textoConfirmar: 'Confirmar', onConfirm: () => {}
  });

  const [auxiliares, setAuxiliares] = useState({
    equipamentos: [], status: [], prestadores: []
  })

  useEffect(() => {
    if (!moduloAtivo) return;
    inicializarPagina()
  }, [location.state, moduloAtivo])

  const inicializarPagina = async () => {
    setLoading(true)
    await identificarUsuario()
    await carregarAuxiliares()
    await buscarChamados()
    
    if (location.state?.action === 'novo') {
      setView('novo')
      window.history.replaceState({}, document.title)
    }

    setLoading(false)
  }

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
          window.scrollTo(0, 0);
          window.history.replaceState({}, document.title);
        }
      }
    }
  }

  const handleExcluir = (id) => {
    setModalConfirm({
      isOpen: true,
      titulo: 'Excluir Ordem de Serviço',
      mensagem: 'Tem certeza que deseja excluir esta OS? Esta ação apagará definitivamente este registro do histórico do equipamento.',
      textoConfirmar: 'Sim, Excluir OS',
      onConfirm: async () => {
        setLoading(true)
        const { error } = await supabase.from('chamados').delete().eq('id', id)
        if (error) toast.error('Erro ao excluir: ' + error.message)
        else {
          toast.success('Ordem de Serviço excluída com sucesso!')
          voltarParaLista()
          buscarChamados()
        }
        setLoading(false)
      }
    });
  }

  const voltarParaLista = () => {
    setView('lista')
    setChamadoSelecionado(null)
    window.history.replaceState({}, document.title)
  }

  const handleSalvo = () => {
    voltarParaLista()
    buscarChamados()
  }

  return (
    <div className="relative min-h-full font-sans pb-10 animate-in fade-in duration-500">
      <ModalConfirmacao
        isOpen={modalConfirm.isOpen} onClose={() => setModalConfirm({ ...modalConfirm, isOpen: false })}
        onConfirm={modalConfirm.onConfirm} titulo={modalConfirm.titulo}
        mensagem={modalConfirm.mensagem} textoConfirmar={modalConfirm.textoConfirmar}
      />

      {view === 'lista' && (
        <ChamadosList 
          chamados={chamados} loading={loading} auxiliares={auxiliares} 
          setView={setView} setChamadoSelecionado={setChamadoSelecionado} 
        />
      )}

      {view === 'detalhes' && chamadoSelecionado && (
        <ChamadoDetalhes 
          chamado={chamadoSelecionado} voltarParaLista={voltarParaLista} 
          iniciarEdicao={(ch) => setView('editar')} handleExcluir={handleExcluir} 
        />
      )}

      {(view === 'novo' || view === 'editar') && (
        <ChamadoForm 
          view={view} chamadoInicial={chamadoSelecionado} equipamentoIdNovo={location.state?.equipamentoId}
          auxiliares={auxiliares} usuarioAtual={usuarioAtual} moduloAtivo={moduloAtivo} 
          voltarParaLista={voltarParaLista} onSalvo={handleSalvo} 
        />
      )}
    </div>
  )
}