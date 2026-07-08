import { useState, useEffect, useRef } from 'react'
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
  
  // Estado para os auxiliares que o formulário exige
  const [auxiliares, setAuxiliares] = useState({ 
    fabricantes: [], unidades: [], setores: [], status: [], prestadores: [] 
  });

  // 🚨 REFERÊNCIA PARA CORRIGIR O BUG DO "PISCA PISCA"
  const lastClickRef = useRef(null);

  useEffect(() => {
    const idAlvo = location.state?.openDetailsId;
    const clickTimestamp = location.state?._t;

    if (idAlvo) {
      // Verifica se é um clique NOVO (timestamp diferente) 
      // ou se estamos presos na tela de detalhes de OUTRO equipamento
      if (clickTimestamp !== lastClickRef.current || (view === 'detalhes' && equipamentoSelecionado?.id !== idAlvo)) {
        
        lastClickRef.current = clickTimestamp; // Atualiza a memória para não repetir
        
        // Se não estivermos na lista, forçamos a volta para que a lista possa caçar a nova máquina!
        if (view !== 'lista') {
          setView('lista');
          setEquipamentoSelecionado(null);
        }
      }
    }
  }, [location.state, view, equipamentoSelecionado]);

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

  // Renderização condicional
  if (view === 'detalhes' && equipamentoSelecionado) {
    if (!equipamentoSelecionado.nome) {
        return <div className="p-10 text-center text-slate-500 font-medium">Carregando detalhes...</div>;
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
        formDataInicial={equipamentoSelecionado} 
        auxiliaresGlobais={auxiliares}            
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