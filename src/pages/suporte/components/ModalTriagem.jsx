import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useModulo } from '../../../contexts/ModuloContext'
import { useAuth } from '../../../contexts/AuthContext'
import { X, Send, Loader2, MessageSquare, Wrench, Ban, FileText, PauseCircle, PlayCircle, Clock, Paperclip, Monitor, CheckCircle2, Check, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import ModalConverterOS from './ModalConverterOS'
import { enviarNotificacao } from '../../../utils/notificacoes'

export default function ModalTriagem({ isOpen, onClose, chamado, onAtualizar }) {
  const { moduloAtivo } = useModulo()
  const { profile } = useAuth()

  const [mensagens, setMensagens] = useState([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [arquivoAnexo, setArquivoAnexo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [processando, setProcessando] = useState(false)
  
  const [motivoPausa, setMotivoPausa] = useState('')
  const [mostrarCampoPausa, setMostrarCampoPausa] = useState(false)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [mostrarCampoRejeicao, setMostrarCampoRejeicao] = useState(false)
  
  const [mostrarCampoSLA, setMostrarCampoSLA] = useState(false)
  const [mostrarCampoTecnico, setMostrarCampoTecnico] = useState(false)
  
  const [listaSlas, setListaSlas] = useState([])
  const [slaSelecionadoId, setSlaSelecionadoId] = useState('')
  const [listaTecnicos, setListaTecnicos] = useState([])
  const [tecnicoSelecionadoId, setTecnicoSelecionadoId] = useState('')
  const [modalConverterAberto, setModalConverterAberto] = useState(false)
  
  const scrollRef = useRef(null)

  const rolarParaFinal = () => { setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, 100) }

  const buscarSlasDisponiveis = async () => {
    const { data } = await supabase.from('slas').select('*').order('tempo_resolucao_horas')
    if (data) setListaSlas(data)
  }

  const buscarTecnicosDisponiveis = async () => {
    const { data } = await supabase.from('perfis').select('id, nome, perfil').eq('esta_bloqueado', false).order('nome')
    if (data) {
      const equipa = data.filter(u => ['administrador', 'analista'].includes(u.perfil?.toLowerCase()))
      setListaTecnicos(equipa)
    }
  }

  const verificarSLA = useCallback(async () => {
    if (!chamado?.id) return
    await buscarSlasDisponiveis()
    if (chamado.sla_id) { setSlaSelecionadoId(chamado.sla_id) }
  }, [chamado])

  const buscarMensagens = useCallback(async () => {
    if (!chamado?.id) return;
    const { data } = await supabase.from('solicitacoes_mensagens').select('*, autor:perfis(nome, perfil)').eq('solicitacao_id', chamado.id).order('created_at', { ascending: true })
    
    if (data) {
      setMensagens(prev => {
        if(JSON.stringify(prev) === JSON.stringify(data)) return prev;
        setTimeout(rolarParaFinal, 100);
        return data;
      });

      const naoLidas = data.filter(m => m.autor_id !== profile.id && !m.lida_em);
      if (naoLidas.length > 0) {
        const ids = naoLidas.map(m => m.id);
        const agora = new Date().toISOString();
        
        setMensagens(prev => prev.map(m => ids.includes(m.id) ? { ...m, lida_em: agora } : m));
        await supabase.from('solicitacoes_mensagens').update({ lida_em: agora }).in('id', ids);
      }
    }
  }, [chamado?.id, profile?.id])

  useEffect(() => {
    if (isOpen && chamado?.id) {
      buscarMensagens()
      buscarTecnicosDisponiveis()
      verificarSLA()
      setTecnicoSelecionadoId(chamado.tecnico_responsavel_id || '')
      
      const canalId = `chat-${chamado.id}-${Date.now()}`
      const channel = supabase.channel(canalId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solicitacoes_mensagens', filter: `solicitacao_id=eq.${chamado.id}` }, () => {
            buscarMensagens(); 
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'solicitacoes_mensagens', filter: `solicitacao_id=eq.${chamado.id}` }, (payload) => {
            setMensagens(prev => prev.map(m => m.id === payload.new.id ? { ...m, lida_em: payload.new.lida_em } : m));
        })
        .subscribe()
      
      return () => { supabase.removeChannel(channel) }
    } else {
      setMensagens([]); setMostrarCampoPausa(false); setMostrarCampoRejeicao(false); setMostrarCampoSLA(false); setMostrarCampoTecnico(false); setMotivoPausa(''); setMotivoRejeicao(''); setArquivoAnexo(null); setNovaMensagem('')
    }
  }, [isOpen, chamado, profile?.id, verificarSLA, buscarMensagens])

  const enviarMensagemComAnexo = async (e) => {
    e.preventDefault()
    if (!novaMensagem.trim() && !arquivoAnexo) return
    
    if (arquivoAnexo) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
      if (!allowedTypes.includes(arquivoAnexo.type)) {
        toast.error('Formato não permitido. Envie apenas JPG, PNG ou PDF.')
        return
      }
    }

    setEnviando(true)
    let urlAnexo = null
    try {
      if (arquivoAnexo) {
        const fileExt = arquivoAnexo.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `chat/${chamado.id}/${fileName}`
        const { error: uploadError } = await supabase.storage.from('equipamentos').upload(filePath, arquivoAnexo)
        if (!uploadError) { const { data: publicUrlData } = supabase.storage.from('equipamentos').getPublicUrl(filePath); urlAnexo = publicUrlData.publicUrl }
      }
      
      const payload = { solicitacao_id: chamado.id, autor_id: profile.id, mensagem: novaMensagem.trim() || (arquivoAnexo ? 'Enviou um anexo.' : ''), anexo_url: urlAnexo }
      const { data, error } = await supabase.from('solicitacoes_mensagens').insert([payload]).select('*, autor:perfis(nome, perfil)').single()
      
      if (!error && data) { 
        setMensagens(prev => [...prev, data]); setNovaMensagem(''); setArquivoAnexo(null); rolarParaFinal() 
        
        const numTicket = chamado.numero_ticket ? `#${String(chamado.numero_ticket).padStart(5, '0')}` : '#00001';
        const destinatarioId = profile.id === chamado.solicitante_id ? chamado.tecnico_responsavel_id : chamado.solicitante_id;

        if (destinatarioId) {
          await enviarNotificacao(
            destinatarioId, 
            'Nova Mensagem no Chamado', 
            `Há uma nova mensagem no ticket ${numTicket}.`, 
            chamado.id
          );
        }
      } else { 
        toast.error('Erro ao enviar mensagem.') 
      }
    } catch (err) { 
      toast.error('Erro ao enviar ficheiro.') 
    } finally { 
      setEnviando(false) 
    }
  }

  const alterarStatus = async (novoStatus, justificativaExtra = '') => {
    setProcessando(true)
    const payload = { status: novoStatus }
    if (justificativaExtra) payload.justificativa = justificativaExtra
    
    // 🚀 ADICIONE ISTO: Se o status for de encerramento, carimba a data exata
    if (['Resolvido', 'Encerrado', 'Concluído'].includes(novoStatus)) {
      payload.data_resolucao = new Date().toISOString()
    }
    
    const { error } = await supabase.from('solicitacoes_suporte').update(payload).eq('id', chamado.id)
    if (!error) { 
      toast.success(`Status alterado para: ${novoStatus}`)
      
      // 🚀 GARANTIA DE DISPARO DA NOTIFICAÇÃO AO ALTERAR STATUS NO MODAL
      if (chamado.solicitante_id) {
        const numTicket = chamado.numero_ticket ? `#${String(chamado.numero_ticket).padStart(5, '0')}` : '#00001';
        await enviarNotificacao(
          chamado.solicitante_id, 
          'Atualização no Chamado', 
          `O seu chamado ${numTicket} foi alterado para o status: ${novoStatus}.`, 
          chamado.id
        );
      }
      
      onAtualizar(); 
      onClose() 
    } else { 
      toast.error('Erro ao atualizar status.') 
    }
    setProcessando(false)
  }

  const handleAssumirChamado = async () => {
    setProcessando(true)
    const { error } = await supabase.from('solicitacoes_suporte').update({ status: 'Em Análise', tecnico_responsavel_id: profile.id }).eq('id', chamado.id)
    if (!error) { 
      toast.success('Chamado assumido!') 
      
      if (chamado.solicitante_id) {
        const numTicket = chamado.numero_ticket ? `#${String(chamado.numero_ticket).padStart(5, '0')}` : '#00001'
        await enviarNotificacao(
          chamado.solicitante_id, 
          'Atendimento Iniciado', 
          `O seu chamado ${numTicket} foi assumido por um técnico.`, 
          chamado.id
        );
      }
      
      onAtualizar() 
    } else { 
      toast.error('Erro ao assumir.') 
    }
    setProcessando(false)
  }

  const handleSalvarTecnico = async () => {
    setProcessando(true)
    const novoId = tecnicoSelecionadoId || null
    const payload = { tecnico_responsavel_id: novoId }
    if (!novoId && chamado.status === 'Em Análise') payload.status = 'Enviado'
    else if (novoId && chamado.status === 'Enviado') payload.status = 'Em Análise'
    
    const { error } = await supabase.from('solicitacoes_suporte').update(payload).eq('id', chamado.id)
    if (!error) { 
      toast.success(novoId ? 'Técnico atualizado!' : 'Devolvido à fila!') 
      setMostrarCampoTecnico(false) 
      
      if (novoId) {
        const numTicket = chamado.numero_ticket ? `#${String(chamado.numero_ticket).padStart(5, '0')}` : '#00001'
        await enviarNotificacao(
          novoId, 
          'Novo Chamado Atribuído', 
          `O chamado ${numTicket} foi atribuído a si.`, 
          chamado.id
        );
      }
      
      onAtualizar() 
    } else { 
      toast.error('Erro ao atualizar técnico.') 
    }
    setProcessando(false)
  }

  const handleSalvarSLA = async () => {
    if (!slaSelecionadoId) { toast.error('Selecione um SLA.'); return; }
    const slaEscolhido = listaSlas.find(s => s.id === slaSelecionadoId)
    if (!slaEscolhido) return
    setProcessando(true)
    const dataPrazo = new Date(new Date(chamado.created_at || Date.now()).getTime() + slaEscolhido.tempo_resolucao_horas * 3600000)
    const { error } = await supabase.from('solicitacoes_suporte').update({ sla_id: slaEscolhido.id, prazo_sla: dataPrazo.toISOString() }).eq('id', chamado.id)
    if (!error) { toast.success('SLA atualizado!'); setMostrarCampoSLA(false); onAtualizar() } 
    else { toast.error('Erro ao atualizar SLA.') }
    setProcessando(false)
  }

  if (!isOpen || !chamado) return null

  const isFinalizado = ['Resolvido', 'Rejeitado', 'Cancelado pelo Utilizador'].includes(chamado.status)
  const isPausado = chamado.status === 'Pausado'
  const isCanceladoPeloCliente = chamado.status === 'Cancelado pelo Utilizador'
  const isOsGerada = chamado.status === 'O.S. Gerada'
  const slaAtualObjeto = listaSlas.find(s => s.id === chamado.sla_id)
  const numeroProtocolo = chamado.numero_ticket ? `#${String(chamado.numero_ticket).padStart(5, '0')}` : '#00001'
  const tituloExibicao = chamado.titulo || chamado.equipamento?.nome || 'Chamado sem título'

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[9999] sm:p-4 transition-opacity">
        <div className="bg-white sm:rounded-[2rem] shadow-2xl max-w-5xl w-full h-[100dvh] sm:h-[85vh] sm:min-h-[600px] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-150 relative">
          
          {(mostrarCampoPausa || mostrarCampoRejeicao) && (
            <div className="absolute inset-0 bg-white/95 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="max-w-md w-full space-y-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${mostrarCampoRejeicao ? 'bg-rose-50 text-rose-600' : 'bg-purple-50 text-purple-600'}`}>
                  {mostrarCampoRejeicao ? <CheckCircle2 size={32} /> : <PauseCircle size={32} />}
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{mostrarCampoRejeicao ? 'Encerrar Chamado' : 'Pausar Chamado'}</h3>
                <p className="text-xs text-slate-500 font-medium">Por favor, informe a justificativa obrigatória para o histórico do ticket:</p>
                <textarea 
                  rows="4" autoFocus placeholder={mostrarCampoRejeicao ? "Ex: Problema resolvido remotamente, chamado duplicado..." : "Ex: Aguardando peça/orçamento..."}
                  value={mostrarCampoRejeicao ? motivoRejeicao : motivoPausa} 
                  onChange={e => mostrarCampoRejeicao ? setMotivoRejeicao(e.target.value) : setMotivoPausa(e.target.value)}
                  className="w-full p-4 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium focus:ring-2 focus:ring-indigo-500 resize-none text-slate-800"
                />
                <div className="flex gap-2 pt-2">
                  {mostrarCampoRejeicao ? (
                    <>
                      <button onClick={() => { if(!motivoRejeicao) return toast.error('Justifique.'); alterarStatus('Resolvido', motivoRejeicao.trim()) }} disabled={processando} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md">Resolver</button>
                      <button onClick={() => { if(!motivoRejeicao) return toast.error('Justifique.'); alterarStatus('Rejeitado', motivoRejeicao.trim()) }} disabled={processando} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md">Rejeitar Pedido</button>
                    </>
                  ) : (
                    <button onClick={() => { if(!motivoPausa) return toast.error('Justifique.'); alterarStatus('Pausado', motivoPausa.trim()) }} disabled={processando} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md">Confirmar Pausa</button>
                  )}
                  <button onClick={() => { setMostrarCampoRejeicao(false); setMostrarCampoPausa(false) }} className="px-5 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors">Voltar</button>
                </div>
              </div>
            </div>
          )}

          <div className="w-full md:w-[45%] lg:w-[40%] bg-slate-50 border-r border-slate-100 flex flex-col max-h-[40vh] md:max-h-none h-full">
            <div className="p-5 md:p-6 border-b border-slate-200/60 flex justify-between items-start bg-white shrink-0">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">{numeroProtocolo}</span>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${isPausado ? 'bg-purple-50 text-purple-700 border-purple-200' : isOsGerada ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>Status: {chamado.status}</span>
                </div>
                <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-tight mt-2 line-clamp-2" title={tituloExibicao}>{tituloExibicao}</h2>
                <div className="flex items-center gap-2 mt-2 bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg w-max max-w-full">
                  <Monitor size={12} className="text-slate-400 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{chamado.equipamento?.nome || 'N/A'} • {chamado.equipamento?.patrimonio || 'S/N'}</span>
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors shrink-0"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 custom-scrollbar">
              
              {(isCanceladoPeloCliente || (isFinalizado && chamado.justificativa)) && (
                <div className={`${isCanceladoPeloCliente ? 'bg-rose-50 border-rose-200' : 'bg-slate-100 border-slate-200'} border p-4 rounded-2xl flex items-start gap-3`}>
                  {isCanceladoPeloCliente ? <Ban className="text-rose-600 shrink-0 mt-0.5" size={18} /> : <CheckCircle2 className="text-slate-600 shrink-0 mt-0.5" size={18} />}
                  <div>
                    <h4 className={`text-[11px] font-black uppercase tracking-wide ${isCanceladoPeloCliente ? 'text-rose-900' : 'text-slate-800'}`}>
                      {isCanceladoPeloCliente ? 'Cancelado pelo Solicitante' : 'Ticket Encerrado'}
                    </h4>
                    <p className={`text-xs mt-1 font-medium ${isCanceladoPeloCliente ? 'text-rose-700' : 'text-slate-600'}`}>
                      <strong>Motivo: </strong> {chamado.justificativa || 'Sem justificativa informada.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12} className="text-indigo-600" /> Nível de SLA</span>
                  {!isFinalizado && <button onClick={() => setMostrarCampoSLA(!mostrarCampoSLA)} className="text-[10px] font-bold text-indigo-600 hover:underline">{mostrarCampoSLA ? 'Cancelar' : 'Alterar SLA'}</button>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{slaAtualObjeto ? `${slaAtualObjeto.nome} (${slaAtualObjeto.tempo_resolucao_horas}h)` : 'Não classificado'}</span>
                  {chamado.prazo_sla && <span className="text-[10px] font-medium text-slate-400">Limite: {new Date(chamado.prazo_sla).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
                {mostrarCampoSLA && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <select value={slaSelecionadoId} onChange={e => setSlaSelecionadoId(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800">
                      <option value="">Selecione um SLA</option>
                      {listaSlas.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.tempo_resolucao_horas}h)</option>)}
                    </select>
                    <button onClick={handleSalvarSLA} disabled={processando || !slaSelecionadoId} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-bold uppercase transition-colors">Aplicar Novo SLA</button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Solicitante</p>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white p-2 rounded-xl border border-slate-200 truncate">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 shrink-0 font-black">
                      {chamado.solicitante?.nome?.charAt(0) || 'U'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate pr-1">{chamado.solicitante?.nome || 'Utilizador'}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {chamado.solicitante?.setor && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider border border-slate-200 truncate">
                            {chamado.solicitante.setor}
                          </span>
                        )}
                        {chamado.solicitante?.ramal && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider border border-slate-200">
                            Ramal: {chamado.solicitante.ramal}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável (Equipa)</p>
                    {!isFinalizado && <button onClick={() => { setTecnicoSelecionadoId(chamado.tecnico_responsavel_id || ''); setMostrarCampoTecnico(!mostrarCampoTecnico) }} className="text-[10px] font-bold text-indigo-600 hover:underline">{mostrarCampoTecnico ? 'X' : 'Alterar'}</button>}
                  </div>
                  {!mostrarCampoTecnico ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white p-2 rounded-xl border border-slate-200 truncate h-full min-h-[46px]">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white shrink-0 font-black ${chamado.tecnico?.nome ? 'bg-indigo-600' : 'bg-slate-300'}`}>{chamado.tecnico?.nome?.charAt(0) || '?'}</div>
                      <span className="truncate pr-1">{chamado.tecnico?.nome || 'Pendente'}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 relative z-10">
                      <select value={tecnicoSelecionadoId} onChange={e => setTecnicoSelecionadoId(e.target.value)} className="w-full px-2 py-1.5 text-[11px] bg-indigo-50 border border-indigo-200 rounded-lg outline-none font-bold text-indigo-800">
                        <option value="">Devolver (Fila)</option>
                        {listaTecnicos.map(t => <option key={t.id} value={t.id}>{t.nome.split(' ')[0]}</option>)}
                      </select>
                      <button onClick={handleSalvarTecnico} disabled={processando} className="w-full bg-indigo-600 text-white py-1.5 rounded-lg text-[10px] font-bold uppercase">Salvar</button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Problema Relatado</p>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">{chamado.descricao}</div>
              </div>

              {chamado.anexos && chamado.anexos.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><FileText size={12}/> Evidências ({chamado.anexos.length})</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {chamado.anexos.map((url, i) => {
                      const isPdf = url.toLowerCase().includes('.pdf')
                      return (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-400 transition-colors block shadow-sm bg-white flex items-center justify-center">
                          {isPdf ? <span className="text-red-500 font-black text-[10px]">PDF</span> : <img src={url} className="w-full h-full object-cover" />}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200/60 bg-white grid grid-cols-3 gap-2 shrink-0">
              {isFinalizado ? (
                <div className="col-span-3 text-center py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 rounded-xl border border-dashed border-slate-200">Ticket Encerrado</div>
              ) : isOsGerada ? (
                <div className="col-span-3 text-center py-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 rounded-xl border border-blue-200 shadow-sm flex items-center justify-center gap-2">
                  <Wrench size={14} /> Atendimento na Central de O.S.
                </div>
              ) : !chamado.tecnico_responsavel_id ? (
                <>
                  <button onClick={() => setMostrarCampoRejeicao(true)} disabled={processando} className="px-2 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm flex flex-col items-center justify-center gap-1"><Ban size={14} /> Rejeitar</button>
                  <button onClick={handleAssumirChamado} disabled={processando} className="col-span-2 px-2 py-3 bg-emerald-600 border border-transparent text-white hover:bg-emerald-700 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md flex flex-col items-center justify-center gap-1"><PlayCircle size={14} /> Assumir Chamado</button>
                </>
              ) : (
                <>
                  <button onClick={() => setMostrarCampoRejeicao(true)} disabled={processando} className="px-2 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm flex flex-col items-center justify-center gap-1"><Ban size={14} /> Encerrar</button>
                  {isPausado ? (
                    <button onClick={() => alterarStatus('Em Análise')} disabled={processando} className="px-2 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm flex flex-col items-center justify-center gap-1"><PlayCircle size={14} /> Retomar</button>
                  ) : (
                    <button onClick={() => setMostrarCampoPausa(true)} disabled={processando} className="px-2 py-3 bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm flex flex-col items-center justify-center gap-1"><PauseCircle size={14} /> Pausar</button>
                  )}
                  <button onClick={() => setModalConverterAberto(true)} disabled={processando} className="px-2 py-3 bg-indigo-600 border border-transparent text-white hover:bg-indigo-700 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md flex flex-col items-center justify-center gap-1"><Wrench size={14} /> Gerar O.S</button>
                </>
              )}
            </div>
          </div>

          <div className="w-full md:flex-1 bg-white flex flex-col min-h-0 h-full relative border-t md:border-t-0 border-slate-200">
            <div className="p-4 md:p-6 pb-3 border-b border-slate-100 shrink-0 flex justify-between items-center bg-white">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14} className="text-indigo-500"/> Chat do Suporte</h3>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar scroll-smooth bg-slate-50/30">
              {mensagens.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-bold">Nenhuma mensagem trocada ainda.</div>
              ) : (
                mensagens.map(msg => {
                  const isTecnico = ['administrador', 'analista'].includes(msg.autor?.perfil?.toLowerCase())
                  const isEu = msg.autor_id === profile?.id
                  const isPdfMsg = msg.anexo_url?.toLowerCase().includes('.pdf')

                  return (
                    <div key={msg.id} className={`flex flex-col ${isTecnico ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className={`text-[9px] font-bold ${isTecnico ? 'text-indigo-600' : 'text-slate-500'}`}>{isEu ? 'Você (Analista)' : isTecnico ? `${msg.autor?.nome} (Equipa)` : msg.autor?.nome}</span>
                      </div>
                      
                      <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${isTecnico ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                        {msg.mensagem && <p className="mb-1">{msg.mensagem}</p>}
                        
                        {msg.anexo_url && (
                          <a href={msg.anexo_url} target="_blank" rel="noreferrer" className="block mt-2">
                            {isPdfMsg ? <div className="flex items-center gap-2 p-2 bg-white/10 rounded-xl border border-white/20 text-[10px] font-bold"><FileText size={14} /> PDF</div> : <img src={msg.anexo_url} className="max-h-32 rounded-xl object-cover border border-white/20" />}
                          </a>
                        )}

                        <div className={`flex items-center justify-end gap-1 mt-2`}>
                          <span className={`text-[9px] ${isTecnico ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          {isEu && (
                            msg.lida_em 
                              ? <CheckCheck size={14} className={isTecnico ? "text-blue-300" : "text-blue-500"} /> 
                              : <Check size={14} className={isTecnico ? "text-indigo-300" : "text-slate-400"} />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-3 md:p-4 bg-slate-50 border-t border-slate-100 shrink-0 flex flex-col gap-2">
              {arquivoAnexo && (
                <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                  <span className="truncate max-w-[200px]">📎 {arquivoAnexo.name}</span><button onClick={() => setArquivoAnexo(null)} className="text-red-500 hover:text-rose-700 font-bold">Remover</button>
                </div>
              )}
              <form onSubmit={enviarMensagemComAnexo} className="flex gap-2">
                <label className="p-3 bg-white border border-slate-200 hover:border-indigo-400 text-slate-500 rounded-xl cursor-pointer transition-colors flex items-center justify-center shrink-0 shadow-sm">
                  <Paperclip size={16} />
                  <input type="file" accept="image/png, image/jpeg, image/jpg, application/pdf" onChange={e => setArquivoAnexo(e.target.files?.[0] || null)} className="hidden" />
                </label>
                <input type="text" placeholder="Responda ao utilizador aqui..." value={novaMensagem} onChange={e => setNovaMensagem(e.target.value)} disabled={isFinalizado} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50 shadow-sm" />
                <button type="submit" disabled={enviando || (!novaMensagem.trim() && !arquivoAnexo) || isFinalizado} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center">
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <ModalConverterOS isOpen={modalConverterAberto} onClose={() => setModalConverterAberto(false)} chamado={chamado} moduloAtivo={moduloAtivo} onSucesso={() => { onAtualizar(); onClose() }} />
    </>
  )
}