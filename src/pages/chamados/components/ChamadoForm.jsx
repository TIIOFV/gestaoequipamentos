import { useState, useEffect } from 'react'
import { ArrowLeft, Paperclip, FileText, X, UploadCloud } from 'lucide-react'
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
    toast.loading('Enviando anexos...', { id: 'upload-anexo' });

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
      
      // 🚀 ENVIO DO LOG DE AUDITORIA
      const equipamentoNome = auxiliares.equipamentos.find(e => e.id === payload.equipamento_id)?.nome || 'Equipamento Desconhecido';
      
      await supabase.from('logs_auditoria').insert([{
        usuario_nome: usuarioAtual?.nome || 'Usuário Desconhecido',
        acao: view === 'novo' ? 'CRIAÇÃO' : 'EDIÇÃO',
        modulo: moduloAtivo,
        detalhes: view === 'novo'
          ? `Lançou uma nova OS de ${payload.tipo_intervencao} para o equipamento: ${equipamentoNome}`
          : `Editou a OS de ${payload.tipo_intervencao} vinculada ao equipamento: ${equipamentoNome}`
      }]);

      toast.success(view === 'novo' ? 'Chamado aberto com sucesso!' : 'Chamado atualizado!')
      onSalvo() 
    }
  }

  const mostrarDataConclusao = auxiliares.status.find(s => s.id === formData.status_id)?.nome === 'Concluído'

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{view === 'novo' ? 'Nova Ordem de Serviço' : 'Editar OS'}</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Registre a manutenção e anexe laudos técnicos.</p>
        </div>
        <button type="button" onClick={voltarParaLista} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 md:px-5 py-2.5 text-sm text-blue-800 font-bold bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors"><ArrowLeft size={18} /> Voltar</button>
      </div>

      <form onSubmit={handleSalvar} className="space-y-4 md:space-y-6">
        <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div><label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Equipamento</label><select required value={formData.equipamento_id} onChange={e => setFormData({...formData, equipamento_id: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione o equipamento...</option>{auxiliares.equipamentos.map(eq => <option key={eq.id} value={eq.id}>{eq.nome} (Pat: {eq.patrimonio})</option>)}</select></div>
            <div><label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Status atual</label><select required value={formData.status_id} onChange={e => setFormData({...formData, status_id: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{auxiliares.status.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}</select></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-4 md:p-5 bg-blue-50/50 border border-blue-100 rounded-xl">
            <div><label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Tipo de Intervenção</label><select value={formData.tipo_intervencao} onChange={e => setFormData({...formData, tipo_intervencao: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="Corretiva">Corretiva</option><option value="Preventiva">Preventiva</option><option value="Calibração">Calibração</option><option value="Qualificação">Qualificação</option></select></div>
            
            <div className="md:col-span-2 border-b border-slate-200 pb-4 mb-2">
               <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Data e Hora da Abertura</label>
               <input type="datetime-local" required value={formData.data_abertura} onChange={e => setFormData({...formData, data_abertura: e.target.value})} className="w-full md:w-1/2 px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>

            {!mostrarDataConclusao ? (
              <div><label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Data Prevista (Agendamento)</label><input type="date" value={formData.data_prevista} onChange={e => setFormData({...formData, data_prevista: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white" /><p className="text-[10px] md:text-xs text-slate-500 mt-1 md:mt-1.5">Deixe em branco se for registro imediato.</p></div>
            ) : (
              <div><label className="block text-xs md:text-sm font-bold text-emerald-700 mb-1.5 md:mb-2">Data Real da Conclusão (Opcional)</label><input type="date" value={formData.data_conclusao_manual} onChange={e => setFormData({...formData, data_conclusao_manual: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50 text-emerald-900 font-medium" /><p className="text-[10px] md:text-xs text-emerald-600/70 mt-1 md:mt-1.5">Preencha caso o serviço tenha sido feito em dia anterior.</p></div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div><label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Fornecedor / prestador</label><select value={formData.prestador_id} onChange={e => setFormData({...formData, prestador_id: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Interno (Equipe IOFV)</option>{auxiliares.prestadores.map(pr => <option key={pr.id} value={pr.id}>{pr.nome}</option>)}</select></div>
            <div><label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Protocolo externo (OS)</label><input value={formData.protocolo_externo} onChange={e => setFormData({...formData, protocolo_externo: e.target.value})} placeholder="Nº da OS do prestador" className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
          </div>

          <div><label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Descrição da Manutenção</label><textarea required rows="4" value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" placeholder="Descreva os procedimentos realizados..."></textarea></div>

          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed p-6 rounded-2xl transition-all text-center ${isDraggingAtivo ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
          >
            <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
              <UploadCloud size={32} className={`${isDraggingAtivo ? 'text-blue-500 animate-bounce' : 'text-slate-400'}`} />
              <p className="text-sm font-bold text-slate-700">Arraste e solte os Laudos ou Fotos aqui</p>
              <p className="text-xs text-slate-500">Ou clique no botão abaixo para escolher</p>
            </div>
            
            <input type="file" id="arquivoUpload" multiple accept="image/*,application/pdf" onChange={handleUploadClick} disabled={loading} className="hidden" />
            <label htmlFor="arquivoUpload" className="mt-4 inline-block bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold text-blue-700 cursor-pointer hover:bg-blue-50 transition-colors shadow-sm">
              Explorar Arquivos
            </label>

            {formData.anexos && formData.anexos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-6 border-t border-slate-200 pt-4 text-left">
                {formData.anexos.map((anexo, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white h-24 flex flex-col items-center justify-center cursor-default">
                    {isPDF(anexo) ? (<><FileText size={24} className="text-red-500 mb-1" /><span className="text-[9px] font-bold text-slate-500">PDF</span></>) : (<img src={anexo} alt={`Anexo ${index}`} className="w-full h-full object-cover" />)}
                    <button type="button" onClick={(e) => { e.preventDefault(); removerAnexo(anexo); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity z-10"><X size={10} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3.5 md:py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 text-base md:text-lg">
          {loading ? 'Salvando...' : 'Salvar Ordem de Serviço'}
        </button>
      </form>
    </div>
  )
}