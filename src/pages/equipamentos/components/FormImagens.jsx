import { Upload, X, Trash2, Image as ImageIcon } from 'lucide-react'
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
    <div className="flex flex-col md:flex-row gap-6 items-start p-5 bg-slate-50 border border-slate-200 rounded-xl">
      <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden shadow-sm relative group">
        {previewImagem ? (
          <img src={previewImagem} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={32} className="text-slate-300" />
        )}
        {previewImagem && (
          <div onClick={handleRemoverImagemPrincipal} className="absolute inset-0 bg-red-500/80 hidden group-hover:flex items-center justify-center text-white cursor-pointer transition-all">
            <Trash2 size={24} />
          </div>
        )}
      </div>
      <div className="flex-1 w-full space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Foto de Capa</label>
          <label className="flex items-center justify-center w-full px-4 py-4 border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-colors cursor-pointer group">
            <div className="flex flex-col items-center gap-1 text-blue-600">
              <Upload size={20} className="group-hover:-translate-y-1 transition-transform" />
              <span className="font-bold text-sm">Escolher foto principal</span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleSelecionarArquivo} disabled={loading} />
          </label>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Galeria Adicional</label>
          <input type="file" multiple accept="image/*" onChange={handleUploadFotosAdicionais} disabled={loading} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
          {formData.fotos_adicionais && formData.fotos_adicionais.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">
              {formData.fotos_adicionais.map((foto, index) => (
                <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                  <img src={foto} alt={`Miniatura ${index}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removerFotoAdicional(foto)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity" title="Remover foto">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}