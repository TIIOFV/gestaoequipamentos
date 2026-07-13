import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Filter, CalendarDays, Loader2, FileSpreadsheet, Droplet, Layers } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

// Gera o YYYY-MM local perfeitamente
const getMesAtualLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const getMesPassadoLocal = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const formatarMesAno = (dataString) => {
  if (!dataString) return '-';
  const partes = dataString.split('T')[0].split('-');
  return `${partes[1]}/${partes[0]}`;
}

export default function RelatorioBilhetagem({ moduloAtivo, nomeAmbiente, setBloquearImpressao }) {
  const [loading, setLoading] = useState(false)
  const [leituras, setLeituras] = useState([])
  const [auxiliares, setAuxiliares] = useState({ unidades: [], setores: [] })

  const [periodoInicial, setPeriodoInicial] = useState(getMesPassadoLocal())
  const [periodoFinal, setPeriodoFinal] = useState(getMesAtualLocal())
  
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')
  const [filtroSetor, setFiltroSetor] = useState('Todos')
  const [visao, setVisao] = useState('mes_a_mes')

  useEffect(() => { carregarAuxiliares(); gerarRelatorio(); }, [periodoInicial, periodoFinal, filtroUnidade, filtroSetor, visao])
  useEffect(() => { setBloquearImpressao(leituras.length === 0) }, [leituras, setBloquearImpressao])

  const carregarAuxiliares = async () => {
    const [uni, set] = await Promise.all([ supabase.from('unidades').select('*').order('nome'), supabase.from('setores').select('*').order('nome') ])
    setAuxiliares({ unidades: uni.data || [], setores: set.data || [] })
  }

  const gerarRelatorio = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leituras_impressoras')
        .select(`
          *,
          equipamento:equipamento_id(nome, patrimonio, numero_serie, tipo_impressora, unidade:unidade_id(id, nome), setor:setor_id(id, nome))
        `)
        .order('mes_referencia', { ascending: false })

      if (error) throw error

      // 1. FILTRO DE DATAS BLINDADO EM JS (Ignora fuso horário do banco)
      let filtrados = (data || []).filter(l => {
        if (!l.equipamento) return false;
        const mesRef = l.mes_referencia.slice(0, 7); // Pega rigorosamente 'YYYY-MM'
        return mesRef >= periodoInicial && mesRef <= periodoFinal;
      })

      if (filtroUnidade !== 'Todas') filtrados = filtrados.filter(l => String(l.equipamento.unidade?.id) === String(filtroUnidade))
      if (filtroSetor !== 'Todos') filtrados = filtrados.filter(l => String(l.equipamento.setor?.id) === String(filtroSetor))
      
      if (visao === 'consolidado') {
        const agrupado = filtrados.reduce((acc, curr) => {
          const eqId = curr.equipamento_id
          if (!acc[eqId]) {
            acc[eqId] = { ...curr, contador_pb: 0, contador_cor: 0, contador_etiquetas: 0, contador_pulseiras: 0 }
          }
          acc[eqId].contador_pb += (curr.contador_pb || 0)
          acc[eqId].contador_cor += (curr.contador_cor || 0)
          acc[eqId].contador_etiquetas += (curr.contador_etiquetas || 0)
          acc[eqId].contador_pulseiras += (curr.contador_pulseiras || 0)
          return acc
        }, {})
        filtrados = Object.values(agrupado).sort((a, b) => a.equipamento.nome.localeCompare(b.equipamento.nome))
      }

      setLeituras(filtrados)
    } catch (err) { toast.error('Erro ao buscar bilhetagem.') } finally { setLoading(false) }
  }

  const exportarExcel = () => {
    const dadosExcel = leituras.map(l => {
      const linha = {};
      if (visao === 'mes_a_mes') linha['Mês Referência'] = formatarMesAno(l.mes_referencia);
      else linha['Período'] = `${formatarMesAno(periodoInicial)} a ${formatarMesAno(periodoFinal)}`;
      
      linha['Equipamento'] = l.equipamento.nome;
      linha['Patrimônio'] = l.equipamento.patrimonio || '-';
      linha['Unidade'] = l.equipamento.unidade?.nome || '-';
      linha['Setor'] = l.equipamento.setor?.nome || '-';
      linha['Páginas P&B'] = l.contador_pb || 0;
      linha['Páginas Cor'] = l.contador_cor || 0;
      linha['Etiquetas'] = l.contador_etiquetas || 0;
      linha['Pulseiras'] = l.contador_pulseiras || 0;
      linha['Volume Total'] = (l.contador_pb || 0) + (l.contador_cor || 0) + (l.contador_etiquetas || 0) + (l.contador_pulseiras || 0);
      return linha;
    });

    // Inicia a tabela na linha A3 para deixar espaço para o Cabeçalho
    const ws = XLSX.utils.json_to_sheet(dadosExcel, { origin: "A3" })
    
    // Adiciona o Título Profissional nas linhas 1 e 2
    XLSX.utils.sheet_add_aoa(ws, [[`RELATÓRIO DE BILHETAGEM - ${visao === 'mes_a_mes' ? 'MÊS A MÊS' : 'CONSOLIDADO'}`]], { origin: "A1" })
    XLSX.utils.sheet_add_aoa(ws, [[`Período Gerado: ${formatarMesAno(periodoInicial)} a ${formatarMesAno(periodoFinal)} | Total Registos: ${leituras.length}`]], { origin: "A2" })

    // Define as larguras fixas para não vir "espremido"
    ws['!cols'] = [ { wch: 18 }, { wch: 35 }, { wch: 18 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 } ];
    
    // Ativa os filtros automáticos a partir da linha A3
    ws['!autofilter'] = { ref: `A3:J${dadosExcel.length + 3}` }
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria")
    XLSX.writeFile(wb, `Bilhetagem_${visao}.xlsx`)
  }

  // Controle de largura para o PDF não quebrar
  const widthEq = visao === 'mes_a_mes' ? 'w-[35%]' : 'w-[45%]';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><CalendarDays size={14}/> Mês Inicial</label>
          <input type="month" value={periodoInicial} onChange={e => setPeriodoInicial(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none" />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><CalendarDays size={14}/> Mês Final</label>
          <input type="month" value={periodoFinal} onChange={e => setPeriodoFinal(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><Filter size={14}/> Unidade</label>
          <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none">
            <option value="Todas">Todas as Unidades</option>
            {auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><Layers size={14}/> Setor</label>
          <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none">
            <option value="Todos">Todos os Setores</option>
            {auxiliares.setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><Droplet size={14}/> Visão do Relatório</label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setVisao('mes_a_mes')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${visao === 'mes_a_mes' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Mês a Mês</button>
            <button onClick={() => setVisao('consolidado')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${visao === 'consolidado' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Soma Total</button>
          </div>
        </div>
        
        <button onClick={exportarExcel} disabled={leituras.length === 0} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          <FileSpreadsheet size={18} /> Excel
        </button>
      </div>

      <div id="relatorio-impresso" className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 lg:p-8 shadow-sm">
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">{nomeAmbiente} - Bilhetagem de Impressões</h2>
            <p className="text-[10px] md:text-xs text-blue-700 font-bold mt-2 bg-blue-50 inline-block px-2 py-1 rounded">Visão: {visao === 'mes_a_mes' ? 'Detalhado Mês a Mês' : 'Consolidado do Período'}</p>
          </div>
          <div className="w-full md:w-auto text-xs md:text-sm text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div><span className="font-bold">Período:</span> {formatarMesAno(periodoInicial)} a {formatarMesAno(periodoFinal)}</div>
            <div className="mt-1"><span className="font-bold">Registos:</span> {leituras.length} listados</div>
          </div>
        </div>

        {loading ? ( <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" size={32} /></div> ) 
        : leituras.length === 0 ? ( <div className="py-16 text-center text-slate-400 font-medium">Nenhuma contagem lançada nestes filtros.</div> ) : (
          <div className="w-full overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse min-w-[800px] print:min-w-full">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr>
                  {visao === 'mes_a_mes' && <th className="py-3 px-2 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[10%]">Mês Ref.</th>}
                  <th className={`py-3 px-2 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider ${widthEq}`}>Equipamento / Local</th>
                  <th className="py-3 px-2 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center w-[12%]">Págs P&B</th>
                  <th className="py-3 px-2 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center w-[12%]">Págs Cor</th>
                  <th className="py-3 px-2 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center w-[14%]">Etiq/Puls.</th>
                  <th className="py-3 px-2 md:px-4 text-[10px] md:text-[11px] font-bold text-blue-700 uppercase tracking-wider text-center w-[17%]">Total Impresso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leituras.map((l, i) => {
                  const total = (l.contador_pb || 0) + (l.contador_cor || 0) + (l.contador_etiquetas || 0) + (l.contador_pulseiras || 0)
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      {visao === 'mes_a_mes' && <td className="py-4 px-2 md:px-4 align-top text-xs md:text-sm font-bold text-slate-600">{formatarMesAno(l.mes_referencia)}</td>}
                      <td className="py-4 px-2 md:px-4 align-top">
                        <div className="font-black text-slate-800 uppercase text-xs md:text-sm leading-tight">{l.equipamento.nome}</div>
                        <div className="text-[11px] text-slate-500 mt-1">{l.equipamento.unidade?.nome} {l.equipamento.setor?.nome ? `(${l.equipamento.setor.nome})` : ''}</div>
                      </td>
                      <td className="py-4 px-2 md:px-4 align-top text-center text-xs md:text-sm font-medium text-slate-600">{l.contador_pb || '-'}</td>
                      <td className="py-4 px-2 md:px-4 align-top text-center text-xs md:text-sm font-bold text-rose-600">{l.contador_cor || '-'}</td>
                      <td className="py-4 px-2 md:px-4 align-top text-center text-xs md:text-sm font-bold text-emerald-600">{(l.contador_etiquetas || 0) + (l.contador_pulseiras || 0) || '-'}</td>
                      <td className="py-4 px-2 md:px-4 align-top text-center text-xs md:text-sm font-black text-blue-700 bg-blue-50/50">{total.toLocaleString('pt-BR')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}