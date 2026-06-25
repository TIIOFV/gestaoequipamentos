import { useState } from 'react'
import { Settings } from 'lucide-react'
import TabUsuarios from './components/TabUsuarios'
import TabAuxiliares from './components/TabAuxiliares'

const MODULOS_DISPONIVEIS = [
  { id: 'medicos', nome: 'Equipamentos Médicos', cor: 'emerald' },
  { id: 'ti', nome: 'Tecnologia da Informação', cor: 'blue' },
  { id: 'infra', nome: 'Nobreaks & Baterias', cor: 'amber' },
  { id: 'manutencao', nome: 'Manutenção Predial', cor: 'slate' },
  { id: 'impressoras', nome: 'Impressoras & Copiadoras', cor: 'purple' }
]

const abas = [
  { id: 'usuarios', nome: 'Usuários', tabela: 'perfis' },
  { id: 'fabricantes', nome: 'Fabricantes', tabela: 'fabricantes' },
  { id: 'prestadores', nome: 'Prestadores', tabela: 'prestadores' },
  { id: 'unidades', nome: 'Unidades', tabela: 'unidades' },
  { id: 'setores', nome: 'Setores', tabela: 'setores' },
  { id: 'status_equipmento', nome: 'Status do Equipamento', tabela: 'status_equipamento' },
]

export default function ConfiguracoesPage() {
  const [abaAtiva, setAbaAtiva] = useState('usuarios')
  const abaSelecionada = abas.find(a => a.id === abaAtiva)

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 font-sans relative pb-10">
      
      <div className="mb-2 md:mb-0">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center">
          <Settings className="w-6 h-6 md:w-8 md:h-8 mr-3 text-blue-600" />
          Configurações Gerais
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-1">Gerencie os cadastros auxiliares e acessos (Acesso exclusivo da Administração).</p>
      </div>

      <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto pb-px custom-scrollbar w-full">
        {abas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`px-3 md:px-4 py-2.5 text-xs md:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              abaAtiva === aba.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {aba.nome}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
        {abaAtiva === 'usuarios' ? (
          <TabUsuarios modulosDisponiveis={MODULOS_DISPONIVEIS} />
        ) : (
          <TabAuxiliares 
            abaAtiva={abaAtiva} 
            tabelaAtual={abaSelecionada.tabela} 
            nomeAba={abaSelecionada.nome}
            modulosDisponiveis={MODULOS_DISPONIVEIS} 
          />
        )}
      </div>
    </div>
  )
}