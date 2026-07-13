import { useState, useEffect } from 'react'
import { useModulo } from '../../contexts/ModuloContext'
import { FileText, Printer, PackageSearch, Wrench, Droplet } from 'lucide-react'

// Importaremos os sub-módulos
import RelatorioInventario from './components/RelatorioInventario'
import RelatorioOS from './components/RelatorioOS'
import RelatorioBilhetagem from './components/RelatorioBilhetagem'

export default function RelatoriosPage() {
  const { moduloAtivo } = useModulo()
  const [abaAtiva, setAbaAtiva] = useState('inventario') // 'inventario', 'os' ou 'bilhetagem'
  const [bloquearImpressao, setBloquearImpressao] = useState(true)

  const nomeAmbiente = {
    medicos: 'Engenharia Clínica',
    ti: 'Tecnologia da Informação',
    infra: 'Infraestrutura',
    manutencao: 'Manutenção Predial',
    impressoras: 'Impressoras & Copiadoras'
  }[moduloAtivo] || 'Relatório Analítico'

  // Se trocar de módulo e a aba de bilhetagem não existir mais ali, volta para inventário
  useEffect(() => {
    if (abaAtiva === 'bilhetagem' && moduloAtivo !== 'impressoras') {
      setAbaAtiva('inventario')
    }
  }, [moduloAtivo, abaAtiva])

  return (
    <div className="relative min-h-full font-sans pb-10 animate-in fade-in duration-500">

      {/* CSS DE IMPRESSÃO GLOBAL (Blindado para PDF perfeito) */}
      <style>{`
        @media print {
          .no-print, nav, aside, header, sidebar, button, [role="navigation"] { display: none !important; }
          html, body, #root, main, div, section, article {
            margin: 0 !important; padding: 0 !important; width: 100% !important;
            height: auto !important; min-height: auto !important; max-height: none !important;
            overflow: visible !important; position: static !important; background: #fff !important;
          }
          @page { size: A4 landscape; margin: 12mm 15mm; }
          #relatorio-impresso { display: block !important; width: 100% !important; }
          table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
          thead { display: table-header-group !important; }
          tr { page-break-inside: avoid !important; }
          td, th { word-wrap: break-word !important; white-space: pre-wrap !important; font-size: 10pt !important; }
        }
      `}</style>

      {/* PAINEL SUPERIOR - NO-PRINT */}
      <div className="no-print mb-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <FileText className="text-blue-600" size={28} /> Central de Relatórios
            </h1>
            <p className="text-sm text-slate-500 mt-1">Gere relatórios customizados e exporte para Excel ou PDF.</p>
          </div>

          <button
            onClick={() => window.print()}
            disabled={bloquearImpressao}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={20} /> Imprimir / PDF
          </button>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex gap-2 p-1 bg-slate-200/60 rounded-xl w-fit flex-wrap">
          <button
            onClick={() => setAbaAtiva('inventario')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
              abaAtiva === 'inventario' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
            }`}
          >
            <PackageSearch size={18} /> Parque de Equipamentos
          </button>
          <button
            onClick={() => setAbaAtiva('os')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
              abaAtiva === 'os' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Wrench size={18} /> Ordens de Serviço (OS)
          </button>

          {moduloAtivo === 'impressoras' && (
            <button
              onClick={() => setAbaAtiva('bilhetagem')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                abaAtiva === 'bilhetagem' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Droplet size={18} /> Fechamentos / Bilhetagem
            </button>
          )}
        </div>
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL DOS MÓDULOS */}
      {abaAtiva === 'inventario' && (
        <RelatorioInventario
          moduloAtivo={moduloAtivo}
          nomeAmbiente={nomeAmbiente}
          setBloquearImpressao={setBloquearImpressao}
        />
      )}
      {abaAtiva === 'os' && (
        <RelatorioOS
          moduloAtivo={moduloAtivo}
          nomeAmbiente={nomeAmbiente}
          setBloquearImpressao={setBloquearImpressao}
        />
      )}
      {abaAtiva === 'bilhetagem' && (
        <RelatorioBilhetagem
          moduloAtivo={moduloAtivo}
          nomeAmbiente={nomeAmbiente}
          setBloquearImpressao={setBloquearImpressao}
        />
      )}

    </div>
  )
}