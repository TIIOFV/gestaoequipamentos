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

    // 1. EXTRAIR O TOKEN DO UTILIZADOR QUE FEZ A REQUISIÇÃO
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Autenticação ausente.')
    const token = authHeader.replace('Bearer ', '')

    // 2. VERIFICAR A IDENTIDADE E SE É ADMINISTRADOR
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) throw new Error('Sessão inválida ou expirada.')

    const { data: perfilData } = await supabaseAdmin.from('perfis').select('perfil').eq('id', user.id).single()
    if (perfilData?.perfil !== 'administrador') {
      throw new Error('Acesso Negado: Apenas administradores podem executar esta ação.')
    }

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
        esta_bloqueado: false, modulos_acesso: dados.modulos,
        setor: dados.setor, ramal: dados.ramal
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
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})