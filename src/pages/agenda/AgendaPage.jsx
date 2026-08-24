import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import { useAuth } from '../../contexts/AuthContext'
import { Calendar as CalendarIcon, Plus } from 'lucide-react'

import AgendaKpis from './components/AgendaKpis'
import AgendaCalendario from './components/AgendaCalendario'
import { ModalDiaAgenda, ModalListaAnual } from './components/AgendaModals'

export default function AgendaPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { moduloAtivo } = useModulo()
  
  const [dataAtual, setDataAtual] = useState(new Date())
  const [chamadosAgenda, setChamadosAgenda] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [filtroResponsavel, setFiltroResponsavel] = useState('Todos')
  
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  
  const [estatisticasAno, setEstatisticasAno] = useState({
    total: { count: 0, lista: [] }, realizados: { count: 0, lista: [] }, 
    aFazer: { count: 0, lista: [] }, atrasados: { count: 0, lista: [] }
  })
  const [modalListaAnual, setModalListaAnual] = useState({ aberto: false, titulo: '', cor: '', lista: [] })

  const canEdit = profile?.perfil === 'administrador' || profile?.perfil === 'analista'

  useEffect(() => {
    if (!moduloAtivo) return;
    carregarDados()
  }, [moduloAtivo])

  useEffect(() => {
    calcularEstatisticasAnuais(dataAtual.getFullYear())
  }, [dataAtual, chamadosAgenda, filtroResponsavel])

  const carregarDados = async () => {
    const { data: perfis } = await supabase.from('perfis').select('id, nome').order('nome')
    if (perfis) setResponsaveis(perfis)

    const { data: chamados } = await supabase
      .from('chamados')
      .select(`*, equipamento:equipamento_id(nome, patrimonio, numero_serie, unidade:unidade_id(nome), setor:setor_id(nome)), status:status_id(nome), aberto_por:aberto_por_id(nome), prestador:prestador_id(nome)`)
      .eq('modulo', moduloAtivo)
    
    if (chamados) setChamadosAgenda(chamados)
  }

  const calcularEstatisticasAnuais = (anoFoco) => {
    const hojeLocal = new Date();
    const hojeStr = `${hojeLocal.getFullYear()}-${String(hojeLocal.getMonth() + 1).padStart(2, '0')}-${String(hojeLocal.getDate()).padStart(2, '0')}`;

    const listasTemp = { total: [], realizados: [], aFazer: [], atrasados: [] }

    chamadosAgenda.forEach(ch => {
      if (filtroResponsavel !== 'Todos' && ch.aberto_por_id !== filtroResponsavel) return

      const dataStr = ch.data_prevista ? ch.data_prevista.split('T')[0] : (ch.data_abertura ? ch.data_abertura.split('T')[0] : null)
      if (!dataStr) return
      
      const anoChamado = parseInt(dataStr.substring(0, 4))

      if (anoChamado === anoFoco) {
        listasTemp.total.push(ch)
        
        if (ch.status?.nome === 'Concluído') {
          listasTemp.realizados.push(ch)
        } else {
          if (dataStr < hojeStr) {
            listasTemp.atrasados.push(ch)
          } else {
            listasTemp.aFazer.push(ch)
          }
        }
      }
    })

    const ordenarPorData = (a, b) => new Date(a.data_prevista || a.data_abertura) - new Date(b.data_prevista || b.data_abertura);

    setEstatisticasAno({ 
      total: { count: listasTemp.total.length, lista: listasTemp.total.sort(ordenarPorData) }, 
      realizados: { count: listasTemp.realizados.length, lista: listasTemp.realizados.sort(ordenarPorData) }, 
      aFazer: { count: listasTemp.aFazer.length, lista: listasTemp.aFazer.sort(ordenarPorData) }, 
      atrasados: { count: listasTemp.atrasados.length, lista: listasTemp.atrasados.sort(ordenarPorData) }
    })
  }

  const abrirModalLista = (titulo, cor, lista) => {
    if (lista.length === 0) return; 
    setModalListaAnual({ aberto: true, titulo, cor, lista })
  }

  const mudarMes = (direcao) => setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() + direcao, 1))
  const mudarAno = (direcao) => setDataAtual(new Date(dataAtual.getFullYear() + direcao, dataAtual.getMonth(), 1))
  const irParaHoje = () => setDataAtual(new Date())

  const ano = dataAtual.getFullYear()
  const mes = dataAtual.getMonth()
  const primeiroDiaDoMes = new Date(ano, mes, 1).getDay()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()

  const diasDoCalendario = []
  for (let i = 0; i < primeiroDiaDoMes; i++) diasDoCalendario.push(null)
  for (let i = 1; i <= diasNoMes; i++) {
    const strDate = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    diasDoCalendario.push({ dia: i, dataCompleta: strDate })
  }

  const getCorEvento = (tipo, statusNome) => {
    const isConcluido = statusNome === 'Concluído'
    if (tipo === 'Preventiva') return !isConcluido ? 'bg-[#009e49] text-white' : 'bg-[#bcf0cf] text-[#006b31]'
    if (tipo === 'Calibração') return !isConcluido ? 'bg-[#1a5ce5] text-white' : 'bg-[#b8d1ff] text-[#103a94]'
    if (tipo === 'Qualificação') return !isConcluido ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'
    if (tipo === 'Corretiva')  return !isConcluido ? 'bg-[#d82128] text-white' : 'bg-[#ffc2c4] text-[#8c1216]'
    return 'bg-slate-500 text-white'
  }

  const dataFormatada = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataAtual)
  const tituloMes = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1)

  const eventosFiltrados = chamadosAgenda
    .filter(ch => filtroResponsavel === 'Todos' || ch.aberto_por_id === filtroResponsavel)
    .map(ch => ({
      ...ch,
      dataPlotagem: ch.data_prevista ? ch.data_prevista.split('T')[0] : (ch.data_abertura ? ch.data_abertura.split('T')[0] : ''),
      statusExibicao: ch.status?.nome === 'Concluído' ? 'Realizada' : 'Agendada'
    }))

  const eventosDoDiaSelecionado = diaSelecionado 
    ? eventosFiltrados.filter(e => e.dataPlotagem === diaSelecionado) 
    : []

  return (
    // 🚀 OTIMIZAÇÃO: w-full e space-y-6
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* 🚀 HEADER PRINCIPAL PADRONIZADO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase">
            <CalendarIcon className="text-blue-600" size={32} /> Agenda Técnica
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Acompanhamento e planeamento do cronograma anual.</p>
        </div>

        {canEdit && (
          <button 
            onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { action: 'novo' } })}
            className="w-full md:w-auto bg-blue-800 hover:bg-blue-900 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-800/20 transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"
          >
            <Plus size={20} /> Agendar Manutenção
          </button>
        )}
      </div>

      <AgendaKpis 
        ano={ano} 
        estatisticasAno={estatisticasAno} 
        abrirModalLista={abrirModalLista} 
      />

      <AgendaCalendario 
        ano={ano} mes={mes} dataAtual={dataAtual} tituloMes={tituloMes} 
        diasDoCalendario={diasDoCalendario} eventosFiltrados={eventosFiltrados}
        mudarAno={mudarAno} mudarMes={mudarMes} irParaHoje={irParaHoje}
        setDiaSelecionado={setDiaSelecionado} getCorEvento={getCorEvento}
        filtroResponsavel={filtroResponsavel} setFiltroResponsavel={setFiltroResponsavel}
        responsaveis={responsaveis}
      />

      <ModalDiaAgenda 
        diaSelecionado={diaSelecionado} setDiaSelecionado={setDiaSelecionado}
        eventosDoDiaSelecionado={eventosDoDiaSelecionado} getCorEvento={getCorEvento}
        canEdit={canEdit} navigate={navigate} moduloAtivo={moduloAtivo}
      />

      <ModalListaAnual 
        modalListaAnual={modalListaAnual} setModalListaAnual={setModalListaAnual}
        navigate={navigate} moduloAtivo={moduloAtivo} canEdit={canEdit}
      />

    </div>
  )
}