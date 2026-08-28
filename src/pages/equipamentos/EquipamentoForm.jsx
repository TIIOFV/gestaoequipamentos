import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Factory, Activity, Clock, MapPin, Tag, Calendar, AlignLeft, Save, ShieldCheck, Network, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import imageCompression from 'browser-image-compression'
import FormImagens from './components/FormImagens'

export default function EquipamentoForm({ formDataInicial, auxiliaresGlobais, onVoltar, onSucesso }) {
  const inicial = formDataInicial || {};
  const { moduloAtivo } = useModulo()
  const { profile } = useAuth() 
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({ 
    ...inicial, 
    tipo_impressora: inicial.tipo_impressora || '',
    registro_anvisa: inicial.registro_anvisa || '',
    periodicidade: inicial.periodicidade || ''
  })
  
  const [arquivoImagem, setArquivoImagem] = useState(null)
  const [previewImagem, setPreviewImagem] = useState(inicial.imagem_url || null)

  const handleSalvar = async (e) => {
    e.preventDefault()
    if (!formData) return;
    setLoading(true)
    
    try {
      let urlImagemFinal = formData.imagem_url
      
      if (arquivoImagem) {
        toast.loading('A comprimir e enviar fotografia...', { id: 'salvar-eq' });
        
        // 🚀 COMPRESSÃO DE IMAGEM NO NAVEGADOR
        const options = {
          maxSizeMB: 0.2, // Máximo 200KB
          maxWidthOrHeight: 1920,
          useWebWorker: true
        }
        
        const compressedFile = await imageCompression(arquivoImagem, options)
        const extensao = compressedFile.name.split('.').pop()
        const nomeArquivo = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`
        
        const { error: uploadError } = await supabase.storage.from('equipamentos').upload(nomeArquivo, compressedFile)
        if (uploadError) throw uploadError
        
        urlImagemFinal = supabase.storage.from('equipamentos').getPublicUrl(nomeArquivo).data.publicUrl
      }

      const payload = { 
        ...formData, modulo: moduloAtivo, imagem_url: urlImagemFinal,
        registro_anvisa: formData.registro_anvisa || null,
        periodicidade: formData.periodicidade || null,
        fabricante_id: formData.fabricante_id === "" ? null : formData.fabricante_id,
        prestador_id: formData.prestador_id === "" ? null : formData.prestador_id,
        unidade_id: formData.unidade_id === "" ? null : formData.unidade_id,
        setor_id: formData.setor_id === "" ? null : formData.setor_id,
        status_id: formData.status_id === "" ? null : formData.status_id,
        data_ultima_calibracao: formData.data_ultima_calibracao === "" ? null : formData.data_ultima_calibracao,
        data_proxima_calibracao: formData.data_proxima_calibracao === "" ? null : formData.data_proxima_calibracao,
        data_fabricacao: formData.desconhece_fabricacao ? null : (formData.data_fabricacao === "" ? null : formData.data_fabricacao),
        data_garantia: formData.data_garantia === "" ? null : formData.data_garantia,
        ip_mac_address: formData.ip_mac_address || null,
        tipo_impressora: formData.tipo_impressora || null
      }
      
      delete payload.desconhece_fabricacao; delete payload.fabricante; 
      delete payload.prestador; delete payload.unidade;    
      delete payload.setor; delete payload.status;     
      
      const isNovo = !payload.id;
      if (isNovo) delete payload.id;
      
      if (!isNovo) {
        delete payload.data_ultima_calibracao;
        delete payload.data_proxima_calibracao;
      }
      
      let equipamentoId = formData.id;
      if (isNovo) {
        const { data: novoEq, error: dbError } = await supabase.from('equipamentos').insert([payload]).select().single()
        if (dbError) throw dbError
        equipamentoId = novoEq.id
      } else {
        const { error: dbError } = await supabase.from('equipamentos').update(payload).eq('id', formData.id)
        if (dbError) throw dbError
      }

      if (isNovo && !['ti', 'impressoras'].includes(moduloAtivo)) {
        const { data: authData } = await supabase.auth.getUser()
        let perfilId = null;
        if (authData?.user?.id) {
           const { data: perfilData } = await supabase.from('perfis').select('id').eq('user_id', authData.user.id).maybeSingle()
           if (perfilData) perfilId = perfilData.id;
        }

        if (payload.data_ultima_calibracao) {
            const { data: stConcluido } = await supabase.from('status_chamado').select('id').ilike('nome', '%Concluído%').limit(1).maybeSingle();
            const dataBr = payload.data_ultima_calibracao.split('-').reverse().join('/');
            const dataSegura = `${payload.data_ultima_calibracao}T12:00:00.000Z`;

            await supabase.from('chamados').insert([{ 
              equipamento_id: equipamentoId, modulo: moduloAtivo, tipo_intervencao: 'Preventiva', 
              data_abertura: dataSegura, data_prevista: payload.data_ultima_calibracao, 
              data_conclusao: dataSegura, 
              descricao: `Registro Inicial: Manutenção Preventiva/Calibração realizada em ${dataBr}.`, 
              status_id: stConcluido?.id, aberto_por_id: perfilId, prestador_id: payload.prestador_id 
            }]);
        }

        if (payload.data_proxima_calibracao) {
            const { data: stAberto } = await supabase.from('status_chamado').select('id').ilike('nome', '%Aberto%').limit(1).maybeSingle();
            await supabase.from('chamados').insert([{ 
              equipamento_id: equipamentoId, modulo: moduloAtivo, tipo_intervencao: 'Preventiva', 
              data_abertura: new Date().toISOString(), data_prevista: payload.data_proxima_calibracao, 
              descricao: `Agendamento Automático: Manutenção Preventiva / Calibração.`, 
              status_id: stAberto?.id, aberto_por_id: perfilId, prestador_id: payload.prestador_id 
            }]);
        }
      }

      await supabase.from('logs_auditoria').insert([{
        usuario_nome: profile?.nome || 'Usuário Desconhecido',
        acao: isNovo ? 'CRIAÇÃO' : 'EDIÇÃO',
        modulo: moduloAtivo,
        detalhes: isNovo
          ? `Cadastrou o equipamento: ${payload.nome} (Patrimônio: ${payload.patrimonio || 'S/N'}).`
          : `Editou os dados do equipamento: ${payload.nome} (Patrimônio: ${payload.patrimonio || 'S/N'}).`
      }]);
      
      toast.success(isNovo ? 'Equipamento salvo!' : 'Equipamento atualizado!', { id: 'salvar-eq' });
      onSucesso()
    } catch (error) { 
      toast.error('Erro ao salvar: ' + error.message, { id: 'salvar-eq' }); 
    } finally { 
      setLoading(false) 
    }
  }

  const isModuloTecnologia = ['ti', 'impressoras'].includes(moduloAtivo)

  return (
    <div className="w-full mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500 min-w-0">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm w-full overflow-hidden">
        <div className="flex-1 min-w-0 pr-0 md:pr-4">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 uppercase tracking-tight break-words leading-[1.1]">
            {formData.id ? 'Editar Equipamento' : 'Novo Equipamento'}
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 truncate">Preencha os dados abaixo para atualizar o inventário.</p>
        </div>
        <button onClick={onVoltar} className="w-full md:w-auto shrink-0 justify-center px-5 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 mt-4 md:mt-0">
          <ArrowLeft size={18} /> Cancelar e Voltar
        </button>
      </div>

      <form onSubmit={handleSalvar} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0">
        
        <div className="lg:col-span-4 xl:col-span-3 space-y-6 w-full min-w-0">
          <FormImagens 
            formData={formData} setFormData={setFormData}
            arquivoImagem={arquivoImagem} setArquivoImagem={setArquivoImagem}
            previewImagem={previewImagem} setPreviewImagem={setPreviewImagem}
            loading={loading} setLoading={setLoading}
          />

          {!isModuloTecnologia && (
            <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-2">Checklist Rápido</h4>
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors min-w-0 ${formData.possui_etiqueta ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                <input type="checkbox" checked={formData.possui_etiqueta} onChange={e => setFormData({...formData, possui_etiqueta: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 shrink-0" />
                <span className={`font-bold text-sm truncate ${formData.possui_etiqueta ? 'text-indigo-800' : 'text-slate-600'}`}>🏷️ Possui Etiqueta</span>
              </label>
              
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors min-w-0 ${formData.possui_manual ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                <input type="checkbox" checked={formData.possui_manual} onChange={e => setFormData({...formData, possui_manual: e.target.checked})} className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 shrink-0" />
                <span className={`font-bold text-sm truncate ${formData.possui_manual ? 'text-emerald-800' : 'text-slate-600'}`}>📖 Manual Físico no Local</span>
              </label>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 xl:col-span-9 space-y-6 w-full min-w-0">
          
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6 min-w-0">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2 truncate">
              <MapPin size={16} className="shrink-0" /> Dados Fundamentais e Localização
            </h3>

            <div className="min-w-0">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 truncate">Nome / Descrição do Equipamento *</label>
              <input required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-lg" placeholder="Ex: Computador Dell Optiplex 3080..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full min-w-0">
              <div className="min-w-0">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 truncate">Unidade Alocada *</label>
                <select required value={formData.unidade_id} onChange={e => setFormData({...formData, unidade_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all">
                  <option value="">Selecione a unidade...</option>
                  {(auxiliaresGlobais?.unidades || []).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 truncate">Setor *</label>
                <select required value={formData.setor_id} onChange={e => setFormData({...formData, setor_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all">
                  <option value="">Selecione o setor...</option>
                  {(auxiliaresGlobais?.setores || []).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 truncate">Status do Equipamento *</label>
                <select required value={formData.status_id || ''} onChange={e => setFormData({...formData, status_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all">
                  <option value="">Selecione...</option>
                  {(auxiliaresGlobais?.status || []).map(st => (<option key={st.id} value={st.id}>{st.nome}</option>))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6 min-w-0">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2 truncate">
              <Tag size={16} className="shrink-0" /> Identificação e Especificações Técnicas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0">
              <div className="min-w-0">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 truncate">Fabricante da Marca</label>
                <select value={formData.fabricante_id} onChange={e => setFormData({...formData, fabricante_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all">
                  <option value="">Desconhecido / Não se aplica</option>
                  {(auxiliaresGlobais?.fabricantes || []).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              
              <div className="min-w-0">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 truncate">Modelo Exato</label>
                <input value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" placeholder="Ex: Laser MFP M428fdw" />
              </div>

              {!isModuloTecnologia && (
                <div className="md:col-span-2 min-w-0">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 truncate">Prestador (Assistência Técnica)</label>
                  <select value={formData.prestador_id} onChange={e => setFormData({...formData, prestador_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all">
                    <option value="">Manutenção Interna / Não aplicável</option>
                    {(auxiliaresGlobais?.prestadores || []).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              )}

              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2 min-w-0">
                <div className="flex justify-between items-center mb-1 gap-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest truncate">Número de Série *</label>
                  <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-500 hover:text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer shadow-sm transition-colors shrink-0">
                    <input type="checkbox" checked={formData.sem_numero_serie} onChange={e => setFormData({...formData, sem_numero_serie: e.target.checked, numero_serie: e.target.checked ? 'N/A' : ''})} />
                    Sem N/S
                  </label>
                </div>
                <input required disabled={formData.sem_numero_serie} value={formData.numero_serie} onChange={e => setFormData({...formData, numero_serie: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70" placeholder="Digite a série" />
              </div>

              <div className="bg-rose-50/30 p-4 rounded-2xl border border-rose-100 flex flex-col gap-2 min-w-0">
                <div className="flex justify-between items-center mb-1 gap-2">
                  <label className="text-[11px] font-black text-rose-700 uppercase tracking-widest truncate">Patrimônio *</label>
                  <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-rose-600 hover:text-rose-800 bg-white px-2.5 py-1 rounded-lg border border-rose-200 cursor-pointer shadow-sm transition-colors shrink-0">
                    <input type="checkbox" checked={formData.sem_patrimonio} onChange={e => setFormData({...formData, sem_patrimonio: e.target.checked, patrimonio: e.target.checked ? 'PENDENTE' : ''})} />
                    Falta Patrimônio
                  </label>
                </div>
                <input required={!formData.sem_patrimonio} disabled={formData.sem_patrimonio} value={formData.patrimonio} onChange={e => setFormData({...formData, patrimonio: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all disabled:bg-rose-100/50 disabled:text-rose-600 disabled:border-rose-200" placeholder="Ex: 001594" />
              </div>

              {moduloAtivo === 'medicos' && (
                <div className="md:col-span-2 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 shadow-inner min-w-0">
                  <label className="text-[11px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5 mb-2 truncate">
                    <Activity size={14} className="shrink-0" /> Registro ANVISA
                  </label>
                  <input type="text" placeholder="Ex: 80111110000" value={formData.registro_anvisa} onChange={e => setFormData({...formData, registro_anvisa: e.target.value})} className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                </div>
              )}

              {moduloAtivo === 'impressoras' && (
                <div className="md:col-span-2 bg-purple-50/50 p-5 rounded-2xl border border-purple-100 shadow-inner min-w-0">
                  <label className="text-[11px] font-black text-purple-900 uppercase tracking-widest mb-2 block truncate">Classificação da Impressora</label>
                  <select required value={formData.tipo_impressora || ''} onChange={e => setFormData({...formData, tipo_impressora: e.target.value})} className="w-full px-4 py-3 bg-white border border-purple-200 rounded-xl font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer">
                    <option value="">Selecione o tipo de tecnologia...</option>
                    <option value="Monocromática">Monocromática (Apenas P&B)</option>
                    <option value="Colorida">Colorida</option>
                    <option value="Térmica (Etiquetas)">Térmica (Etiquetas)</option>
                    <option value="Térmica (Pulseiras)">Térmica (Pulseiras)</option>
                    <option value="Multifuncional">Multifuncional (Cópia/Scanner)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6 min-w-0">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2 truncate">
              <Calendar size={16} className="shrink-0" /> Gestão de Ciclo de Vida e Datas
            </h3>

            {!isModuloTecnologia ? (
              <div className="space-y-6">
                
                <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl min-w-0">
                  <div className="flex justify-between items-center mb-3 gap-2">
                    <label className="text-[11px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1.5 truncate"><Factory size={14} className="shrink-0"/> Ano/Data de Fabricação</label>
                    <label className="flex items-center gap-1.5 text-[10px] cursor-pointer font-bold uppercase tracking-widest text-slate-600 hover:text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 transition-colors shadow-sm shrink-0">
                      <input type="checkbox" checked={formData.desconhece_fabricacao} onChange={e => setFormData({...formData, desconhece_fabricacao: e.target.checked, data_fabricacao: e.target.checked ? '' : formData.data_fabricacao})} /> Desconhecida
                    </label>
                  </div>
                  <input type="date" disabled={formData.desconhece_fabricacao} value={formData.data_fabricacao || ''} onChange={e => setFormData({...formData, data_fabricacao: e.target.value})} className="w-full md:w-1/2 px-4 py-3 bg-white border border-indigo-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-orange-50/50 border border-orange-100 rounded-2xl relative overflow-hidden min-w-0">
                  {!!formData.id && (
                    <div className="absolute top-0 left-0 right-0 bg-orange-200 text-orange-900 text-[9px] font-black text-center py-1.5 uppercase tracking-widest shadow-sm truncate">
                      Gestão de Datas Feita Via Histórico de O.S
                    </div>
                  )}
                  
                  <div className={`min-w-0 ${!!formData.id ? 'mt-4' : ''}`}>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-orange-900 mb-2 truncate">Última Prev. / Calibração</label>
                    <input type="date" disabled={!!formData.id} value={formData.data_ultima_calibracao || ''} onChange={e => setFormData({...formData, data_ultima_calibracao: e.target.value})} className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed" />
                  </div>
                  
                  <div className={`min-w-0 ${!!formData.id ? 'mt-4' : ''}`}>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-orange-900 mb-2 flex items-center gap-1.5 truncate"><Clock size={12} className="text-orange-600 shrink-0" /> Periodicidade</label>
                    <select value={formData.periodicidade || ''} onChange={e => setFormData({...formData, periodicidade: e.target.value})} className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer">
                      <option value="">Não definida (Avulsa)</option>
                      <option value="3 Meses">A cada 3 Meses</option>
                      <option value="6 Meses">A cada 6 Meses</option>
                      <option value="1 Ano">A cada 1 Ano</option>
                      <option value="2 Anos">A cada 2 Anos</option>
                    </select>
                  </div>

                  <div className={`min-w-0 ${!!formData.id ? 'mt-4' : ''}`}>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-orange-900 mb-2 flex items-center justify-between gap-1">
                      <span className="truncate">Próxima Data</span>
                      {!formData.id && <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[8px] uppercase font-black tracking-widest shadow-sm shrink-0">Cria O.S Auto</span>}
                    </label>
                    <input type="date" disabled={!!formData.id} value={formData.data_proxima_calibracao || ''} onChange={e => setFormData({...formData, data_proxima_calibracao: e.target.value})} className="w-full px-4 py-3 bg-white border border-orange-300 rounded-xl font-black text-slate-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-blue-50/50 border border-blue-100 rounded-2xl min-w-0">
                <div className="min-w-0">
                  <label className="text-[11px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-1.5 mb-2 truncate"><ShieldCheck size={14} className="shrink-0"/> Vencimento Garantia / Contrato</label>
                  <input type="date" value={formData.data_garantia || ''} onChange={e => setFormData({...formData, data_garantia: e.target.value})} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="min-w-0">
                  <label className="text-[11px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-1.5 mb-2 truncate"><Network size={14} className="shrink-0"/> Endereço IP / MAC</label>
                  <input type="text" placeholder="Ex: 192.168.0.15 ou AA:BB:CC:DD" value={formData.ip_mac_address || ''} onChange={e => setFormData({...formData, ip_mac_address: e.target.value})} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm min-w-0">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2 mb-4 truncate">
              <AlignLeft size={16} className="shrink-0"/> Observações Adicionais
            </label>
            <textarea rows="4" value={formData.observacoes || ''} onChange={e => setFormData({...formData, observacoes: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none shadow-inner" placeholder="Qualquer outra informação relevante para o histórico do equipamento..."></textarea>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-70 text-lg flex items-center justify-center gap-3">
            {loading ? <Loader2 size={24} className="animate-spin shrink-0" /> : <Save size={24} className="shrink-0" />}
            <span className="truncate">{loading ? 'A processar e arquivar...' : 'Gravar Informações no Sistema'}</span>
          </button>
          
        </div>
      </form>
    </div>
  )
}