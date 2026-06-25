// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { acao, dados } = await req.json()
    let result = null;

    if (acao === 'criar_usuario') {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: dados.email, password: dados.senha, email_confirm: true
      })
      if (error) throw error
      
      const { error: profileError } = await supabaseAdmin.from('perfis').insert([{
        user_id: data.user.id, email: dados.email, nome: dados.nome, 
        perfil: dados.perfil, cargo: dados.perfil === 'administrador' ? 'Administrador' : 'Analista',
        esta_bloqueado: false, modulos_acesso: dados.modulos
      }])
      if (profileError) throw profileError
      result = { sucesso: true, user: data }
    } 
    else if (acao === 'excluir_usuario') {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(dados.user_id)
      if (error) throw error
      result = { sucesso: true }
    }
    else if (acao === 'forcar_senha') {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(dados.user_id, { password: dados.senha })
      if (error) throw error
      await supabaseAdmin.from('perfis').update({ precisa_trocar_senha: true }).eq('user_id', dados.user_id)
      result = { sucesso: true }
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    
  } catch (error) {
    // Tratamento de erro sem usar 'any' (Padrão Sênior)
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})