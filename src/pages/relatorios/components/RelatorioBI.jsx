import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { AlertTriangle, Clock, ListFilter, Table2, Download, RefreshCcw, PieChart as PieChartIcon, Activity, CheckCircle2, XOctagon } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts'
import { Skeleton } from '../../../components/ui/Skeleton'
import * as XLSX from 'xlsx-js-style'
import toast from 'react-hot-toast'

const CORES_STATUS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9']
const CORES_TECNICOS = ['#0284c7', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe']
const CORES_MODULOS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6']
const CORES_SLA = ['#10b981', '#f43f5e', '#cbd5e1']

const TODOS_MODULOS_SISTEMA = [
  { id: 'medicos', nome: 'Equipamentos Médicos' },
  { id: 'ti', nome: 'Tecnologia da Informação' },
  { id: 'infra', nome: 'Nobreaks & Baterias' },
  { id: 'impressoras', nome: 'Impressoras & Copiadoras' },
  { id: 'manutencao', nome: 'Manutenção Predial' }
]

const aplicarEstilosExcel = (ws, totalLinhas, totalColunas) => {
  ws['!merges'] = [ { s: { r: 0, c: 0 }, e: { r: 0, c: totalColunas - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: totalColunas - 1 } } ];
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };
      if (R === 0) ws[cellAddress].s = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 }, fill: { fgColor: { rgb: "0F172A" } }, alignment: { horizontal: "center", vertical: "center" } };
      else if (R === 1) ws[cellAddress].s = { font: { italic: true, color: { rgb: "475569" }, sz: 11 }, fill: { fgColor: { rgb: "F8FAFC" } }, alignment: { horizontal: "center", vertical: "center" }, border: { bottom: { style: "medium", color: { rgb: "CBD5E1" } } } };
      else if (R === 2) ws[cellAddress].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F46E5" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} } };
      else ws[cellAddress].s = { alignment: { horizontal: "left", vertical: "center", wrapText: true }, border: { top: {style:'thin', color: {rgb: "E2E8F0"}}, bottom: {style:'thin', color: {rgb: "E2E8F0"}}, left: {style:'thin', color: {rgb: "E2E8F0"}}, right: {style:'thin', color: {rgb: "E2E8F0"}} } };
    }
  }
  const ultimaColunaLetra = XLSX.utils.encode_col(totalColunas - 1);
  ws['!autofilter'] = { ref: `A3:${ultimaColunaLetra}${totalLinhas + 3}` }; 
}

