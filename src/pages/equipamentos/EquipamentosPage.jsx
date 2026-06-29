import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'

// Importação das listas específicas
import ImpressorasList from './components/lists/ImpressorasList'
import MedicosList from './components/lists/MedicosList'
import PadraoList from './components/lists/PadraoList'

// Importações dos seus componentes de CRUD
import EquipamentoDetalhes from './EquipamentoDetalhes'
import EquipamentoForm from './EquipamentoForm'

export default function EquipamentosPage() {
  const { moduloAtivo } = useModulo()
  const [view, setView] = useState('lista')
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState(null)
  
  // Estado para os auxiliares que o formulário exige
  const [auxiliares, setAuxiliares] = useState({ 
    fabricantes: [], unidades: [], setores: [], status: [], prestadores: [] 
  });

  useEffect(() => {
    async function carregarAuxiliares() {
      // 1. Buscamos todos os dados
      const [f, u, s, st, p] = await Promise.all([
        supabase.from('fabricantes').select('*').order('nome'),
        supabase.from('unidades').select('*').order('nome'),
        supabase.from('setores').select('*').order('nome'),
        supabase.from('status_equipamento').select('*').order('nome'),
        supabase.from('prestadores').select('*').order('nome')
      ]);

      // 2. Filtramos cada um pelo moduloAtivo
      // Assumindo que a sua tabela de configurações salva os módulos permitidos numa coluna tipo Array chamada 'modulo'
      const filtrarPorModulo = (lista) => 
        lista.filter(item => !item.modulo || item.modulo.includes(moduloAtivo));

      setAuxiliares({ 
        fabricantes: filtrarPorModulo(f.data || []),
        unidades: filtrarPorModulo(u.data || []),
        setores: filtrarPorModulo(s.data || []),
        status: st.data || [], // Status geralmente é global, mantemos todos
        prestadores: filtrarPorModulo(p.data || [])
      });
    }
    carregarAuxiliares();
  }, [moduloAtivo]); // Adicionámos [moduloAtivo] aqui para recarregar ao trocar de módulo

  const voltarParaLista = () => {
    setView('lista')
    setEquipamentoSelecionado(null)
  }

  // Renderização condicional
  if (view === 'detalhes' && equipamentoSelecionado) {
    // Verificação de segurança: se o objeto não tiver nome, mostramos um loading ou erro
    if (!equipamentoSelecionado.nome) {
        return <div className="p-10 text-center">Carregando detalhes...</div>;
    }
    
    return (
      <EquipamentoDetalhes 
        equipamento={equipamentoSelecionado} 
        moduloAtivo={moduloAtivo}
        onVoltar={voltarParaLista}
        onEditar={(eq) => { setView('editar'); }}
      />
    )
  }

  if (view === 'novo' || view === 'editar') {
    return (
      <EquipamentoForm 
        view={view} 
        formDataInicial={equipamentoSelecionado} // Nome esperado pelo seu form
        auxiliaresGlobais={auxiliares}            // AQUI ESTÁ O QUE FALTAVA
        moduloAtivo={moduloAtivo}
        onVoltar={voltarParaLista} 
        onSucesso={voltarParaLista} 
      />
    )
  }

  // Fábrica de Listas
  switch (moduloAtivo) {
    case 'impressoras':
      return <ImpressorasList setView={setView} setEquipamentoSelecionado={setEquipamentoSelecionado} />
    case 'medicos':
      return <MedicosList setView={setView} setEquipamentoSelecionado={setEquipamentoSelecionado} />
    case 'ti':
    case 'infra':
    case 'manutencao':
    default:
      return <PadraoList moduloAtivo={moduloAtivo} setView={setView} setEquipamentoSelecionado={setEquipamentoSelecionado} />
  }
}