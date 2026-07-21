import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Filter, Layers, Activity, Loader2, MapPin, Hash, ShieldAlert, FileSpreadsheet, CheckSquare } from 'lucide-react'
import * as XLSX from 'xlsx-js-style'
import toast from 'react-hot-toast'

// --- FUNÇÃO MESTRE DE ESTILIZAÇÃO (A mágica do Excel Premium) ---
const aplicarEstilosExcel = (ws, totalLinhas, totalColunas) => {
  // 1. Mesclar as duas primeiras linhas para o Título e Subtítulo
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalColunas - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalColunas - 1 } }
  ];

  const range = XLSX.utils.decode_range(ws['!ref']);
  
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' }; // Garante que a célula existe

      // Linha 0 (Título Principal)
      if (R === 0) {
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
          fill: { fgColor: { rgb: "0F172A" } }, // Slate 900 (Azul muito escuro)
          alignment: { horizontal: "center", vertical: "center" }
        };
      } 
      // Linha 1 (Subtítulo / Data)
      else if (R === 1) {
        ws[cellAddress].s = {
          font: { italic: true, color: { rgb: "475569" }, sz: 11 },
          fill: { fgColor: { rgb: "F8FAFC" } }, // Slate 50 (Cinza gelo)
          alignment: { horizontal: "center", vertical: "center" },
          border: { bottom: { style: "medium", color: { rgb: "CBD5E1" } } }
        };
      } 
      // Linha 2 (Cabeçalho das Colunas)
      else if (R === 2) { 
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "2563EB" } }, // Azul do Sistema IOFV
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} }
        };
      } 
      // Linhas de Dados Normais
      else { 
        ws[cellAddress].s = {
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: { top: {style:'thin', color: {rgb: "E2E8F0"}}, bottom: {style:'thin', color: {rgb: "E2E8F0"}}, left: {style:'thin', color: {rgb: "E2E8F0"}}, right: {style:'thin', color: {rgb: "E2E8F0"}} }
        };
      }
    }
  }

  // 2. Aplicar o Filtro estritamente na Linha 3 (Index 2)
  const ultimaColunaLetra = XLSX.utils.encode_col(totalColunas - 1);
  ws['!autofilter'] = { ref: `A3:${ultimaColunaLetra}${totalLinhas + 3}` }; 

  // 3. Congelar as linhas de cabeçalho (O título nunca some)
  ws['!freeze'] = { xSplit: 0, ySplit: 3 };
}

