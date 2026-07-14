import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import { ArrowLeft, Factory, Activity, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import FormImagens from './components/FormImagens'

export default function EquipamentoForm({ formDataInicial, auxiliaresGlobais, onVoltar, onSucesso }) {
  const inicial = formDataInicial || {};
  const { moduloAtivo } = useModulo()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({ 
    ...inicial, 
    tipo_impressora: inicial.tipo_impressora || '',
    registro_anvisa: inicial.registro_anvisa || '',
    periodicidade: inicial.periodicidade || '' // NOVO CAMPO
  })
  
  const [arquivoImagem, setArquivoImagem] = useState(null)
  const [previewImagem, setPreviewImagem] = useState(inicial.imagem_url || null)

  const handleSalvar = async (e) => {
    e.preventDefault()
    if (!formData) return;
    setLoading(true)
    try {
      // 1. Upload da Foto de Capa
      let urlImagemFinal = formData.imagem_url
      if (arquivoImagem) {
        toast.loading('Fazendo upload da imagem principal...', { id: 'salvar-eq' });
        const extensao = arquivoImagem.name.split('.').pop()
        const nomeArquivo = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`
        const { error: uploadError } = await supabase.storage.from('equipamentos').upload(nomeArquivo, arquivoImagem)
        if (uploadError) throw uploadError
        urlImagemFinal = supabase.storage.from('equipamentos').getPublicUrl(nomeArquivo).data.publicUrl
      }

      // 2. Preparar dados
      const payload = { 
        ...formData, modulo: moduloAtivo, imagem_url: urlImagemFinal,
        registro_anvisa: formData.registro_anvisa || null,
        periodicidade: formData.periodicidade || null, // INCLUÍDO NO PAYLOAD
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
      
      // LIMPEZA DE SEGURANÇA
      delete payload.desconhece_fabricacao;
      delete payload.fabricante; 
      delete payload.prestador;  
      delete payload.unidade;    
      delete payload.setor;      
      delete payload.status;     
      
      const isNovo = !payload.id;
      if (isNovo) delete payload.id;
      
      // 3. Salvar no Banco
      let equipamentoId = formData.id;
      if (isNovo) {
        const { data: novoEq, error: dbError } = await supabase.from('equipamentos').insert([payload]).select().single()
        if (dbError) throw dbError
        equipamentoId = novoEq.id
      } else {
        const { error: dbError } = await supabase.from('equipamentos').update(payload).eq('id', formData.id)
        if (dbError) throw dbError
      }

      // 4. Lógica de OS Automáticas
      if (!['ti', 'impressoras'].includes(moduloAtivo)) {
        const { data: authData } = await supabase.auth.getUser()
        let perfilId = null;
        if (authData?.user?.id) {
           const { data: perfilData } = await supabase.from('perfis').select('id').eq('user_id', authData.user.id).maybeSingle()
           if (perfilData) perfilId = perfilData.id;
        }

        if (payload.data_ultima_calibracao) {
          const { data: osMesmaData } = await supabase.from('chamados').select('id').eq('equipamento_id', equipamentoId).eq('data_conclusao', payload.data_ultima_calibracao).in('tipo_intervencao', ['Preventiva', 'Calibração', 'Qualificação']).maybeSingle();

          if (!osMesmaData) {
            const { data: stConcluido } = await supabase.from('status_chamado').select('id').ilike('nome', '%Concluído%').limit(1).maybeSingle();
            const dataBr = payload.data_ultima_calibracao.split('-').reverse().join('/');
            
            await supabase.from('chamados').insert([{ 
              equipamento_id: equipamentoId, modulo: moduloAtivo, tipo_intervencao: 'Preventiva', 
              data_abertura: payload.data_ultima_calibracao, data_prevista: payload.data_ultima_calibracao, 
              data_conclusao: payload.data_ultima_calibracao, 
              descricao: `Registro de Manutenção Preventiva/Calibração realizada em ${dataBr}. (Lançamento automático)`, 
              status_id: stConcluido?.id, aberto_por_id: perfilId, prestador_id: payload.prestador_id 
            }]);
          }
        }

        if (payload.data_proxima_calibracao) {
          const { data: stConcluido } = await supabase.from('status_chamado').select('id').ilike('nome', '%Concluído%').limit(1).maybeSingle();
          
          let queryFutura = supabase.from('chamados').select('id').eq('equipamento_id', equipamentoId).in('tipo_intervencao', ['Preventiva', 'Calibração', 'Qualificação']);
          if (stConcluido?.id) queryFutura = queryFutura.neq('status_id', stConcluido.id);
          const { data: osFutura } = await queryFutura.maybeSingle();

          if (osFutura) {
            await supabase.from('chamados').update({ data_prevista: payload.data_proxima_calibracao, prestador_id: payload.prestador_id }).eq('id', osFutura.id);
          } else {
            const { data: stAberto } = await supabase.from('status_chamado').select('id').ilike('nome', '%Aberto%').limit(1).maybeSingle();
            
            await supabase.from('chamados').insert([{ 
              equipamento_id: equipamentoId, modulo: moduloAtivo, tipo_intervencao: 'Preventiva', 
              data_abertura: new Date().toISOString(), data_prevista: payload.data_proxima_calibracao, 
              descricao: `Manutenção Preventiva / Calibração programada.`, 
              status_id: stAberto?.id, aberto_por_id: perfilId, prestador_id: payload.prestador_id 
            }]);
          }
        }
      }
      
      toast.success(isNovo ? 'Equipamento cadastrado!' : 'Equipamento atualizado!', { id: 'salvar-eq' });
      onSucesso()
    } catch (error) { toast.error('Erro ao salvar: ' + error.message, { id: 'salvar-eq' }); } 
    finally { setLoading(false) }
  }

  const isModuloTecnologia = ['ti', 'impressoras'].includes(moduloAtivo)

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-slate-800">{formData.id ? 'Editar equipamento' : 'Novo equipamento'}</h1></div>
        <button onClick={onVoltar} className="flex items-center gap-2 px-5 py-2.5 text-blue-800 font-bold bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors"><ArrowLeft size={18} /> Voltar</button>
      </div>

      <form onSubmit={handleSalvar} className="space-y-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          
          <FormImagens 
            formData={formData} setFormData={setFormData}
            arquivoImagem={arquivoImagem} setArquivoImagem={setArquivoImagem}
            previewImagem={previewImagem} setPreviewImagem={setPreviewImagem}
            loading={loading} setLoading={setLoading}
          />

          {!isModuloTecnologia && (
            <div className="flex flex-wrap gap-8 p-5 bg-slate-50 border border-slate-200 rounded-xl">
               <label className="flex items-center gap-3 cursor-pointer font-bold text-slate-700 select-none"><input type="checkbox" checked={formData.possui_etiqueta} onChange={e => setFormData({...formData, possui_etiqueta: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />🏷️ Possui Etiqueta</label>
               <label className="flex items-center gap-3 cursor-pointer font-bold text-slate-700 select-none"><input type="checkbox" checked={formData.possui_manual} onChange={e => setFormData({...formData, possui_manual: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />📖 Possui Manual Físico</label>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-bold text-slate-700 mb-2">Nome / Descrição</label><input required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-slate-700">Número de série</label>
                <label className="flex items-center gap-1 text-xs cursor-pointer font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-2 py-1 rounded"><input type="checkbox" checked={formData.sem_numero_serie} onChange={e => setFormData({...formData, sem_numero_serie: e.target.checked, numero_serie: e.target.checked ? 'N/A' : ''})} />Sem Nº Série</label>
              </div>
              <input required disabled={formData.sem_numero_serie} value={formData.numero_serie} onChange={e => setFormData({...formData, numero_serie: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-slate-700">Patrimônio</label>
                <label className="flex items-center gap-1 text-xs cursor-pointer font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded border border-red-100"><input type="checkbox" checked={formData.sem_patrimonio} onChange={e => setFormData({...formData, sem_patrimonio: e.target.checked, patrimonio: e.target.checked ? 'PENDENTE' : ''})} />Falta Patrimônio</label>
              </div>
              <input required={!formData.sem_patrimonio} disabled={formData.sem_patrimonio} value={formData.patrimonio} onChange={e => setFormData({...formData, patrimonio: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-red-50/30 disabled:text-red-600 disabled:font-bold" />
            </div>

            {moduloAtivo === 'medicos' && (
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 shadow-sm">
                <label className="block text-sm font-bold text-emerald-800 mb-1 flex items-center gap-2">
                  <Activity size={16} /> Registro ANVISA
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: 80111110000"
                  value={formData.registro_anvisa} 
                  onChange={e => setFormData({...formData, registro_anvisa: e.target.value})} 
                  className="w-full px-4 py-2 rounded-lg border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white" 
                />
              </div>
            )}
            
            <div><label className="block text-sm font-bold text-slate-700 mb-2">Modelo</label><input value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-2">Fabricante</label><select value={formData.fabricante_id} onChange={e => setFormData({...formData, fabricante_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{(auxiliaresGlobais?.fabricantes || []).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>
            
            {!isModuloTecnologia && (
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Prestador (Assistência)</label><select value={formData.prestador_id} onChange={e => setFormData({...formData, prestador_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{(auxiliaresGlobais.prestadores || []).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
            )}
            
            {moduloAtivo === 'impressoras' && (
              <div>
                <label className="block text-sm font-bold text-purple-900 mb-2">Tipo de Impressora</label>
                <select required value={formData.tipo_impressora || ''} onChange={e => setFormData({...formData, tipo_impressora: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-purple-200 outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50">
                  <option value="">Selecione o tipo...</option>
                  <option value="Monocromática">Monocromática (Apenas P&B)</option>
                  <option value="Colorida">Colorida</option>
                  <option value="Térmica (Etiquetas)">Térmica (Etiquetas)</option>
                  <option value="Térmica (Pulseiras)">Térmica (Pulseiras)</option>
                  <option value="Multifuncional">Multifuncional</option>
                </select>
              </div>
            )}
          </div>

          {!isModuloTecnologia ? (
            <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-xl">
               <div className="flex justify-between items-center mb-3">
                 <label className="text-sm font-bold text-indigo-900 flex items-center gap-2"><Factory size={16}/> Data de Fabricação</label>
                 <label className="flex items-center gap-1 text-xs cursor-pointer font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-1.5 rounded border border-rose-200 transition-colors">
                   <input type="checkbox" checked={formData.desconhece_fabricacao} onChange={e => setFormData({...formData, desconhece_fabricacao: e.target.checked, data_fabricacao: e.target.checked ? '' : formData.data_fabricacao})} className="w-3.5 h-3.5" />
                   Desconhecida
                 </label>
               </div>
               <input type="date" disabled={formData.desconhece_fabricacao} value={formData.data_fabricacao || ''} onChange={e => setFormData({...formData, data_fabricacao: e.target.value})} className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-blue-50 border border-blue-100 rounded-xl">
              <div>
                <label className="block text-sm font-bold text-blue-900 mb-2">Data Venc. Garantia / Contrato</label>
                <input type="date" value={formData.data_garantia || ''} onChange={e => setFormData({...formData, data_garantia: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-blue-900 mb-2">IP / MAC Address</label>
                <input type="text" placeholder="Ex: 192.168.0.15 ou AA:BB:CC:DD" value={formData.ip_mac_address || ''} onChange={e => setFormData({...formData, ip_mac_address: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-6">
            <div><label className="block text-sm font-bold text-slate-700 mb-2">Unidade</label><select required value={formData.unidade_id} onChange={e => setFormData({...formData, unidade_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{(auxiliaresGlobais.unidades || []).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-2">Setor</label><select required value={formData.setor_id} onChange={e => setFormData({...formData, setor_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{(auxiliaresGlobais.setores || []).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-2">Status</label><select required value={formData.status_id || ''} onChange={e => setFormData({...formData, status_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{(auxiliaresGlobais?.status || []).map(st => (<option key={st.id} value={st.id}>{st.nome}</option>))}</select></div>
          </div>

          {!isModuloTecnologia && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-orange-50 border border-orange-100 rounded-xl">
               <div>
                 <label className="block text-sm font-bold text-slate-800 mb-2">Última Prev./Calibração</label>
                 <input type="date" value={formData.data_ultima_calibracao || ''} onChange={e => setFormData({...formData, data_ultima_calibracao: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 bg-white text-slate-700 font-medium" />
               </div>
               
               {/* NOVO CAMPO: PERIODICIDADE */}
               <div>
                 <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5"><Clock size={16} className="text-orange-600" /> Periodicidade</label>
                 <select value={formData.periodicidade || ''} onChange={e => setFormData({...formData, periodicidade: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 bg-white text-slate-700 font-medium">
                   <option value="">Não definida</option>
                   <option value="3 Meses">A cada 3 Meses</option>
                   <option value="6 Meses">A cada 6 Meses</option>
                   <option value="1 Ano">A cada 1 Ano</option>
                   <option value="2 Anos">A cada 2 Anos</option>
                 </select>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">Próxima Prevista<span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider animate-pulse shadow-sm">Gera OS Automática</span></label>
                 <input type="date" value={formData.data_proxima_calibracao || ''} onChange={e => setFormData({...formData, data_proxima_calibracao: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white text-slate-700 font-bold" />
               </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Observações Adicionais</label>
            <textarea rows="4" value={formData.observacoes || ''} onChange={e => setFormData({...formData, observacoes: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" placeholder="Qualquer outra informação relevante..."></textarea>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 text-lg">
          {loading ? 'A processar...' : 'Salvar equipamento'}
        </button>
      </form>
    </div>
  )
}