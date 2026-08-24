import { useState, useEffect } from 'react'
import { ArrowLeft, Paperclip, FileText, X, UploadCloud, Monitor, Clock, Calendar, Ticket, CheckCircle2, Building, Hash, Save, Loader2, AlignLeft } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const converteParaInputLocal = (dataIsoUTC) => {
  if (!dataIsoUTC) return '';
  const d = new Date(dataIsoUTC);
  if (isNaN(d.getTime())) return '';
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const converteParaBancoUTC = (dataInputLocal) => {
  if (!dataInputLocal) return null;
  return new Date(dataInputLocal).toISOString();
};

export default function ChamadoForm({ view, chamadoInicial, equipamentoIdNovo, auxiliares, usuarioAtual, moduloAtivo, voltarParaLista, onSalvo }) {
  const [loading, setLoading] = useState(false)
  const [isDraggingAtivo, setIsDraggingAtivo] = useState(false) 

  const estadoInicialForm = {
    id: null, equipamento_id: equipamentoIdNovo || '', tipo_intervencao: 'Corretiva',
    status_id: '', prestador_id: '', protocolo_externo: '',
    descricao: '', data_abertura: converteParaInputLocal(new Date().toISOString()), data_prevista: '',
    data_conclusao_manual: '', 
    aberto_por_id: usuarioAtual?.id || '', anexos: [] 
  }

  const [formData, setFormData] = useState(estadoInicialForm)

  useEffect(() => {
    if (view === 'editar' && chamadoInicial) {
      setFormData({
        id: chamadoInicial.id, equipamento_id: chamadoInicial.equipamento_id || '', tipo_intervencao: chamadoInicial.tipo_intervencao || 'Corretiva',
        status_id: chamadoInicial.status_id || '', prestador_id: chamadoInicial.prestador_id || '', protocolo_externo: chamadoInicial.protocolo_externo || '',
        descricao: chamadoInicial.descricao || '', 
        data_abertura: chamadoInicial.data_abertura ? converteParaInputLocal(chamadoInicial.data_abertura) : converteParaInputLocal(new Date().toISOString()),
        data_prevista: chamadoInicial.data_prevista || '', 
        data_conclusao_manual: chamadoInicial.data_conclusao ? chamadoInicial.data_conclusao.split('T')[0] : '', 
        aberto_por_id: chamadoInicial.aberto_por_id || usuarioAtual?.id, anexos: chamadoInicial.anexos || []
      })
    }
  }, [view, chamadoInicial, usuarioAtual])

  const isPDF = (url) => url?.toLowerCase().includes('.pdf')

  const processarArquivos = async (filesArray) => {
    if (filesArray.length === 0) return;
    
    setLoading(true);
    toast.loading('A processar anexos...', { id: 'upload-anexo' });

    try {
      const novasUrls = [];
      for (const file of filesArray) {
        const fileExt = file.name.split('.').pop();
        const fileName = `os_anexo_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('equipamentos').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('equipamentos').getPublicUrl(fileName);
        novasUrls.push(publicUrl);
      }
      setFormData(prev => ({ ...prev, anexos: [...(prev.anexos || []), ...novasUrls] }));
      toast.success(`${filesArray.length} anexo(s) carregado(s)!`, { id: 'upload-anexo' });
    } catch (error) {
      toast.error('Erro ao enviar os arquivos.', { id: 'upload-anexo' });
    } finally {
      setLoading(false);
    }
  }

  const handleUploadClick = (e) => processarArquivos(Array.from(e.target.files));
  
  const handleDragOver = (e) => { e.preventDefault(); setIsDraggingAtivo(true); }
  const handleDragLeave = (e) => { e.preventDefault(); setIsDraggingAtivo(false); }
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingAtivo(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processarArquivos(Array.from(e.dataTransfer.files));
    }
  }

  const removerAnexo = (urlRemover) => setFormData(prev => ({ ...prev, anexos: prev.anexos.filter(url => url !== urlRemover) }));

  const handleSalvar = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const statusSelecionado = auxiliares.status.find(s => s.id === formData.status_id)
    const isConcluido = statusSelecionado?.nome === 'Concluído'

    const payload = { 
      ...formData, modulo: moduloAtivo,
      equipamento_id: formData.equipamento_id || null, status_id: formData.status_id || null,
      prestador_id: formData.prestador_id === "" ? null : formData.prestador_id,
      aberto_por_id: formData.aberto_por_id || usuarioAtual?.id || null,
      data_prevista: formData.data_prevista === "" ? null : formData.data_prevista,
      data_abertura: converteParaBancoUTC(formData.data_abertura)
    }

    delete payload.data_conclusao_manual; 
    
    if (isConcluido) {
      if (formData.data_conclusao_manual) {
        payload.data_conclusao = `${formData.data_conclusao_manual}T12:00:00.000Z`;
      } else if (view === 'novo') {
        payload.data_conclusao = new Date().toISOString();
      } else if (view === 'editar' && !chamadoInicial.data_conclusao) {
        payload.data_conclusao = new Date().toISOString();
      }
    } else {
      payload.data_conclusao = null; 
    }

    if (view === 'novo') delete payload.id

    const query = view === 'novo' ? supabase.from('chamados').insert([payload]) : supabase.from('chamados').update(payload).eq('id', formData.id)
    const { error } = await query
    
    if (error) {
      toast.error('Erro ao salvar chamado: ' + error.message)
      setLoading(false)
    } else {
      if (['Preventiva', 'Calibração', 'Qualificação'].includes(payload.tipo_intervencao) && payload.equipamento_id) {
        try {
          const { data: eqAtual } = await supabase.from('equipamentos')
            .select('data_ultima_calibracao, data_proxima_calibracao')
            .eq('id', payload.equipamento_id).single();
          
          if (eqAtual) {
            let updateEquipamento = {};
            const dataOsConclusao = payload.data_conclusao ? payload.data_conclusao.split('T')[0] : null;
            
            if (isConcluido && dataOsConclusao) {
              if (!eqAtual.data_ultima_calibracao || dataOsConclusao >= eqAtual.data_ultima_calibracao) {
                updateEquipamento.data_ultima_calibracao = dataOsConclusao;
              }
              if (payload.data_prevista && payload.data_prevista === eqAtual.data_proxima_calibracao) {
                updateEquipamento.data_proxima_calibracao = null;
              }
            }

            if (!isConcluido && payload.data_prevista) {
                updateEquipamento.data_proxima_calibracao = payload.data_prevista;
            }

            if (Object.keys(updateEquipamento).length > 0) {
              await supabase.from('equipamentos').update(updateEquipamento).eq('id', payload.equipamento_id);
            }
          }
        } catch (err) {
          console.error("Erro secundário ao atualizar equipamento:", err);
        }
      }
      
      const equipamentoNome = auxiliares.equipamentos.find(e => e.id === payload.equipamento_id)?.nome || 'Equipamento Desconhecido';
      
      await supabase.from('logs_auditoria').insert([{
        usuario_nome: usuarioAtual?.nome || 'Usuário Desconhecido',
        acao: view === 'novo' ? 'CRIAÇÃO' : 'EDIÇÃO',
        modulo: moduloAtivo,
        detalhes: view === 'novo'
          ? `Lançou uma nova OS de ${payload.tipo_intervencao} para o equipamento: ${equipamentoNome}`
          : `Editou a OS de ${payload.tipo_intervencao} vinculada ao equipamento: ${equipamentoNome}`
      }]);

      toast.success(view === 'novo' ? 'Ordem de Serviço aberta com sucesso!' : 'Ordem de Serviço atualizada!')
      onSalvo() 
    }
  }

  const mostrarDataConclusao = auxiliares.status.find(s => s.id === formData.status_id)?.nome === 'Concluído'

  return (
    <div className="w-full mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500 min-w-0">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm w-full overflow-hidden">
        <div className="flex-1 min-w-0 pr-0 md:pr-4">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 uppercase tracking-tight break-words leading-[1.1] w-full">
            {view === 'novo' ? 'Nova Ordem de Serviço' : 'Editar O.S.'}
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-2 truncate">Registe a intervenção técnica e anexe os laudos.</p>
        </div>
        <button type="button" onClick={voltarParaLista} className="w-full md:w-auto shrink-0 justify-center px-5 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 mt-4 md:mt-0">
          <ArrowLeft size={18} /> Cancelar e Voltar
        </button>
      </div>

      <form onSubmit={handleSalvar} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0">
        
        <div className="lg:col-span-4 xl:col-span-3 space-y-6 w-full min-w-0">
          
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5 min-w-0">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-slate-100 pb-2 truncate">
              <Ticket size={14} className="shrink-0" /> Classificação da OS
            </h4>
            
            <div className="min-w-0">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 truncate"><Monitor size={12} className="shrink-0"/> Equipamento Vinculado *</label>
              <select required value={formData.equipamento_id} onChange={e => setFormData({...formData, equipamento_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer">
                <option value="">Selecione o equipamento...</option>
                {auxiliares.equipamentos.map(eq => <option key={eq.id} value={eq.id}>{eq.nome} (Pat: {eq.patrimonio || 'S/N'})</option>)}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 truncate">Status da OS *</label>
              <select required value={formData.status_id} onChange={e => setFormData({...formData, status_id: e.target.value})} className={`w-full px-4 py-3 rounded-xl font-black outline-none focus:ring-2 transition-all cursor-pointer border ${mostrarDataConclusao ? 'bg-emerald-50 border-emerald-200 text-emerald-800 focus:ring-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-indigo-500'}`}>
                <option value="">Selecione...</option>
                {auxiliares.status.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 truncate">Tipo de Intervenção</label>
              <select value={formData.tipo_intervencao} onChange={e => setFormData({...formData, tipo_intervencao: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer">
                <option value="Corretiva">Corretiva (Falha/Avaria)</option>
                <option value="Preventiva">Preventiva (Revisão)</option>
                <option value="Calibração">Calibração (Aferição)</option>
                <option value="Qualificação">Qualificação (Validação)</option>
              </select>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5 min-w-0">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-slate-100 pb-2 truncate">
              <Clock size={14} className="shrink-0" /> Cronograma
            </h4>

            <div className="min-w-0">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 truncate">Abertura da OS *</label>
              <input type="datetime-local" required value={formData.data_abertura} onChange={e => setFormData({...formData, data_abertura: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
            </div>

            {!mostrarDataConclusao ? (
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 min-w-0">
                <label className="block text-[11px] font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-1.5 truncate"><Calendar size={12} className="shrink-0"/> Data Prevista (Agendamento)</label>
                <input type="date" value={formData.data_prevista} onChange={e => setFormData({...formData, data_prevista: e.target.value})} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                <p className="text-[9px] font-bold text-blue-600/70 mt-2 uppercase tracking-widest truncate">Deixe em branco se for imediato.</p>
              </div>
            ) : (
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 min-w-0">
                <label className="block text-[11px] font-black text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-1.5 truncate"><CheckCircle2 size={12} className="shrink-0"/> Conclusão Manual (Opcional)</label>
                <input type="date" value={formData.data_conclusao_manual} onChange={e => setFormData({...formData, data_conclusao_manual: e.target.value})} className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                <p className="text-[9px] font-bold text-emerald-600/70 mt-2 uppercase tracking-widest truncate">Se vazio, assume o dia e hora atual.</p>
              </div>
            )}
          </div>

        </div>

        <div className="lg:col-span-8 xl:col-span-9 space-y-6 w-full min-w-0">
          
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6 min-w-0">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2 truncate">
              <Building size={16} className="shrink-0" /> Responsabilidade de Execução
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0">
              <div className="min-w-0">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 truncate">Fornecedor / Prestador de Serviço</label>
                <select value={formData.prestador_id} onChange={e => setFormData({...formData, prestador_id: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer">
                  <option value="">Manutenção Interna (Equipe IOFV)</option>
                  {auxiliares.prestadores.map(pr => <option key={pr.id} value={pr.id}>{pr.nome}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 truncate"><Hash size={12} className="shrink-0"/> Protocolo Externo da OS</label>
                <input value={formData.protocolo_externo} onChange={e => setFormData({...formData, protocolo_externo: e.target.value})} placeholder="Nº da OS gerada pelo prestador..." className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm min-w-0">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2 mb-4 truncate">
              <AlignLeft size={16} className="shrink-0" /> Relato Técnico / Descrição da Manutenção *
            </label>
            <textarea required rows="6" value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className="w-full px-5 py-4 bg-amber-50/30 border border-amber-100/50 rounded-2xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner break-words" placeholder="Descreva os problemas identificados, peças trocadas e procedimentos realizados..."></textarea>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm min-w-0 w-full overflow-hidden">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2 mb-4 truncate">
              <Paperclip size={16} className="shrink-0" /> Arquivos e Laudos (PDF ou Imagens)
            </h3>
            
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed p-6 md:p-10 rounded-[2rem] transition-all text-center flex flex-col items-center justify-center min-h-[160px] w-full min-w-0 ${isDraggingAtivo ? 'border-indigo-500 bg-indigo-50/50 shadow-inner' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}`}
            >
              <div className="flex flex-col items-center justify-center gap-3 w-full px-2">
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shrink-0 ${isDraggingAtivo ? 'bg-indigo-100 text-indigo-600 animate-bounce' : 'bg-white text-slate-400 shadow-sm'}`}>
                  <UploadCloud size={32} className="md:w-10 md:h-10" />
                </div>
                <p className="text-base md:text-lg font-black text-slate-700 tracking-tight text-center leading-tight break-words">Arraste e solte os seus arquivos aqui</p>
                <p className="text-xs md:text-sm font-semibold text-slate-500 text-center leading-relaxed mt-1 break-words">Documentos PDF, Fotos de peças, Notas Fiscais...</p>
              </div>
              
              <input type="file" id="arquivoUploadOS" multiple accept="image/*,application/pdf" onChange={handleUploadClick} disabled={loading} className="hidden" />
              <label htmlFor="arquivoUploadOS" className="mt-6 inline-block bg-white border border-slate-200 px-6 py-3 rounded-xl text-sm font-bold text-indigo-700 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95 w-full md:w-auto text-center truncate">
                Procurar no Computador
              </label>
            </div>

            {formData.anexos && formData.anexos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-4 mt-6 pt-6 border-t border-slate-100 w-full min-w-0">
                {formData.anexos.map((anexo, index) => (
                  <div key={index} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 flex flex-col items-center justify-center cursor-default hover:border-indigo-300 transition-all min-w-0">
                    {isPDF(anexo) ? (
                      <div className="flex flex-col items-center gap-2 min-w-0">
                        <FileText size={40} className="text-rose-500 shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate w-full px-2 text-center">PDF Anexo</span>
                      </div>
                    ) : (
                      <img src={anexo} alt={`Anexo ${index}`} className="w-full h-full object-cover" />
                    )}
                    <button type="button" onClick={(e) => { e.preventDefault(); removerAnexo(anexo); }} className="absolute inset-0 bg-red-900/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-all z-10 w-full min-w-0">
                      <X size={32} className="mb-2 hover:scale-110 transition-transform shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider truncate w-full px-2 text-center">Remover</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-70 text-lg flex items-center justify-center gap-3">
            {loading ? <Loader2 size={24} className="animate-spin shrink-0" /> : <Save size={24} className="shrink-0" />}
            <span className="truncate">{loading ? 'A Gravar Sistema...' : 'Salvar Ordem de Serviço'}</span>
          </button>
          
        </div>
      </form>
    </div>
  )
}