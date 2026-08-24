import { useState } from 'react'
import { Settings, Users, Factory, Wrench, Building2, LayoutGrid, ActivitySquare } from 'lucide-react'
import TabUsuarios from './components/TabUsuarios'
import TabAuxiliares from './components/TabAuxiliares'

// 🚀 IMPORTAMOS A NOSSA PEÇA DE LEGO
import Tabs from '../../components/ui/Tabs' 

const MODULOS_DISPONIVEIS = [
  { id: 'medicos', nome: 'Equipamentos Médicos', cor: 'emerald' },
  { id: 'ti', nome: 'Tecnologia da Informação', cor: 'blue' },
  { id: 'infra', nome: 'Nobreaks & Baterias', cor: 'amber' },
  { id: 'manutencao', nome: 'Manutenção Predial', cor: 'slate' },
  { id: 'impressoras', nome: 'Impressoras & Copiadoras', cor: 'purple' }
]

// Transformamos o array para usar 'label' (Padrão de UI) e adicionamos ícones opcionais!
const abasGlobais = [
  { id: 'usuarios', label: 'Usuários', icon: <Users size={16}/>, tabela: 'perfis' },
  { id: 'fabricantes', label: 'Fabricantes', icon: <Factory size={16}/>, tabela: 'fabricantes' },
  { id: 'prestadores', label: 'Prestadores', icon: <Wrench size={16}/>, tabela: 'prestadores' },
  { id: 'unidades', label: 'Unidades', icon: <Building2 size={16}/>, tabela: 'unidades' },
  { id: 'setores', label: 'Setores', icon: <LayoutGrid size={16}/>, tabela: 'setores' },
  { id: 'status_equipmento', label: 'Status da OS', icon: <ActivitySquare size={16}/>, tabela: 'status_equipamento' },
]

export default function ConfiguracoesPage() {
  const [abaAtiva, setAbaAtiva] = useState('usuarios')
  const abaSelecionada = abasGlobais.find(a => a.id === abaAtiva)

  return (
    // 🚀 OTIMIZAÇÃO: w-full e space-y-6 para acompanhar o padrão gigante da tela
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* CABEÇALHO ENTERPRISE (Igual ao dos Chamados) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase">
            <Settings className="text-indigo-600" size={32} />
            Configurações
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Gestão global de acessos e tabelas auxiliares do sistema.
          </p>
        </div>
      </div>

      {/* 🚀 A MÁGICA: Uma única linha resolve toda a navegação mobile! */}
      <Tabs 
        tabs={abasGlobais} 
        activeTab={abaAtiva} 
        onChange={setAbaAtiva} 
      />

      {/* CONTEÚDO DA ABA (Cartão expandido e limpo) */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-8">
        {abaAtiva === 'usuarios' ? (
          <TabUsuarios modulosDisponiveis={MODULOS_DISPONIVEIS} />
        ) : (
          <TabAuxiliares 
            abaAtiva={abaAtiva} 
            tabelaAtual={abaSelecionada.tabela} 
            nomeAba={abaSelecionada.label}
            modulosDisponiveis={MODULOS_DISPONIVEIS} 
          />
        )}
      </div>
      
    </div>
  )
}