import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Send, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ChatInput({ chamadoId, usuarioId, onMensagemEnviada }) {
  const [novaMensagem, setNovaMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviarMensagem = async (e) => {
    e.preventDefault()
    if (!novaMensagem.trim()) return

    setEnviando(true)
    const { error } = await supabase.from('solicitacoes_mensagens').insert([{
      solicitacao_id: chamadoId,
      autor_id: usuarioId,
      mensagem: novaMensagem.trim()
    }])

    if (error) {
      toast.error('Erro ao enviar mensagem.')
    } else {
      setNovaMensagem('') 
      if (onMensagemEnviada) onMensagemEnviada() // 🚀 Aciona a atualização imediata no modal pai
    }
    setEnviando(false)
  }

  return (
    <form onSubmit={enviarMensagem} className="flex-1 flex gap-2 w-full">
      <input 
        type="text" 
        placeholder="Escreva uma mensagem para a equipa técnica..." 
        value={novaMensagem}
        onChange={e => setNovaMensagem(e.target.value)}
        className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
      />
      <button 
        type="submit" 
        disabled={enviando || !novaMensagem.trim()}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar
      </button>
    </form>
  )
}