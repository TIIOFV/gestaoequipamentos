import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { X, Ticket, Clock, CheckCircle2, XCircle, Search, MessageSquare, Calendar, ShieldCheck, FileText, Paperclip, Send, Loader2, PauseCircle, Ban, Monitor, Check, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { enviarNotificacao } from '../../../utils/notificacoes'

const STATUS_CONFIG = {
  'Enviado': { cor: 'slate', icone: <Clock size={16} />, texto: 'Aguardando Análise' },
  'Em Análise': { cor: 'amber', icone: <Search size={16} />, texto: 'Em Triagem pela Equipa' },
  'Pausado': { cor: 'purple', icone: <PauseCircle size={16} />, texto: 'Atendimento Pausado' },
  'O.S. Gerada': { cor: 'blue', icone: <Ticket size={16} />, texto: 'Em Atendimento (O.S. Aberta)' },
  'Resolvido': { cor: 'emerald', icone: <CheckCircle2 size={16} />, texto: 'Resolvido' },
  'Rejeitado': { cor: 'red', icone: <Ban size={16} />, texto: 'Rejeitado / Encerrado' },
  'Cancelado pelo Utilizador': { cor: 'rose', icone: <XCircle size={16} />, texto: 'Cancelado por Você' }
}

export default function ModalDetalhesChamado({ isOpen, onClose, chamado, usuarioId, onAtualizar }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [arquivoAnexo, setArquivoAnexo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  
  const [mostrarModalCancelamento, setMostrarModalCancelamento] = useState(false)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [cancelando, setCancelando] = useState(false)

  const scrollRef = useRef(null)

  const rolarParaFinal = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, 100)
  }

  // 🚀 CORREÇÃO DO CRASH: profile.id substituído pelo prop seguro usuarioId
  const buscarMensagens = useCallback(async () => {
    if (!chamado?.id) return;
    const { data } = await supabase
      .from('solicitacoes_mensagens')
      .select('*, autor:perfis(nome, perfil)')
      .eq('solicitacao_id', chamado.id)
      .order('created_at', { ascending: true })
    
    if (data) {
      setMensagens(data);
      rolarParaFinal();

      const mensagensDoTecnicoNaoLidas = data.filter(m => m.autor_id !== usuarioId && !m.lida_em);
      
      if (mensagensDoTecnicoNaoLidas.length > 0) {
        const ids = mensagensDoTecnicoNaoLidas.map(m => m.id);
        const agora = new Date().toISOString();
        
        setMensagens(prev => prev.map(m => ids.includes(m.id) ? { ...m, lida_em: agora } : m));
        await supabase.from('solicitacoes_mensagens').update({ lida_em: agora }).in('id', ids);
      }
    }
  }, [chamado?.id, usuarioId])

  useEffect(() => {
    if (isOpen && chamado?.id) {
      buscarMensagens()
      
      const canalId = `chat-cliente-${chamado.id}-${Date.now()}`
      const channel = supabase.channel(canalId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solicitacoes_mensagens', filter: `solicitacao_id=eq.${chamado.id}` }, () => {
          buscarMensagens()
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'solicitacoes_mensagens', filter: `solicitacao_id=eq.${chamado.id}` }, (payload) => {
          setMensagens(prev => prev.map(m => m.id === payload.new.id ? { ...m, lida_em: payload.new.lida_em } : m))
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    } else {
      setMensagens([]); setMostrarModalCancelamento(false); setMotivoCancelamento(''); setNovaMensagem(''); setArquivoAnexo(null)
    }
  }, [isOpen, chamado?.id, usuarioId, buscarMensagens])

  const confirmarCancelamentoPeloUsuario = async (e) => {
    e.preventDefault()
    if (!motivoCancelamento.trim()) { toast.error('Por favor, informe o motivo do cancelamento.'); return; }

    setCancelando(true)
    const { error } = await supabase.from('solicitacoes_suporte').update({ status: 'Cancelado pelo Utilizador', justificativa: motivoCancelamento.trim() }).eq('id', chamado.id)

    if (error) { toast.error('Erro ao cancelar chamado.'); setCancelando(false); return; }

    await supabase.from('solicitacoes_mensagens').insert([{ solicitacao_id: chamado.id, autor_id: usuarioId, mensagem: `[CHAMADO CANCELADO PELO UTILIZADOR]\nMotivo: ${motivoCancelamento.trim()}` }])

    if (chamado.tecnico_responsavel_id) {
      try {
        const numTicket = chamado.numero_ticket ? `#${String(chamado.numero_ticket).padStart(5, '0')}` : '#00001'
        await enviarNotificacao(chamado.tecnico_responsavel_id, 'Ticket Cancelado', `O utilizador cancelou o chamado ${numTicket}.`, chamado.id)
      } catch (err) { console.error(err) }
    }

    toast.success('Chamado cancelado com sucesso.')
    setCancelando(false); setMostrarModalCancelamento(false); onAtualizar(); onClose()
  }

  const enviarMensagemComAnexo = async (e) => {
    e.preventDefault()
    if (!novaMensagem.trim() && !arquivoAnexo) return

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

      const payload = { solicitacao_id: chamado.id, autor_id: usuarioId, mensagem: novaMensagem.trim() || (arquivoAnexo ? 'Enviou um anexo.' : ''), anexo_url: urlAnexo }
      const { data, error } = await supabase.from('solicitacoes_mensagens').insert([payload]).select('*, autor:perfis(nome, perfil)').single()

      if (!error && data) {
        setMensagens(prev => [...prev, data]); setNovaMensagem(''); setArquivoAnexo(null); rolarParaFinal()

        if (chamado.tecnico_responsavel_id) {
          try {
            const numTicket = chamado.numero_ticket ? `#${String(chamado.numero_ticket).padStart(5, '0')}` : '#00001'
            await enviarNotificacao(chamado.tecnico_responsavel_id, 'Nova Interação do Cliente', `O utilizador respondeu no chamado ${numTicket}.`, chamado.id)
          } catch (err) { console.error(err) }
        }
      } else {
        toast.error('Erro ao enviar mensagem.')
      }
    } catch (err) { toast.error('Erro ao enviar ficheiro.') } 
    finally { setEnviando(false) }
  }

  if (!isOpen || !chamado) return null

  const statusDef = STATUS_CONFIG[chamado.status] || STATUS_CONFIG['Enviado']
  const podeCancelar = chamado.status === 'Enviado' && !chamado.justificativa;
  const foiCanceladoOuRejeitado = ['Cancelado pelo Utilizador', 'Rejeitado'].includes(chamado.status);
  const prazoSlaFormatado = chamado.prazo_sla ? new Date(chamado.prazo_sla).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'A definir'
  const numeroProtocolo = chamado.numero_ticket ? `#${String(chamado.numero_ticket).padStart(5, '0')}` : '#00001'
  const tecnicoNome = chamado.tecnico?.nome;
  const isAtribuido = !!tecnicoNome;
  
  const anexosIniciais = Array.isArray(chamado.anexos) ? chamado.anexos : [];
  const tituloExibicao = chamado.titulo || chamado.equipamento?.nome || 'Chamado sem título'

  return (
    <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[9999] sm:p-4 transition-opacity">
      <div className="bg-white sm:rounded-[2rem] shadow-2xl max-w-5xl w-full h-[100dvh] sm:h-[85vh] sm:min-h-[600px] overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-150 relative">
        
        {mostrarModalCancelamento && (
          <div className="absolute inset-0 bg-white/95 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="max-w-md w-full space-y-4">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Motivo do Cancelamento</h3>
              <p className="text-xs text-slate-500 font-medium">Descreva brevemente o motivo pelo qual deseja cancelar este pedido:</p>
              <textarea 
                rows="4" value={motivoCancelamento} onChange={e => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: O problema já foi resolvido por conta própria..."
                className="w-full p-4 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium focus:ring-2 focus:ring-indigo-500 resize-none text-slate-800" autoFocus
              />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={confirmarCancelamentoPeloUsuario} disabled={cancelando || !motivoCancelamento.trim()} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50 transition-all shadow-md active:scale-95">
                  {cancelando ? 'A cancelar...' : 'Confirmar'}
                </button>
                <button type="button" onClick={() => setMostrarModalCancelamento(false)} className="px-5 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors">Voltar</button>
              </div>
            </div>
          </div>
        )}

        <div className="w-full md:w-[45%] lg:w-[40%] bg-slate-50 border-r border-slate-100 flex flex-col max-h-[40vh] md:max-h-none h-full">
          <div className="p-5 md:p-6 border-b border-slate-200/60 flex justify-between items-start bg-white shrink-0">
            <div className="min-w-0 pr-2">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">{numeroProtocolo}</span>
                <span className={`px-2 py-1 rounded-lg flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider bg-${statusDef.cor}-50 text-${statusDef.cor}-700 border border-${statusDef.cor}-200 truncate`}>
                  {statusDef.icone} <span className="truncate">{statusDef.texto}</span>
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-tight line-clamp-2" title={tituloExibicao}>{tituloExibicao}</h2>
              <div className="flex items-center gap-2 mt-2 bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg w-max max-w-full">
                <Monitor size={12} className="text-slate-400 shrink-0" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{chamado.equipamento?.nome || 'N/A'} • {chamado.equipamento?.patrimonio || 'S/N'}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors shrink-0"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 custom-scrollbar">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3 flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0"><Clock size={16} /></div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest truncate">Prazo Limite</p>
                  <p className="text-[11px] font-black text-indigo-900 mt-0.5 truncate">{prazoSlaFormatado}</p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold transition-colors ${isAtribuido ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  {isAtribuido ? <ShieldCheck size={16} /> : '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Responsável</p>
                  <p className="text-[11px] font-black text-slate-800 mt-0.5 truncate">{tecnicoNome || 'Pendente'}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FileText size={12} className="text-slate-400" /> Problema Relatado</p>
              <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{chamado.descricao}</p>
              
              {anexosIniciais.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-wrap gap-2">
                  {anexosIniciais.map((url, idx) => {
                    const isPdf = url.toLowerCase().includes('.pdf')
                    return (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 transition-colors shadow-sm">
                        {isPdf ? (
                          <><div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 font-black text-[10px]">PDF</div><span className="text-[10px] font-bold text-slate-700 truncate max-w-[80px]">Doc.pdf</span></>
                        ) : (<img src={url} alt="Anexo" className="w-8 h-8 object-cover rounded-lg shrink-0" />)}
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
            
            {foiCanceladoOuRejeitado && chamado.justificativa && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900">
                <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Registo de Encerramento / Cancelamento</p>
                <p className="text-xs font-bold mt-1.5">{chamado.justificativa}</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:flex-1 bg-white flex flex-col min-h-0 h-full relative border-t md:border-t-0 border-slate-200">
          <div className="p-4 md:p-6 pb-3 border-b border-slate-100 shrink-0 flex justify-between items-center bg-white">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14} className="text-indigo-500"/> Chat e Atualizações</h3>
            {podeCancelar && (
              <button type="button" onClick={() => setMostrarModalCancelamento(true)} className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 rounded-xl transition-all shadow-sm">Cancelar Chamado</button>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-slate-50/30 scroll-smooth">
            {mensagens.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">Ainda não há mensagens ou atualizações neste chamado.</div>
            ) : (
              <div className="space-y-4">
                {mensagens.map(msg => {
                  const isEu = msg.autor_id === usuarioId
                  const isPdfMsg = msg.anexo_url?.toLowerCase().includes('.pdf')

                  return (
                    <div key={msg.id} className={`flex flex-col ${isEu ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[9px] font-bold text-slate-500">{msg.autor?.nome || (isEu ? 'Você' : 'Equipa Técnica')}</span>
                      </div>
                      
                      <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${isEu ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                        {msg.mensagem && <p className="mb-1">{msg.mensagem}</p>}
                        {msg.anexo_url && (
                          <a href={msg.anexo_url} target="_blank" rel="noreferrer" className="block mt-2">
                            {isPdfMsg ? (<div className="flex items-center gap-2 p-2 bg-white/10 rounded-xl border border-white/20 text-[10px] font-bold"><FileText size={14} /> PDF</div>) : (<img src={msg.anexo_url} className="max-h-32 rounded-xl object-cover border border-white/20" />)}
                          </a>
                        )}
                        
                        <div className={`flex items-center justify-end gap-1 mt-2`}>
                          <span className={`text-[9px] ${isEu ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {/* 🚀 Confirmação de Leitura em Tempo Real no Cliente */}
                          {isEu && (
                            msg.lida_em 
                              ? <CheckCheck size={14} className="text-blue-300" /> 
                              : <Check size={14} className="text-indigo-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 shrink-0 flex flex-col gap-2">
            {arquivoAnexo && (
              <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                <span className="truncate max-w-[200px]">📎 {arquivoAnexo.name}</span><button type="button" onClick={() => setArquivoAnexo(null)} className="text-rose-500 hover:text-rose-700">Remover</button>
              </div>
            )}
            <form onSubmit={enviarMensagemComAnexo} className="flex gap-2">
              <label className="p-3 bg-white border border-slate-200 hover:border-indigo-400 text-slate-500 rounded-xl cursor-pointer transition-colors flex items-center justify-center shrink-0 shadow-sm">
                <Paperclip size={16} /><input type="file" onChange={e => setArquivoAnexo(e.target.files?.[0] || null)} className="hidden" />
              </label>
              <input type="text" placeholder="Mensagem..." value={novaMensagem} onChange={e => setNovaMensagem(e.target.value)} disabled={foiCanceladoOuRejeitado} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50 shadow-sm" />
              <button type="submit" disabled={enviando || (!novaMensagem.trim() && !arquivoAnexo) || foiCanceladoOuRejeitado} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center">
                {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}