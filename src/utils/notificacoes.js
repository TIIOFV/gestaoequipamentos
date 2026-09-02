import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const enviarNotificacao = async (usuarioId, titulo, mensagem, chamadoId = null) => {
  if (!usuarioId) {
    console.error('Falha de Notificação: usuarioId está vazio.')
    return
  }
  
  console.log("📤 A enviar notificação para o ID:", usuarioId); // 🚀 Rastreio no console do analista

  try {
    const { error } = await supabase.from('notificacoes').insert([{
      usuario_id: usuarioId,
      titulo: titulo,
      mensagem: mensagem,
      chamado_id: chamadoId,
      lida: false 
    }])
    
    if (error) {
      console.error('Erro de Supabase ao notificar:', error)
    } else {
      console.log("✅ Notificação gravada com sucesso na tabela!")
    }
  } catch (err) {
    console.error('Falha crítica ao executar notificação:', err)
  }
}