export default function RelatorioInventario({ moduloAtivo, nomeAmbiente, setBloquearImpressao }) {
  const [loading, setLoading] = useState(false)
  const [equipamentos, setEquipamentos] = useState([])
  const [auxiliares, setAuxiliares] = useState({ unidades: [], setores: [] })
  
  // Filtros
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')
  const [filtroSetor, setFiltroSetor] = useState('Todos')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  useEffect(() => {
    if (moduloAtivo) { carregarAuxiliares(); gerarRelatorio(); }
  }, [moduloAtivo, filtroUnidade, filtroSetor, filtroStatus])

  useEffect(() => {
    setBloquearImpressao(equipamentos.length === 0)
  }, [equipamentos, setBloquearImpressao])

  const carregarAuxiliares = async () => {
    const [uni, set] = await Promise.all([
      supabase.from('unidades').select('*').order('nome'),
      supabase.from('setores').select('*').order('nome')
    ])
    setAuxiliares({ unidades: uni.data || [], setores: set.data || [] })
  }

  const gerarRelatorio = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('equipamentos')
        .select(`
          id, nome, patrimonio, numero_serie, modelo, registro_anvisa, periodicidade,
          possui_etiqueta, sem_patrimonio, data_proxima_calibracao, data_ultima_calibracao,
          unidade:unidade_id(id, nome),
          setor:setor_id(id, nome),
          status:status_id(nome),
          fabricante:fabricante_id(nome),
          prestador:prestador_id(nome)
        `)
        .eq('modulo', moduloAtivo)
        .order('nome', { ascending: true })

      const { data, error } = await query
      if (error) throw error

      let filtrados = data || []

      if (filtroUnidade !== 'Todas') filtrados = filtrados.filter(e => String(e.unidade?.id) === String(filtroUnidade))
      if (filtroSetor !== 'Todos') filtrados = filtrados.filter(e => String(e.setor?.id) === String(filtroSetor))
      if (filtroStatus !== 'Todos') {
        filtrados = filtrados.filter(e => {
          const statusDB = e.status?.nome || '';
          return statusDB.toLowerCase().trim() === filtroStatus.toLowerCase().trim();
        })
      }

      setEquipamentos(filtrados)
    } catch (err) {
      toast.error('Erro ao buscar inventário.')
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // EXPORTAÇÃO PADRÃO
  // ==========================================
  const exportarExcel = () => {
    if (equipamentos.length === 0) return toast.error('Não há dados para exportar.')

    const dadosExcel = equipamentos.map(eq => ({
      'Equipamento': eq.nome || '-',
      'Fabricante': eq.fabricante?.nome || '-',
      'Modelo': eq.modelo || '-',
      'Patrimônio': eq.sem_patrimonio ? 'PENDENTE' : (eq.patrimonio || '-'),
      'Número de Série': eq.numero_serie || '-',
      'Registro ANVISA': eq.registro_anvisa || '-',
      'Periodicidade': eq.periodicidade || '-',
      'Unidade': eq.unidade?.nome || '-',
      'Setor': eq.setor?.nome || '-',
      'Status': eq.status?.nome || 'Não Informado',
      'Possui Etiqueta': eq.possui_etiqueta ? 'Sim' : 'Não',
      'Última Prev./Calib.': eq.data_ultima_calibracao ? new Date(eq.data_ultima_calibracao).toLocaleDateString('pt-BR') : '-',
      'Próxima Prev./Calib.': eq.data_proxima_calibracao ? new Date(eq.data_proxima_calibracao).toLocaleDateString('pt-BR') : '-'
    }))

    // Inicia inserção a partir da linha 3 (A3)
    const ws = XLSX.utils.json_to_sheet(dadosExcel, { origin: "A3" })
    XLSX.utils.sheet_add_aoa(ws, [[`INVENTÁRIO DO PARQUE TECNOLÓGICO - ${nomeAmbiente.toUpperCase()}`]], { origin: "A1" })
    XLSX.utils.sheet_add_aoa(ws, [[`Data de Exportação: ${new Date().toLocaleDateString('pt-BR')} | Total Listado: ${equipamentos.length} equipamentos`]], { origin: "A2" })

    ws['!cols'] = [ { wch: 35 }, { wch: 20 }, { wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 } ]
    
    // Aplica o design universal
    aplicarEstilosExcel(ws, equipamentos.length, Object.keys(dadosExcel[0]).length);

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventário')
    XLSX.writeFile(wb, `Inventario_${nomeAmbiente.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ==========================================
  // EXPORTAÇÃO EXCLUSIVA ONA
  // ==========================================
  const exportarExcelONA = () => {
    if (equipamentos.length === 0) return toast.error('Não há dados para exportar.')

    const dadosExcel = equipamentos.map(eq => ({
      'NOME DO EQUIPAMENTO': eq.nome || '-',
      'MODELO': eq.modelo || '-',
      'Nº SÉRIE': eq.numero_serie || '-',
      'FABRICANTE': eq.fabricante?.nome || '-',
      'REGISTRO DA ANVISA / CME': eq.registro_anvisa || '-',
      'SETOR': eq.setor?.nome || '-',
      'LOCALIZAÇÃO': eq.unidade?.nome || '-',
      'PERIODICIDADE SUGERIDA': eq.periodicidade ? eq.periodicidade.toUpperCase() : '-',
      'DATA PREVENTIVA REALIZADA': eq.data_ultima_calibracao ? new Date(eq.data_ultima_calibracao).toLocaleDateString('pt-BR') : '-',
      'DATA PROXIMA PREVENTIVA': eq.data_proxima_calibracao ? new Date(eq.data_proxima_calibracao).toLocaleDateString('pt-BR') : '-',
      'RESPONSÁVEL': eq.prestador?.nome || 'EQUIPE INTERNA'
    }))

    // Inicia inserção a partir da linha 3 (A3) para deixar espaço para os títulos
    const ws = XLSX.utils.json_to_sheet(dadosExcel, { origin: "A3" });
    
    XLSX.utils.sheet_add_aoa(ws, [[`CONTROLE DE EQUIPAMENTOS`]], { origin: "A1" })
    XLSX.utils.sheet_add_aoa(ws, [[`Data de Exportação: ${new Date().toLocaleDateString('pt-BR')} | Total Listado: ${equipamentos.length} equipamentos`]], { origin: "A2" })

    ws['!cols'] = [
      { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 25 },
      { wch: 25 }, { wch: 25 }, { wch: 25 }
    ];

    // Aplica o design universal
    aplicarEstilosExcel(ws, equipamentos.length, Object.keys(dadosExcel[0]).length);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Padrão_ONA');
    XLSX.writeFile(wb, `Controle_Equipamentos_ONA_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      <div className="no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><Filter size={14}/> Unidade</label>
          <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="Todas">Todas as Unidades</option>
            {auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><Layers size={14}/> Setor Hospitalar</label>
          <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="Todos">Todos os Setores</option>
            {auxiliares.setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><Activity size={14}/> Status Operacional</label>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="Todos">Todos os Status</option>
            <option value="Ativo">Apenas Ativos</option>
            <option value="Inoperante">Apenas Inoperantes</option>
            <option value="Manutenção">Em Manutenção</option>
            <option value="Baixa">Baixados / Desativados</option>
          </select>
        </div>

        <div className="flex items-end gap-3 w-full lg:w-auto mt-2 lg:mt-0">
          <button type="button" onClick={exportarExcel} disabled={equipamentos.length === 0} className="flex-1 lg:flex-none justify-center no-print flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95">
            <FileSpreadsheet size={16} /> Excel Padrão
          </button>
          
          <button type="button" onClick={exportarExcelONA} disabled={equipamentos.length === 0} className="flex-1 lg:flex-none justify-center no-print flex items-center gap-2 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-teal-50 font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 border border-teal-700">
            <CheckSquare size={16} /> Molde ONA
          </button>
        </div>
      </div>

      <div id="relatorio-impresso" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">{nomeAmbiente} - Relatório de Inventário</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Visão geral e status do parque tecnológico</p>
          </div>
          <div className="text-right text-xs md:text-sm text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div><span className="font-bold">Total Listado:</span> {equipamentos.length} equipamentos</div>
            <div className="mt-1"><span className="font-bold">Setor Gerado:</span> {filtroSetor === 'Todos' ? 'Todos os Setores' : auxiliares.setores.find(s => String(s.id) === String(filtroSetor))?.nome}</div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" size={32} /></div>
        ) : equipamentos.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-medium">Nenhum equipamento encontrado com estes filtros.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="py-3 px-4 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[35%]">Equipamento / Detalhes</th>
                <th className="py-3 px-4 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[25%]">Identificação (Pat/Série)</th>
                <th className="py-3 px-4 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[25%]">Localização Física</th>
                <th className="py-3 px-4 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[15%]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {equipamentos.map(eq => {
                const statusOriginal = eq.status?.nome || 'Não Informado';
                const statusLimpo = statusOriginal.toLowerCase().trim();

                return (
                  <tr key={eq.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 align-top">
                      <div className="font-black text-slate-800 uppercase text-xs md:text-sm leading-tight">{eq.nome}</div>
                      <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1 flex-wrap">
                        {eq.fabricante?.nome ? <span className="font-semibold text-slate-600">{eq.fabricante.nome}</span> : null}
                        {eq.fabricante?.nome && eq.modelo ? <span className="text-slate-300">•</span> : null}
                        {eq.modelo ? <span className="text-slate-500">Mod: {eq.modelo}</span> : null}
                        {!eq.fabricante?.nome && !eq.modelo && <span>Detalhes não informados</span>}
                      </div>
                    </td>
                    
                    <td className="py-4 px-4 align-top text-[11px] md:text-xs text-slate-600 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Hash size={12} className="text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-400">PAT:</span> 
                        {eq.sem_patrimonio ? (
                          <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded">PENDENTE</span>
                        ) : (
                          <span className="font-medium text-slate-800">{eq.patrimonio || '-'}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Hash size={12} className="text-slate-400 shrink-0 opacity-0" />
                        <span className="font-bold text-slate-400">SÉRIE:</span> 
                        <span className="font-medium text-slate-800">{eq.numero_serie || '-'}</span>
                      </div>
                      {eq.registro_anvisa && (
                        <div className="flex items-center gap-1.5">
                          <Activity size={12} className="text-emerald-500 shrink-0" />
                          <span className="font-bold text-emerald-700">ANVISA:</span>
                          <span className="font-medium text-emerald-800">{eq.registro_anvisa}</span>
                        </div>
                      )}
                    </td>
                    
                    <td className="py-4 px-4 align-top text-[11px] md:text-xs text-slate-700">
                      <div className="font-bold text-blue-800 flex items-start gap-1.5 mb-1">
                        <MapPin size={12} className="mt-0.5 text-blue-500 shrink-0" />
                        <span>{eq.unidade?.nome || 'Unidade não definida'}</span>
                      </div>
                      <div className="text-slate-500 ml-4">{eq.setor?.nome || 'Setor não vinculado'}</div>
                    </td>
                    
                    <td className="py-4 px-4 align-top">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded border ${
                        statusLimpo === 'ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        statusLimpo === 'inoperante' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        statusLimpo === 'manutenção' || statusLimpo === 'em manutenção' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        statusLimpo === 'baixa' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {statusLimpo === 'inoperante' && <ShieldAlert size={10} />}
                        {statusOriginal}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}