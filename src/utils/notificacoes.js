import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const enviarNotificacao = async (usuarioId, titulo, mensagem, chamadoId = null) => {
  // 1. Verifica se o ID chegou vazio
  if (!usuarioId) {
    toast.error('Erro de Sistema: ID do destinatário não encontrado.')
    console.error('Falha de Notificação: usuarioId está vazio.', { titulo, mensagem, chamadoId })
    return
  }
  
  try {
    // 2. Insere a notificação forçando o campo "lida" a false para não quebrar regras NOT NULL
    const { error } = await supabase.from('notificacoes').insert([{
      usuario_id: usuarioId,
      titulo: titulo,
      mensagem: mensagem,
      chamado_id: chamadoId,
      lida: false 
    }])
    
    // 3. Se o Supabase bloquear (ex: Regra RLS), o erro vai saltar na tela!
    if (error) {
      toast.error(`Bloqueio Supabase (Notificação): ${error.message}`)
      console.error('Erro de Supabase ao notificar:', error)
      return
    }
    
  } catch (err) {
    toast.error('Falha crítica ao executar notificação.')
    console.error(err)
  }
}