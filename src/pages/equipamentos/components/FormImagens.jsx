import { Upload, X, Trash2, Image as ImageIcon, Camera } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

export default function FormImagens({ 
  formData, setFormData, 
  arquivoImagem, setArquivoImagem, 
  previewImagem, setPreviewImagem, 
  loading, setLoading 
}) {

  const handleSelecionarArquivo = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setArquivoImagem(file)
      setPreviewImagem(URL.createObjectURL(file))
    }
  }

  const handleRemoverImagemPrincipal = () => {
    setArquivoImagem(null)
    setPreviewImagem(null)
    setFormData(prev => ({ ...prev, imagem_url: '' }))
  }

  const handleUploadFotosAdicionais = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setLoading(true);
    toast.loading('Enviando fotos para a galeria...', { id: 'upload-fotos' });
    
    try {
      const novasUrls = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `galeria_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('equipamentos').upload(fileName, file);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('equipamentos').getPublicUrl(fileName);
        novasUrls.push(publicUrl);
      }
      setFormData(prev => ({ ...prev, fotos_adicionais: [...(prev.fotos_adicionais || []), ...novasUrls] }));
      toast.success(`${files.length} foto(s) adicionada(s)!`, { id: 'upload-fotos' });
    } catch (error) {
      toast.error('Erro ao enviar as fotos.', { id: 'upload-fotos' });
    } finally {
      setLoading(false);
    }
  }

  const removerFotoAdicional = (urlRemover) => {
    setFormData(prev => ({ ...prev, fotos_adicionais: prev.fotos_adicionais.filter(url => url !== urlRemover) }));
  }

  return (
    <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-6">
      
      {/* 📷 FOTO DE CAPA */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Camera size={14} /> Foto Principal
        </h4>
        
        <div className="w-full aspect-square bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner relative group">
          {previewImagem ? (
            <img src={previewImagem} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-300">
              <ImageIcon size={48} className="opacity-40" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Sem Capa</span>
            </div>
          )}
          
          {/* Camada de Sobreposição para Remover */}
          {previewImagem && (
            <div onClick={handleRemoverImagemPrincipal} className="absolute inset-0 bg-red-900/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-all duration-300">
              <Trash2 size={32} className="mb-2 hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-wider">Remover Foto</span>
            </div>
          )}
        </div>

        <label className="flex items-center justify-center w-full px-4 py-3.5 border-2 border-dashed border-indigo-200 bg-indigo-50/50 text-indigo-600 rounded-2xl hover:bg-indigo-50 hover:border-indigo-400 transition-colors cursor-pointer group active:scale-95">
          <div className="flex items-center gap-2">
            <Upload size={18} className="group-hover:-translate-y-1 transition-transform" />
            <span className="font-bold text-sm">{previewImagem ? 'Trocar Imagem' : 'Carregar Imagem'}</span>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleSelecionarArquivo} disabled={loading} />
        </label>
      </div>

      {/* 🖼️ GALERIA ADICIONAL */}
      <div className="space-y-4 border-t border-slate-100 pt-6">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <ImageIcon size={14} /> Fotos Adicionais
        </h4>
        
        <label className="flex items-center justify-center w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer active:scale-95">
          <span className="font-bold text-xs flex items-center gap-2"><Upload size={14} /> Adicionar à Galeria</span>
          <input type="file" multiple accept="image/*" onChange={handleUploadFotosAdicionais} disabled={loading} className="hidden" />
        </label>

        {formData.fotos_adicionais && formData.fotos_adicionais.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {formData.fotos_adicionais.map((foto, index) => (
              <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <img src={foto} alt={`Miniatura ${index}`} className="w-full h-full object-cover" />
                <button type="button" onClick={() => removerFotoAdicional(foto)} className="absolute inset-0 bg-red-900/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-all" title="Remover foto">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}