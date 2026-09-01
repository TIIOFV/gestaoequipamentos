import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { X, Wrench, AlertCircle, Loader2, Calendar, FileText, Hash, Settings2, Truck, AlertTriangle, UploadCloud, Paperclip } from 'lucide-react'
import toast from 'react-hot-toast'
import { enviarNotificacao } from '../../../utils/notificacoes' // 🚀 Importação do sistema de avisos

export default function ModalConverterOS({ isOpen, onClose, chamado, moduloAtivo, onSucesso }) {
  const { profile } = useAuth()
  const [salvando, setSalvando] = useState(false)

  const [listaPrestadores, setListaPrestadores] = useState([])
  const [listaStatus, setListaStatus] = useState([])

  const [tituloOS, setTituloOS] = useState('')
  const [descricaoOS, setDescricaoOS] = useState('')
  const [statusId, setStatusId] = useState('')
  const [tipoIntervencao, setTipoIntervencao] = useState('Corretiva')
  const [prestadorId, setPrestadorId] = useState('')
  const [dataAgendamento, setDataAgendamento] = useState('')
  const [protocoloExterno, setProtocoloExterno] = useState('')
  const [arquivosExtras, setArquivosExtras] = useState([])

  useEffect(() => {
    if (isOpen && chamado) {
      setTituloOS(chamado.titulo || `Manutenção: ${chamado.equipamento?.nome}`)
      setDescricaoOS(chamado.descricao || '')
      setTipoIntervencao('Corretiva')
      setPrestadorId('')
      setDataAgendamento('')
      setProtocoloExterno('')
      setArquivosExtras([])
      carregarConfiguracoes()
    }
  }, [isOpen, chamado, moduloAtivo])

  const carregarConfiguracoes = async () => {
    const { data: prestadores } = await supabase.from('prestadores').select('id, nome').order('nome')
    if (prestadores) setListaPrestadores(prestadores)

    const { data: statusData } = await supabase.from('status_chamado').select('id, nome').order('nome')
    if (statusData && statusData.length > 0) {
      setListaStatus(statusData)
      const statusInicial = statusData.find(s => s.nome.toLowerCase().includes('abert') || s.nome.toLowerCase().includes('pendente'))
      setStatusId(statusInicial ? statusInicial.id : statusData[0].id)
    }
  }

  const processarNovosArquivos = (files) => {
    if (!files || files.length === 0) return
    setArquivosExtras(prev => [...prev, ...files])
  }

  const removerArquivoExtra = (index) => {
    setArquivosExtras(prev => prev.filter((_, i) => i !== index))
  }

  if (!isOpen || !chamado) return null

  const converterParaOS = async (e) => {
    e.preventDefault()
    if (!tituloOS.trim()) { toast.error('O Título da O.S. é obrigatório.'); return; }
    if (!statusId) { toast.error('Selecione um status para a O.S.'); return; }

    setSalvando(true)
    toast.loading('A gerar Ordem de Serviço...', { id: 'gerar-os' })

    try {
      const urlsExtras = []
      if (arquivosExtras.length > 0) {
        for (const file of arquivosExtras) {
          const fileExt = file.name.split('.').pop()
          const fileName = `os_extra_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
          const { error: uploadError } = await supabase.storage.from('equipamentos').upload(fileName, file)
          
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('equipamentos').getPublicUrl(fileName)
            urlsExtras.push(publicUrlData.publicUrl)
          }
        }
      }

      const todosAnexosCombinados = [...(chamado.anexos || []), ...urlsExtras]

      const payloadOS = {
        titulo: tituloOS.trim(),
        descricao: descricaoOS.trim(),
        equipamento_id: chamado.equipamento_id,
        modulo: moduloAtivo,
        aberto_por_id: profile.id,
        status_id: statusId,
        tipo_intervencao: tipoIntervencao,
        anexos: todosAnexosCombinados
      }

      if (prestadorId) payloadOS.prestador_id = prestadorId
      if (dataAgendamento) payloadOS.data_prevista = dataAgendamento
      if (protocoloExterno) payloadOS.protocolo_externo = protocoloExterno

      const { data: novaOS, error: erroOS } = await supabase
        .from('chamados')
        .insert([payloadOS])
        .select()
        .single()

      if (erroOS) throw erroOS

      const { error: erroUpdate } = await supabase
        .from('solicitacoes_suporte')
        .update({ 
          status: 'O.S. Gerada',
          chamado_vinculado_id: novaOS.id,
          tecnico_responsavel_id: chamado.tecnico_responsavel_id || profile.id
        })
        .eq('id', chamado.id)

      if (erroUpdate) throw erroUpdate

      // 🚀 DISPARO DE NOTIFICAÇÃO PARA O CLIENTE INFORMANDO A ABERTURA DA O.S.
      const numTicket = chamado.numero_ticket ? `#${String(chamado.numero_ticket).padStart(5, '0')}` : '#00001'
      await enviarNotificacao(
        chamado.solicitante_id,
        'Ordem de Serviço Gerada',
        `Foi aberta uma Ordem de Serviço (O.S.) para o seu chamado ${numTicket}. O atendimento avançado foi iniciado.`,
        chamado.id
      )

      toast.success('O.S. gerada e classificada com sucesso!', { id: 'gerar-os' })
      if (onSucesso) onSucesso()
      onClose()

    } catch (error) {
      toast.error(`Erro ao gerar O.S: ${error.message}`, { id: 'gerar-os' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[99999] p-4 transition-opacity">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 shrink-0">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Wrench size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Triagem Avançada: Gerar O.S.</h2>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                Ticket Origem: <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{chamado.numero_ticket ? `#${String(chamado.numero_ticket).padStart(5, '0')}` : '#00001'}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/30 custom-scrollbar">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 text-blue-800 mb-8 shadow-sm">
            <AlertCircle size={20} className="shrink-0 text-blue-600 mt-0.5" />
            <p className="text-xs font-medium leading-relaxed">
              O ticket continuará aberto na fila de suporte em <strong>Em Execução (O.S.)</strong>. Complete os dados para gerar o documento formal na Central de O.S. Os anexos originais do utilizador serão transferidos.
            </p>
          </div>

          <form id="formOS" onSubmit={converterParaOS} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                <FileText size={16} className="text-slate-400" />
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Informações do Serviço</h3>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Equipamento Vinculado</label>
                <div className="px-4 py-3.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 select-none">
                  {chamado.equipamento?.nome} (Pat: {chamado.equipamento?.patrimonio || 'S/N'})
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Título da O.S. *</label>
                <input 
                  type="text" required value={tituloOS} onChange={e => setTituloOS(e.target.value)} 
                  className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Relato Técnico / Descrição do Serviço *</label>
                <textarea 
                  required rows="5" value={descricaoOS} onChange={e => setDescricaoOS(e.target.value)} 
                  className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none text-sm shadow-sm"
                />
              </div>
              
              <div className="pt-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Paperclip size={12} className="text-indigo-500" /> Anexar Laudos ou O.S. do Prestador
                </label>
                <div className="border-2 border-dashed border-slate-300 bg-slate-50 p-6 rounded-2xl flex flex-col items-center justify-center transition-all hover:bg-slate-100 relative cursor-pointer">
                  <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => processarNovosArquivos(Array.from(e.target.files))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <UploadCloud size={24} className="text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-600 text-center">Clique ou arraste novos ficheiros aqui</p>
                </div>
                
                {arquivosExtras.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {arquivosExtras.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-bold">
                        <span className="truncate max-w-[120px]">{file.name}</span>
                        <button type="button" onClick={() => removerArquivoExtra(idx)} className="text-red-500 hover:text-red-700"><X size={14}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                <Settings2 size={16} className="text-slate-400" />
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Classificação e Execução</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Status Inicial</label>
                  <select 
                    value={statusId} onChange={e => setStatusId(e.target.value)} 
                    className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer shadow-sm text-sm"
                  >
                    {listaStatus.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-indigo-500" /> Tipo Intervenção
                  </label>
                  <select 
                    value={tipoIntervencao} onChange={e => setTipoIntervencao(e.target.value)} 
                    className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer shadow-sm text-sm"
                  >
                    <option value="Corretiva">Corretiva</option>
                    <option value="Preventiva">Preventiva</option>
                    <option value="Qualificação">Qualificação</option>
                    <option value="Instalação">Instalação</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Truck size={12} className="text-indigo-500" /> Prestador Responsável
                </label>
                <select 
                  value={prestadorId} onChange={e => setPrestadorId(e.target.value)} 
                  className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer shadow-sm text-sm"
                >
                  <option value="">Equipe Interna (Sem prestador externo)</option>
                  {listaPrestadores.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Calendar size={12} className="text-indigo-500" /> Data Prevista
                  </label>
                  <input 
                    type="date" value={dataAgendamento} onChange={e => setDataAgendamento(e.target.value)} 
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Hash size={12} className="text-indigo-500" /> Prot. Externo
                  </label>
                  <input 
                    type="text" placeholder="Nº externo..." value={protocoloExterno} onChange={e => setProtocoloExterno(e.target.value)} 
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm shadow-sm"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 md:p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            Cancelar
          </button>
          <button 
            type="submit" form="formOS" disabled={salvando || !tituloOS.trim() || !statusId} 
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {salvando ? <Loader2 size={18} className="animate-spin" /> : <Wrench size={18} />} 
            Confirmar e Gerar O.S.
          </button>
        </div>
      </div>
    </div>
  )
}