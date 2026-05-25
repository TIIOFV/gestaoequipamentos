import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast' // 1. Importação do toast

export default function ModalAlterarSenha({ isOpen, onClose, obrigatorio = false, userId }) {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null;

  const handleAtualizarSenha = async (e) => {
    e.preventDefault()
    
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem. Digite novamente.')
      return
    }

    if (novaSenha.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }

    setLoading(true)
    const toastId = toast.loading('Atualizando senha...') // Toast de carregamento

    // 1. Atualiza a senha no Auth do Supabase
    const { error: authError } = await supabase.auth.updateUser({
      password: novaSenha
    })

    if (authError) {
      // Traduz o erro nativo do banco e destrava o estado de carregamento
      if (authError.message.includes('different from the old password')) {
        toast.error('A nova senha não pode ser igual à senha anterior. Por favor, digite uma senha diferente.', { id: toastId })
      } else {
        toast.error('Erro ao atualizar a senha: ' + authError.message, { id: toastId })
      }
      setLoading(false)
      return
    }

    // 2. Se a troca era obrigatória, remove o sinalizador na tabela perfis
    if (obrigatorio && userId) {
      const { error: dbError } = await supabase
        .from('perfis')
        .update({ precisa_trocar_senha: false })
        .eq('user_id', userId)
      
      if (dbError) {
        console.warn('Senha alterada, mas falha ao remover a flag de obrigatoriedade no perfil.', dbError)
      }
    }

    toast.success('Senha atualizada com sucesso! Guarde-a em um local seguro.', { id: toastId })
    setNovaSenha('')
    setConfirmarSenha('')
    
    // 3. Executa o fluxo de fechamento ou atualização de sessão
    if (obrigatorio) {
      setTimeout(() => {
        window.location.reload()
      }, 1500) // Pequeno delay para o usuário ler o toast antes da página recarregar
    } else {
      onClose()
    }
    
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 animate-in zoom-in duration-300">
        
        {obrigatorio ? (
          <div className="mb-6">
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded border border-amber-200 uppercase tracking-wider mb-3 inline-block">Ação Obrigatória</span>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Crie sua Senha Pessoal</h2>
            <p className="text-sm text-slate-500 mt-2">Para sua segurança, é necessário alterar a senha provisória antes de acessar o sistema.</p>
          </div>
        ) : (
          <div className="mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Alterar Senha</h2>
            <p className="text-sm text-slate-500 mt-1">Defina uma nova senha para sua conta.</p>
          </div>
        )}
        
        <form onSubmit={handleAtualizarSenha} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Nova Senha</label>
            <input
              type="password"
              className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="pb-2">
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirmar Nova Senha</label>
            <input
              type="password"
              className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 mt-6">
            {!obrigatorio && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className={`${obrigatorio ? 'w-full' : 'flex-1'} px-4 py-3 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 font-bold disabled:opacity-50 transition-colors shadow-sm`}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}