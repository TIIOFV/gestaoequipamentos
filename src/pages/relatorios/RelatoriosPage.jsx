import { useState, useEffect } from 'react'
import { useModulo } from '../../contexts/ModuloContext'
import { FileText, Printer, PackageSearch, Wrench, Droplet, BarChart3 } from 'lucide-react'

import RelatorioInventario from './components/RelatorioInventario'
import RelatorioOS from './components/RelatorioOS'
import RelatorioBilhetagem from './components/RelatorioBilhetagem'
import RelatorioBI from './components/RelatorioBI' // 🚀 Importação do novo BI

export default function RelatoriosPage() {
  const { moduloAtivo } = useModulo()
  const [abaAtiva, setAbaAtiva] = useState('inventario')
  const [bloquearImpressao, setBloquearImpressao] = useState(true)

  const nomeAmbiente = {
    medicos: 'Engenharia Clínica',
    ti: 'Tecnologia da Informação',
    infra: 'Infraestrutura',
    manutencao: 'Manutenção Predial',
    impressoras: 'Impressoras & Copiadoras'
  }[moduloAtivo] || 'Relatório Analítico'

  useEffect(() => {
    if (abaAtiva === 'bilhetagem' && moduloAtivo !== 'impressoras') {
      setAbaAtiva('inventario')
    }
  }, [moduloAtivo, abaAtiva])

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">

      {/* 🚀 CSS ORIGINAL DE PRODUÇÃO RESTAURADO */}
      <style>{`
        @media print {
          .no-print, nav, aside, header, sidebar, button, [role="navigation"] { display: none !important; }
          html, body, #root, main, div, section, article {
            margin: 0 !important; padding: 0 !important; width: 100% !important;
            height: auto !important; min-height: auto !important; max-height: none !important;
            overflow: visible !important; position: static !important; background: #fff !important;
          }
          @page { size: A4 landscape; margin: 12mm 15mm; }
          #relatorio-impresso { display: block !important; width: 100% !important; border: none !important; padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
          thead { display: table-header-group !important; }
          tr { page-break-inside: avoid !important; }
          td, th { word-wrap: break-word !important; white-space: pre-wrap !important; font-size: 10pt !important; }
          
          /* Adição única para garantir que os gráficos do BI apareçam na impressão */
          .recharts-responsive-container { width: 100% !important; height: 250px !important; }
        }
      `}</style>

      {/* 🚀 CABEÇALHO ENTERPRISE */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase">
            <FileText className="text-blue-600" size={32} /> Central de Relatórios
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Gere relatórios padronizados e exporte para Excel ou PDF.</p>
        </div>

        <button
          onClick={() => window.print()}
          disabled={bloquearImpressao}
          className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest py-4 px-8 rounded-xl shadow-lg shadow-slate-800/20 transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer size={20} /> Imprimir / PDF
        </button>
      </div>

      {/* 🚀 NAVEGAÇÃO DE ABAS MOBILE-FRIENDLY */}
      <div className="no-print w-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex gap-2 p-1.5 bg-slate-200/60 rounded-2xl w-fit shadow-inner border border-slate-200/60">
          <button
            onClick={() => setAbaAtiva('inventario')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              abaAtiva === 'inventario' ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-300/50'
            }`}
          >
            <PackageSearch size={18} /> Parque de Equipamentos
          </button>
          
          <button
            onClick={() => setAbaAtiva('os')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              abaAtiva === 'os' ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-300/50'
            }`}
          >
            <Wrench size={18} /> Ordens de Serviço (OS)
          </button>

          {/* 🚀 NOVA ABA DE INDICADORES & BI */}
          <button
            onClick={() => setAbaAtiva('bi')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              abaAtiva === 'bi' ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-300/50'
            }`}
          >
            <BarChart3 size={18} /> Indicadores & BI
          </button>

          {moduloAtivo === 'impressoras' && (
            <button
              onClick={() => setAbaAtiva('bilhetagem')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                abaAtiva === 'bilhetagem' ? 'bg-white text-rose-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-300/50'
              }`}
            >
              <Droplet size={18} /> Fechamentos / Bilhetagem
            </button>
          )}
        </div>
      </div>

      {/* 🚀 RENDERIZAÇÃO CONDICIONAL DAS ABAS */}
      {abaAtiva === 'inventario' && <RelatorioInventario moduloAtivo={moduloAtivo} nomeAmbiente={nomeAmbiente} setBloquearImpressao={setBloquearImpressao} />}
      {abaAtiva === 'os' && <RelatorioOS moduloAtivo={moduloAtivo} nomeAmbiente={nomeAmbiente} setBloquearImpressao={setBloquearImpressao} />}
      {abaAtiva === 'bi' && <RelatorioBI moduloAtivo={moduloAtivo} />}
      {abaAtiva === 'bilhetagem' && <RelatorioBilhetagem moduloAtivo={moduloAtivo} nomeAmbiente={nomeAmbiente} setBloquearImpressao={setBloquearImpressao} />}

    </div>
  )
}