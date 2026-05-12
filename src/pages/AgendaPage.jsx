import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight, X, Plus, Calendar as CalendarIcon, Filter, MapPin, Wrench, Clock } from 'lucide-react'

export default function AgendaPage() {
  const navigate = useNavigate()
  
  const [dataAtual, setDataAtual] = useState(new Date())
  const [chamadosAgenda, setChamadosAgenda] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [filtroResponsavel, setFiltroResponsavel] = useState('Todos')
  
  // NOVO ESTADO: Agora guardamos o DIA clicado, não apenas um evento
  const [diaSelecionado, setDiaSelecionado] = useState(null)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    const { data: perfis } = await supabase.from('perfis').select('id, nome').order('nome')
    if (perfis) setResponsaveis(perfis)

    // QUERY TURBINADA: Trazendo Setor e Unidade de dentro do Equipamento
    const { data: chamados } = await supabase
      .from('chamados')
      .select(`
        *,
        equipamento:equipamento_id(
          nome, 
          patrimonio, 
          numero_serie,
          unidade:unidade_id(nome),
          setor:setor_id(nome)
        ),
        status:status_id(nome),
        aberto_por:aberto_por_id(nome),
        prestador:prestador_id(nome)
      `)
    
    if (chamados) setChamadosAgenda(chamados)
  }

  const mudarMes = (direcao) => setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() + direcao, 1))
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
    if (tipo === 'Corretiva')  return !isConcluido ? 'bg-[#d82128] text-white' : 'bg-[#ffc2c4] text-[#8c1216]'
    return 'bg-slate-500 text-white'
  }

  const dataFormatada = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataAtual)
  const tituloMes = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1)

  const eventosFiltrados = chamadosAgenda
    .filter(ch => filtroResponsavel === 'Todos' || ch.aberto_por_id === filtroResponsavel)
    .map(ch => ({
      ...ch,
      dataPlotagem: ch.data_prevista ? ch.data_prevista : ch.data_abertura.split('T')[0],
      statusExibicao: ch.status?.nome === 'Concluído' ? 'Realizada' : 'Agendada'
    }))

  // Filtra os eventos apenas do dia clicado para jogar no Modal
  const eventosDoDiaSelecionado = diaSelecionado 
    ? eventosFiltrados.filter(e => e.dataPlotagem === diaSelecionado) 
    : []

  return (
    <div className="relative min-h-full font-sans pb-10">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1e293b] flex items-center gap-3">
            <CalendarIcon className="text-blue-600" /> Agenda Técnica
          </h1>
          <p className="text-slate-500 mt-1">Acompanhamento do cronograma de manutenções.</p>
        </div>
        <button 
          onClick={() => navigate('/chamados', { state: { action: 'novo' } })}
          className="bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Agendar Manutenção
        </button>
      </div>

      {/* PAINEL DE CONTROLE (FILTRO + LEGENDAS) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col xl:flex-row gap-8 items-start xl:items-center justify-between">
        <div className="w-full xl:w-72 shrink-0">
          <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <Filter size={16} /> Filtrar por responsável
          </label>
          <select 
            value={filtroResponsavel}
            onChange={(e) => setFiltroResponsavel(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="Todos">Todos os responsáveis</option>
            {responsaveis.map(resp => <option key={resp.id} value={resp.id}>{resp.nome}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
          <span className="px-4 py-2 bg-[#009e49] text-white text-xs font-bold rounded-lg text-center shadow-sm">Preventiva Agendada</span>
          <span className="px-4 py-2 bg-[#1a5ce5] text-white text-xs font-bold rounded-lg text-center shadow-sm">Calibração Agendada</span>
          <span className="px-4 py-2 bg-[#d82128] text-white text-xs font-bold rounded-lg text-center shadow-sm">Corretiva Agendada</span>
          <span className="px-4 py-2 bg-[#bcf0cf] text-[#006b31] text-xs font-bold rounded-lg text-center border border-[#009e49]/20">Preventiva Realizada</span>
          <span className="px-4 py-2 bg-[#b8d1ff] text-[#103a94] text-xs font-bold rounded-lg text-center border border-[#1a5ce5]/20">Calibração Realizada</span>
          <span className="px-4 py-2 bg-[#ffc2c4] text-[#8c1216] text-xs font-bold rounded-lg text-center border border-[#d82128]/20">Corretiva Realizada</span>
        </div>
      </div>

      {/* CALENDÁRIO GRID */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-2xl font-bold text-slate-800">{tituloMes}</h2>
          <div className="flex items-center gap-3">
            <button onClick={irParaHoje} className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors shadow-sm text-sm">
              Hoje
            </button>
            <div className="flex items-center bg-[#1e293b] text-white rounded-xl overflow-hidden shadow-sm">
              <button onClick={() => mudarMes(-1)} className="p-2.5 hover:bg-slate-700 transition-colors"><ChevronLeft size={20} /></button>
              <button onClick={() => mudarMes(1)} className="p-2.5 hover:bg-slate-700 transition-colors border-l border-slate-700"><ChevronRight size={20} /></button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
            <div key={dia} className="py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider border-r border-slate-100 last:border-0">{dia}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr bg-white">
          {diasDoCalendario.map((diaObj, index) => {
            const isHoje = diaObj?.dataCompleta === new Date().toISOString().split('T')[0]
            
            return (
              <div 
                key={index} 
                // EVENTO DE CLIQUE AGORA FICA NA CÉLULA DO DIA INTEIRO
                onClick={() => diaObj && setDiaSelecionado(diaObj.dataCompleta)}
                className={`min-h-[140px] p-2 border-b border-r border-slate-100 last:border-r-0 relative group transition-colors cursor-pointer ${
                  isHoje ? 'bg-blue-50/30 hover:bg-blue-50/60' : 'hover:bg-slate-50'
                }`}
              >
                {diaObj && (
                  <>
                    <div className="flex justify-end mb-2">
                      <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${isHoje ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 group-hover:text-slate-800'}`}>
                        {diaObj.dia}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 px-1">
                      {eventosFiltrados
                        .filter(m => m.dataPlotagem === diaObj.dataCompleta)
                        .map(evento => (
                          <div 
                            key={evento.id}
                            className={`text-xs px-2 py-1.5 rounded-md truncate font-bold shadow-sm border border-black/5 ${getCorEvento(evento.tipo_intervencao, evento.status?.nome)}`}
                          >
                            {evento.tipo_intervencao?.substring(0, 4)}: {evento.equipamento?.patrimonio || 'S/N'}
                          </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* =========================================================
          NOVO MODAL: LISTA DE ATIVIDADES DO DIA
          ========================================================= */}
      {diaSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-50 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-in zoom-in duration-200 relative overflow-hidden border border-slate-200">
            
            {/* Header do Modal Fixo */}
            <div className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Atividades do dia</h2>
                <p className="text-blue-600 font-medium mt-1">
                  {new Date(diaSelecionado + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setDiaSelecionado(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Corpo do Modal Rolável */}
            <div className="p-8 overflow-y-auto space-y-6">
              
              {eventosDoDiaSelecionado.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                    <CalendarIcon className="text-slate-300" size={30} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">Dia livre</h3>
                  <p className="text-slate-500">Nenhuma manutenção agendada ou realizada nesta data.</p>
                </div>
              ) : (
                eventosDoDiaSelecionado.map(evento => (
                  <div key={evento.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                    
                    {/* Cabeçalho do Card da OS */}
                    <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider text-white shadow-sm ${getCorEvento(evento.tipo_intervencao, evento.status?.nome).split(' ')[0]}`}>
                          {evento.statusExibicao}
                        </span>
                        <h3 className="text-lg font-bold text-slate-800">{evento.tipo_intervencao}</h3>
                      </div>
                      <div className="text-sm font-bold text-slate-500 flex items-center gap-2">
                        <MapPin size={16} className="text-blue-500" />
                        {evento.equipamento?.unidade?.nome || 'Unidade não informada'} - {evento.equipamento?.setor?.nome || 'Setor não informado'}
                      </div>
                    </div>

                    {/* Dados da OS */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      <div className="space-y-4">
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Equipamento</span>
                          <span className="text-slate-800 font-bold text-base">{evento.equipamento?.nome || 'Equipamento Excluído'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Patrimônio</span>
                            <span className="text-slate-700 font-medium">{evento.equipamento?.patrimonio || '-'}</span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Série</span>
                            <span className="text-slate-700 font-medium">{evento.equipamento?.numero_serie || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Empresa / Prestador</span>
                          <span className="text-slate-700 font-medium">{evento.prestador?.nome || 'Manutenção Interna'}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Responsável / Aberto por</span>
                          <span className="text-slate-700 font-medium">{evento.aberto_por?.nome || '-'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status OS</span>
                            <span className="text-slate-700 font-bold">{evento.status?.nome || '-'}</span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Protocolo / OS</span>
                            <span className="text-slate-700 font-medium">{evento.protocolo_externo || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Data do Registro</span>
                          <span className="text-slate-700 font-medium flex items-center gap-1">
                            <Clock size={14} className="text-slate-400" />
                            {new Date(evento.data_abertura).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {/* Descrição em largura total */}
                      <div className="md:col-span-2 pt-4 border-t border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Wrench size={14} /> Descrição da Manutenção / Relato
                        </span>
                        <p className="text-slate-600 text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-200">
                          {evento.descricao || 'Nenhuma descrição registrada para esta atividade.'}
                        </p>
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}