export default function RelatorioBI({ moduloAtivo }) {
  const { profile } = useAuth()
  const [rawDados, setRawDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  
  const [periodo, setPeriodo] = useState('30')
  const [filtroModulo, setFiltroModulo] = useState(moduloAtivo || 'todos')
  const [filtroTecnico, setFiltroTecnico] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const buscarDadosTriagemGlobais = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setAtualizando(true)

    try {
      const [resHD, resEquip, resPerfis] = await Promise.all([
        supabase.from('solicitacoes_suporte').select('*'),
        supabase.from('equipamentos').select('id, nome, patrimonio, setor, modulo'),
        supabase.from('perfis').select('id, nome')
      ])

      const mapEquip = (resEquip.data || []).reduce((acc, eq) => { acc[eq.id] = eq; return acc }, {})
      const mapPerfis = (resPerfis.data || []).reduce((acc, p) => { acc[p.id] = p.nome; return acc }, {})

      const agoraMs = new Date().getTime();

      const formatados = (resHD.data || []).map(hd => {
        const eq = mapEquip[hd.equipamento_id] || {}
        
        let isAtrasado = false;
        if (hd.prazo_sla) {
          const limiteSlaMs = new Date(hd.prazo_sla).getTime();
          const resolucaoMs = hd.data_resolucao ? new Date(hd.data_resolucao).getTime() : agoraMs;
          if (resolucaoMs > limiteSlaMs) isAtrasado = true;
        }

        return {
          id: hd.id,
          codigo: hd.numero_ticket ? `#${String(hd.numero_ticket).padStart(5, '0')}` : `#00001`,
          titulo: hd.titulo || hd.descricao || 'Sem Assunto',
          modulo: eq.modulo || moduloAtivo || 'medicos',
          setor: eq.setor || 'Não Informado',
          equipamento_nome: eq.nome ? `${eq.nome} (${eq.patrimonio || 'S/N'})` : 'Geral (Sem Equipamento)',
          status: hd.status || 'Enviado',
          solicitante_nome: mapPerfis[hd.solicitante_id] || 'Utilizador',
          tecnico_id: hd.tecnico_responsavel_id || 'pendente',
          tecnico_nome: mapPerfis[hd.tecnico_responsavel_id] ? mapPerfis[hd.tecnico_responsavel_id].split(' ')[0] : 'Não Atribuído',
          created_at: hd.created_at,
          data_resolucao: hd.data_resolucao || null,
          prazo_sla: hd.prazo_sla || null,
          is_atrasado: isAtrasado
        }
      })

      formatados.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setRawDados(formatados)

    } catch (err) {
      console.error("Erro no BI:", err)
    } finally {
      setLoading(false)
      setAtualizando(false)
    }
  }, [moduloAtivo])

  useEffect(() => {
    buscarDadosTriagemGlobais()
    const canalUnico = `bi-realtime-${Math.random().toString(36).substring(7)}`
    const channel = supabase.channel(canalUnico)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_suporte' }, () => {
        buscarDadosTriagemGlobais(true)
      }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [buscarDadosTriagemGlobais])

  const { dadosFiltrados, listasFiltros, metricas } = useMemo(() => {
    let filtrados = rawDados

    const mapTecnicos = new Map(); 
    const mapStatus = new Set(['Enviado', 'Em Análise', 'Pausado', 'O.S. Gerada', 'Resolvido', 'Cancelado']); 
    rawDados.forEach(c => {
      if (c.tecnico_id !== 'pendente') mapTecnicos.set(c.tecnico_id, { id: c.tecnico_id, nome: c.tecnico_nome })
      if (c.status) mapStatus.add(c.status)
    })

    if (periodo !== 'todos') {
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - parseInt(periodo))
      filtrados = filtrados.filter(item => new Date(item.created_at) >= dataLimite)
    }

    filtrados = filtrados.filter(c => {
      if (filtroModulo !== 'todos' && c.modulo !== filtroModulo) return false
      if (filtroTecnico !== 'todos' && c.tecnico_id !== filtroTecnico) return false
      if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false
      return true
    })

    const totalGeral = filtrados.length
    const concluidos = filtrados.filter(d => ['Resolvido', 'Encerrado', 'Concluído'].includes(d.status)).length
    const cancelados = filtrados.filter(d => ['Rejeitado', 'Cancelado pelo Utilizador', 'Cancelado'].includes(d.status)).length
    const filaAtual = totalGeral - concluidos - cancelados
    
    const totalAtrasados = filtrados.filter(d => d.is_atrasado).length
    const comSLA = filtrados.filter(d => d.prazo_sla).length
    const noPrazo = comSLA - filtrados.filter(d => d.is_atrasado && d.prazo_sla).length
    
    const taxaResolucao = totalGeral > 0 ? Math.round((concluidos / totalGeral) * 100) : 0
    const taxaSLA = comSLA > 0 ? Math.round((noPrazo / comSLA) * 100) : 100

    const dadosVisaoSla = [
      { name: 'No Prazo', valor: noPrazo },
      { name: 'Atrasados', valor: filtrados.filter(d => d.is_atrasado && d.prazo_sla).length },
      { name: 'Sem SLA', valor: totalGeral - comSLA }
    ]

    const resolvidosComData = filtrados.filter(d => ['Resolvido', 'Encerrado', 'Concluído'].includes(d.status) && d.data_resolucao)
    let mttrTexto = "0.0 Horas" 
    if (resolvidosComData.length > 0) {
      const somaHoras = resolvidosComData.reduce((acc, curr) => {
        const fimMs = new Date(curr.data_resolucao).getTime()
        const inicioMs = new Date(curr.created_at).getTime()
        return acc + ((fimMs - inicioMs) / (1000 * 60 * 60))
      }, 0)
      const media = somaHoras / resolvidosComData.length
      mttrTexto = media > 24 ? `${(media / 24).toFixed(1)} Dias` : `${media.toFixed(1)} Horas`
    }

    const contar = (prop) => {
      const contagem = filtrados.reduce((acc, curr) => { acc[curr[prop]] = (acc[curr[prop]] || 0) + 1; return acc }, {})
      return Object.keys(contagem).map(key => ({ name: key, valor: contagem[key] })).sort((a, b) => b.valor - a.valor)
    }

    const contagemDia = filtrados.reduce((acc, curr) => {
      const d = new Date(curr.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      acc[d] = (acc[d] || 0) + 1; return acc
    }, {})

    const dadosTendenciaFormatados = Object.keys(contagemDia).map(key => {
      const vol = contagemDia[key];
      const perc = totalGeral > 0 ? Math.round((vol / totalGeral) * 100) : 0;
      return { 
        name: key, 
        volume: vol, 
        labelFormatada: `${vol} \n(${perc}%)` 
      }
    }).reverse()

    const dadosTecnicosComPercentagem = contar('tecnico_nome').slice(0, 8).map(d => ({
      ...d,
      labelFormatada: `${d.valor} (${totalGeral > 0 ? Math.round((d.valor / totalGeral) * 100) : 0}%)`
    }))

    return {
      dadosFiltrados: filtrados,
      listasFiltros: { tecnicos: Array.from(mapTecnicos.values()), status: Array.from(mapStatus) },
      metricas: { 
        totalGeral, concluidos, filaAtual, totalAtrasados, mttrTexto, taxaResolucao, taxaSLA, dadosVisaoSla,
        dadosTendencia: dadosTendenciaFormatados,
        dadosTecnicos: dadosTecnicosComPercentagem,
        dadosEquipamentos: contar('equipamento_nome').slice(0, 5),
        dadosModulos: contar('modulo').map(m => ({ name: TODOS_MODULOS_SISTEMA.find(x => x.id === m.name)?.nome || m.name, valor: m.valor }))
      }
    }
  }, [rawDados, filtroModulo, filtroTecnico, filtroStatus, periodo])

  const exportarExcel = () => {
    if (dadosFiltrados.length === 0) return toast.error('Não há dados para exportar.')
    
    const dadosExcel = dadosFiltrados.map(d => ({
      'Data de Abertura': new Date(d.created_at).toLocaleDateString('pt-BR'),
      'Ticket': d.codigo,
      'Módulo': TODOS_MODULOS_SISTEMA.find(x => x.id === d.modulo)?.nome || d.modulo.toUpperCase(),
      'Setor': d.setor,
      'Equipamento': d.equipamento_nome,
      'Título / Assunto': d.titulo,
      'Solicitante': d.solicitante_nome,
      'Analista Responsável': d.tecnico_nome,
      'Status Atual': d.status,
      'Prazo Limite (SLA)': d.prazo_sla ? new Date(d.prazo_sla).toLocaleString('pt-BR') : 'Sem SLA',
      'SLA Estourado?': d.is_atrasado ? 'SIM (Atrasado)' : 'NÃO (No Prazo)',
      'Data de Conclusão': d.data_resolucao ? new Date(d.data_resolucao).toLocaleDateString('pt-BR') : '-'
    }))

    const ws = XLSX.utils.json_to_sheet(dadosExcel, { origin: "A3" })
    XLSX.utils.sheet_add_aoa(ws, [[`RELATÓRIO ANALÍTICO - HELP DESK E TRIAGEM`]], { origin: "A1" })
    
    const periodoTexto = periodo === 'todos' ? 'Todo o Histórico' : `Últimos ${periodo} dias`
    XLSX.utils.sheet_add_aoa(ws, [[`Gerado por: ${profile?.nome || 'Sistema'} | Filtro: ${periodoTexto} | Registos: ${dadosFiltrados.length} | Atrasados: ${metricas.totalAtrasados}`]], { origin: "A2" })

    ws['!cols'] = [ { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 35 }, { wch: 40 }, { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 15 }, { wch: 18 } ]
    aplicarEstilosExcel(ws, dadosFiltrados.length, Object.keys(dadosExcel[0]).length)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Help Desk')
    XLSX.writeFile(wb, `Relatorio_Analitico_HelpDesk_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success("Excel gerado com sucesso!")
  }

  const renderCustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
    if (value === 0) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    return (
      <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10" fontWeight="bold">
        {name}: {value} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  return (
    <div className="animate-in fade-in duration-500 min-w-0 print:bg-white print:text-black">
      
      {/* 🖥️ PAINEL DE FILTROS (OCULTO NA IMPRESSÃO) */}
      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl flex flex-col gap-5 mb-8 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-700/50 pb-5 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
              <ListFilter className="text-indigo-400" size={24} /> 
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase flex items-center gap-2 tracking-tight">Painel de Indicadores {atualizando && <RefreshCcw size={14} className="animate-spin text-indigo-400" />}</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">Visão Analítica, SLA e Fila de Atendimento</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <span className="bg-slate-800 text-slate-300 border border-slate-700 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest">
              {metricas?.totalGeral || 0} Registos
            </span>
            <button onClick={exportarExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md active:scale-95 border border-emerald-500">
              <Download size={16} /> Coletar Dados (Excel)
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-200 text-sm font-bold rounded-xl px-4 py-3.5 outline-none focus:border-indigo-500 cursor-pointer">
            <option value="todos">Todo o Histórico</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 3 meses</option>
          </select>
          <select value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-200 text-sm font-bold rounded-xl px-4 py-3.5 outline-none focus:border-indigo-500 cursor-pointer">
            <option value="todos">Módulo: Todos</option>
            {TODOS_MODULOS_SISTEMA.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <select value={filtroTecnico} onChange={e => setFiltroTecnico(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-200 text-sm font-bold rounded-xl px-4 py-3.5 outline-none focus:border-indigo-500 cursor-pointer">
            <option value="todos">Analista: Todos</option>
            {listasFiltros?.tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-200 text-sm font-bold rounded-xl px-4 py-3.5 outline-none focus:border-indigo-500 cursor-pointer">
            <option value="todos">Status: Todos</option>
            {listasFiltros?.status.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 print:hidden"><Skeleton className="h-40 rounded-[2rem]"/><Skeleton className="h-96 rounded-[2rem]"/></div>
      ) : (
        // 🚀 ESPAÇAMENTO MESTRE RESTAURADO AQUI: space-y-8 na tela E print:space-y-10 na impressão
        <div id="relatorio-impresso" className="space-y-8 print:block print:w-full print:bg-white print:space-y-10">
          
          <div className="hidden print:block border-b-2 border-slate-300 pb-6 mb-8 text-center mt-2">
            <h1 className="text-3xl font-black uppercase text-black tracking-tight">Painel Analítico de Help Desk</h1>
            <p className="text-sm font-bold text-slate-600 mt-2 uppercase tracking-widest">
              Extração de Dados | Módulo: {filtroModulo === 'todos' ? 'Global' : TODOS_MODULOS_SISTEMA.find(x => x.id === filtroModulo)?.nome || filtroModulo} | Gerado por {profile?.nome?.split(' ')[0] || 'Sistema'} em {new Date().toLocaleString('pt-BR')}
            </p>
          </div>

          {/* 🚀 CARTÕES (Com bordas suaves definidas para o papel) */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 print:grid-cols-6 print:gap-4 print:mb-10">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center print:border print:border-slate-300 print:rounded-2xl print:bg-white print:p-4 print:text-center print:items-center print:shadow-none">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 print:text-slate-500">Total</p>
              <p className="text-2xl md:text-3xl font-black text-slate-800 print:text-black">{metricas.totalGeral}</p>
            </div>
            
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-center relative overflow-hidden print:border print:border-slate-300 print:rounded-2xl print:bg-white print:p-4 print:text-center print:items-center print:shadow-none">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1 z-10 print:text-slate-500">Fila Atual (Backlog)</p>
              <p className="text-2xl md:text-3xl font-black text-amber-800 z-10 print:text-black">
                {metricas.filaAtual} <span className="text-xs text-amber-600/80 font-bold ml-1 print:text-slate-400">({100 - metricas.taxaResolucao}%)</span>
              </p>
              <div className="absolute right-0 bottom-0 text-amber-200 opacity-20 transform translate-x-2 translate-y-2 print:hidden"><Activity size={60} /></div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center print:border print:border-slate-300 print:rounded-2xl print:bg-white print:p-4 print:text-center print:items-center print:shadow-none">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1 print:text-emerald-700">Resolvidos</p>
              <p className="text-2xl md:text-3xl font-black text-emerald-700 print:text-black">
                {metricas.concluidos} <span className="text-xs text-emerald-600/60 font-bold ml-1 print:text-slate-400">({metricas.taxaResolucao}%)</span>
              </p>
            </div>

            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-center relative overflow-hidden print:border print:border-slate-300 print:rounded-2xl print:bg-white print:p-4 print:text-center print:items-center print:shadow-none">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-700 mb-1 z-10 print:text-rose-700">Tickets Atrasados</p>
              <p className="text-2xl md:text-3xl font-black text-rose-800 z-10 print:text-black">{metricas.totalAtrasados}</p>
              <div className="absolute right-0 bottom-0 text-rose-200 opacity-20 transform translate-x-2 translate-y-2 print:hidden"><XOctagon size={60} /></div>
            </div>

            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col justify-center relative overflow-hidden print:border print:border-slate-300 print:rounded-2xl print:bg-white print:p-4 print:text-center print:items-center print:shadow-none">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1 z-10 print:text-emerald-700">SLA no Prazo (%)</p>
              <p className="text-2xl md:text-3xl font-black text-emerald-800 z-10 print:text-black">{metricas.taxaSLA}%</p>
              <div className="absolute right-0 bottom-0 text-emerald-200 opacity-20 transform translate-x-2 translate-y-2 print:hidden"><CheckCircle2 size={60} /></div>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl shadow-sm flex flex-col justify-center text-white print:border print:border-slate-300 print:rounded-2xl print:bg-white print:text-black print:p-4 print:text-center print:items-center print:shadow-none">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1 print:text-slate-500 flex items-center justify-center gap-1"><Clock size={12}/> MTTR Médio</p>
              <p className="text-xl md:text-2xl font-black print:text-black">{metricas.mttrTexto}</p>
            </div>
          </div>

          {/* 🚀 LINHA 1 DE GRÁFICOS (Com bordas e maior altura na impressão) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-w-0 print:grid-cols-2 print:gap-8 print:mb-10">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm min-w-0 print:border print:border-slate-300 print:rounded-2xl print:p-6 print:shadow-none">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 print:text-center print:text-black">Aberturas por Dia (Tendência)</h3>
              <div className="h-64 min-w-0 print:h-[280px] print:flex print:items-center print:justify-center">
                {metricas.dadosTendencia.length === 0 ? <p className="h-full flex justify-center items-center text-xs font-bold text-slate-400">Sem dados.</p> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metricas.dadosTendencia} margin={{ top: 35, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} width={30} />
                      <Tooltip cursor={{fill: '#f0f9ff'}} contentStyle={{borderRadius: '1rem', border: 'none'}} formatter={(value) => [`${value} chamados`, 'Aberturas']} />
                      <Bar dataKey="volume" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={30}>
                        <LabelList dataKey="labelFormatada" position="top" offset={10} style={{ fontSize: '10px', fontWeight: '900', fill: '#0ea5e9', whiteSpace: 'pre' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm min-w-0 print:border print:border-slate-300 print:rounded-2xl print:p-6 print:shadow-none">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 print:text-center print:text-black">Produtividade por Analista</h3>
              <div className="h-64 min-w-0 print:h-[280px] print:flex print:items-center print:justify-center">
                {metricas.dadosTecnicos.length === 0 ? <p className="h-full flex justify-center items-center text-xs font-bold text-slate-400">Sem dados.</p> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metricas.dadosTecnicos} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide={false} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} width={90} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border: 'none'}} formatter={(value) => [`${value} chamados`, 'Atendimentos']} />
                      <Bar dataKey="valor" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24}>
                        <LabelList dataKey="labelFormatada" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: '#475569' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* 🚀 LINHA 2 DE GRÁFICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-w-0 print:grid-cols-2 print:gap-8 print:mb-10">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm min-w-0 print:border print:border-slate-300 print:rounded-2xl print:p-6 print:shadow-none">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 print:text-center print:text-black">Visão de SLA</h3>
              <div className="h-64 flex flex-col items-center justify-center min-w-0 relative print:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={metricas.dadosVisaoSla} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="valor" label={renderCustomPieLabel} labelLine={true}>
                      {metricas.dadosVisaoSla.map((e, i) => <Cell key={i} fill={CORES_SLA[i % CORES_SLA.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '1rem', border: 'none'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm min-w-0 print:border print:border-slate-300 print:rounded-2xl print:p-6 print:shadow-none">
              <h3 className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-6 flex items-center justify-center gap-2 print:text-black">
                <AlertTriangle size={16} className="print:hidden"/> Top 5 Equipamentos Problemáticos
              </h3>
              {metricas.dadosEquipamentos.length === 0 ? <p className="py-8 text-center text-xs font-bold text-slate-400">Nenhum equipamento listado.</p> : (
                <div className="flex flex-col gap-4 print:gap-3">
                  {metricas.dadosEquipamentos.map((eq, i) => (
                    <div key={eq.name} className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex items-center justify-between print:bg-transparent print:border-b print:border-slate-200 print:px-2 print:py-3 print:rounded-none">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-lg font-black text-slate-400 w-6 shrink-0 print:text-black">#{i + 1}</span>
                        <p className="text-xs font-bold text-slate-700 truncate print:text-black">{eq.name}</p>
                      </div>
                      <div className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm shrink-0 print:border-none print:shadow-none print:text-black print:font-bold print:p-0">{eq.valor} Falhas</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 🚀 TABELA COM MARGEM SUPERIOR PARA DESCOLAR DOS GRÁFICOS */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-w-0 print:border-none print:shadow-none print:mt-12 print:rounded-none">
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between print:bg-slate-100 print:border-b-2 print:border-slate-300 print:py-3 print:px-4">
              <h3 className="text-[11px] md:text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 print:text-black">
                <Table2 size={18} className="print:hidden"/> Lista Sintética de Chamados
              </h3>
            </div>
            <div className="overflow-x-auto w-full custom-scrollbar print:overflow-visible">
              <table className="w-full text-left text-sm whitespace-nowrap print:whitespace-normal">
                <thead className="bg-white border-b border-slate-200 text-slate-500 print:border-b-2 print:border-slate-300 print:text-black">
                  <tr>
                    <th className="px-6 md:px-8 py-4 font-black text-[10px] uppercase tracking-widest print:px-2 print:text-center">Data / Ticket</th>
                    <th className="px-6 md:px-8 py-4 font-black text-[10px] uppercase tracking-widest print:px-2 print:text-center">SLA / Status</th>
                    <th className="px-6 md:px-8 py-4 font-black text-[10px] uppercase tracking-widest print:px-2 print:text-center">Título / Assunto</th>
                    <th className="px-6 md:px-8 py-4 font-black text-[10px] uppercase tracking-widest print:px-2 print:text-center">Equipamento</th>
                    <th className="px-6 md:px-8 py-4 font-black text-[10px] uppercase tracking-widest print:px-2 print:text-center">Analista Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                  {dadosFiltrados.slice(0, 100).map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                      <td className="px-6 md:px-8 py-4 print:px-2 print:py-3 align-middle print:text-center">
                        <div className="font-bold text-slate-700 text-xs print:text-black">{new Date(d.created_at).toLocaleDateString('pt-BR')}</div>
                        <div className="font-black text-indigo-700 text-[10px] mt-1 print:text-black">{d.codigo}</div>
                      </td>
                      <td className="px-6 md:px-8 py-4 print:px-2 print:py-3 align-middle print:text-center">
                        <div className="mb-1.5"><span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[9px] font-black uppercase tracking-wider text-slate-600 print:bg-transparent print:border-none print:px-0 print:text-xs print:text-black">{d.status}</span></div>
                        {d.is_atrasado && <div className="text-[9px] font-black uppercase text-rose-600 print:text-rose-700">⚠️ Atrasado</div>}
                        {!d.is_atrasado && d.prazo_sla && <div className="text-[9px] font-black uppercase text-emerald-600 print:text-emerald-700">✅ No Prazo</div>}
                      </td>
                      <td className="px-6 md:px-8 py-4 font-bold text-slate-800 truncate max-w-[200px] md:max-w-xs print:max-w-none print:whitespace-normal print:px-2 print:py-3 print:text-xs print:text-black align-middle print:text-center">{d.titulo}</td>
                      <td className="px-6 md:px-8 py-4 font-bold text-slate-600 print:px-2 print:py-3 print:text-xs print:whitespace-normal print:text-black align-middle print:text-center">{d.equipamento_nome}</td>
                      <td className="px-6 md:px-8 py-4 print:px-2 print:py-3 align-middle print:text-center">
                        <div className="font-bold text-slate-600 text-xs print:text-black">{d.tecnico_nome}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}