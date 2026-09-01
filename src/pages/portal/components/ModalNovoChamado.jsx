import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { X, UploadCloud, FileText, Loader2, Camera, Plus, Type } from 'lucide-react'
import toast from 'react-hot-toast'
import EquipamentoSelector from './EquipamentoSelector'

export default function ModalNovoChamado({ isOpen, onClose, onSuccess, equipamentos = [], usuarioId }) {
  const [titulo, setTitulo] = useState('')
  const [equipamentoId, setEquipamentoId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [anexos, setAnexos] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [isDraggingAtivo, setIsDraggingAtivo] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTitulo('')
      setEquipamentoId('')
      setDescricao('')
      setAnexos([])
      setSalvando(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const isPDF = (url) => url?.toLowerCase().includes('.pdf')

  const processarArquivos = async (filesArray) => {
    if (!filesArray || filesArray.length === 0) return
    setSalvando(true)
    toast.loading('A carregar ficheiro(s)...', { id: 'upload-suporte' })
    try {
      const novasUrls = []
      for (const file of filesArray) {
        const fileExt = file.name.split('.').pop()
        const fileName = `suporte_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('equipamentos').upload(fileName, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('equipamentos').getPublicUrl(fileName)
        novasUrls.push(publicUrl)
      }
      setAnexos(prev => [...prev, ...novasUrls])
      toast.success('Ficheiro(s) anexado(s)!', { id: 'upload-suporte' })
    } catch {
      toast.error('Erro ao anexar ficheiros.', { id: 'upload-suporte' })
    } finally {
      setSalvando(false)
    }
  }

  const removerAnexo = (urlRemover) => {
    setAnexos(prev => prev.filter(url => url !== urlRemover))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!titulo.trim()) { toast.error('Informe um título para o chamado.'); return; }
    if (!equipamentoId) { toast.error('Selecione o equipamento com defeito.'); return; }
    if (!descricao.trim()) { toast.error('Descreva o problema encontrado.'); return; }

    setSalvando(true)
    const { error } = await supabase.from('solicitacoes_suporte').insert([{
      titulo: titulo.trim(),
      equipamento_id: equipamentoId,
      descricao: descricao.trim(),
      anexos,
      solicitante_id: usuarioId
    }])

    if (error) {
      toast.error('Erro ao enviar pedido: ' + error.message)
    } else {
      toast.success('Pedido enviado à equipa técnica!')
      onSuccess()
      onClose()
    }
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        
        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Relatar Problema</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Descreva a avaria para triagem técnica.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 flex-1">
          
          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Resumo Breve (Título) *
            </label>
            <div className="relative">
              <Type size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                required
                placeholder="Ex: Ecrã não liga, Ruído estranho no motor..." 
                value={titulo} 
                onChange={e => setTitulo(e.target.value)} 
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          <EquipamentoSelector equipamentos={equipamentos} value={equipamentoId} onChange={setEquipamentoId} />

          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Descrição Detalhada do Problema *
            </label>
            <textarea 
              required 
              rows="4" 
              value={descricao} 
              onChange={e => setDescricao(e.target.value)} 
              placeholder="Descreva o que aconteceu em detalhe..." 
              className="w-full px-5 py-4 bg-amber-50/30 border border-amber-100/60 rounded-2xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Evidências (Foto do defeito)
            </label>
            
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDraggingAtivo(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDraggingAtivo(false); }}
              onDrop={(e) => { e.preventDefault(); setIsDraggingAtivo(false); if (e.dataTransfer.files) processarArquivos(Array.from(e.dataTransfer.files)); }}
              className={`border-2 border-dashed p-6 rounded-2xl flex flex-col items-center justify-center transition-all ${isDraggingAtivo ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50'}`}
            >
              <p className="text-xs font-bold text-slate-600 mb-4 text-center">Tire uma foto na hora ou escolha da galeria</p>
              
              <input type="file" id="uploadCameraModal" accept="image/*" capture="environment" onChange={(e) => processarArquivos(Array.from(e.target.files))} disabled={salvando} className="hidden" />
              <input type="file" id="uploadFicheiroModal" multiple accept="image/*,application/pdf" onChange={(e) => processarArquivos(Array.from(e.target.files))} disabled={salvando} className="hidden" />
              
              <div className="flex flex-wrap items-center justify-center gap-3">
                <label htmlFor="uploadCameraModal" className="flex items-center gap-2 bg-slate-800 text-white px-5 py-3 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-700 transition-all shadow-sm active:scale-95">
                  <Camera size={16} /> Tirar Foto
                </label>
                <label htmlFor="uploadFicheiroModal" className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-3 rounded-xl text-xs font-bold text-indigo-700 cursor-pointer hover:bg-indigo-50 transition-all shadow-sm active:scale-95">
                  <UploadCloud size={16} /> Procurar Arquivo
                </label>
              </div>
            </div>

            {anexos.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4">
                {anexos.map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    {isPDF(url) ? (
                      <div className="w-full h-full flex items-center justify-center"><FileText size={24} className="text-red-500" /></div>
                    ) : (
                      <img src={url} alt="Evidência" className="w-full h-full object-cover" />
                    )}
                    <button type="button" onClick={() => removerAnexo(url)} className="absolute inset-0 bg-red-900/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <X size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={salvando || !equipamentoId || !descricao.trim() || !titulo.trim()} className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2">
              {salvando ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Enviar Pedido
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}