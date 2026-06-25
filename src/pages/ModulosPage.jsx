import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Stethoscope, Monitor, BatteryCharging, Wrench, ArrowRight, Loader2, AlertTriangle, Printer } from 'lucide-react'
import { useModulo } from '../contexts/ModuloContext'

export default function ModulosPage() {
  const navigate = useNavigate()
  const { selecionarModulo } = useModulo()
  const [modulosPermitidos, setModulosPermitidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  // Definição visual de todos os módulos possíveis no sistema
  const todosModulos = [
    {
      id: 'medicos',
      nome: 'Equipamentos Médicos',
      descricao: 'Gestão de maquinário clínico, oftalmológico e cirúrgico.',
      icone: Stethoscope,
      cor: 'bg-emerald-500',
      corBg: 'bg-emerald-50',
      corBorder: 'border-emerald-100',
      corHover: 'hover:border-emerald-400 shadow-emerald-900/5'
    },
    {
      id: 'ti',
      nome: 'Tecnologia da Informação',
      descricao: 'Inventário de computadores, servidores e rede.',
      icone: Monitor,
      cor: 'bg-blue-500',
      corBg: 'bg-blue-50',
      corBorder: 'border-blue-100',
      corHover: 'hover:border-blue-400 shadow-blue-900/5'
    },
    {
      id: 'infra',
      nome: 'Nobreaks & Baterias',
      descricao: 'Controle de autonomia, vida útil e manutenções.',
      icone: BatteryCharging,
      cor: 'bg-amber-500',
      corBg: 'bg-amber-50',
      corBorder: 'border-amber-100',
      corHover: 'hover:border-amber-400 shadow-amber-900/5'
    },
    {
      id: 'manutencao',
      nome: 'Manutenção Predial',
      descricao: 'Ar condicionado, mobiliário e infraestrutura geral.',
      icone: Wrench,
      cor: 'bg-slate-700',
      corBg: 'bg-slate-50',
      corBorder: 'border-slate-200',
      corHover: 'hover:border-slate-400 shadow-slate-900/5'
    },
    { 
      id: 'impressoras', 
      nome: 'Impressoras & Copiadoras', 
      descricao: 'Gestão de impressoras, toners e comodatos.', 
      icone: Printer,
      cor: 'bg-purple-500', 
      corBg: 'bg-purple-50',
      corBorder: 'border-purple-100',
      corHover: 'hover:border-purple-400 shadow-purple-900/5'
    }
  ]

  useEffect(() => {
    buscarPermissoes()
  }, [])

  const buscarPermissoes = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const { data: perfilData, error: perfilError } = await supabase
        .from('perfis')
        .select('modulos_acesso')
        .eq('user_id', userData.user.id)
        .single()

      if (perfilError) throw perfilError

      const acessos = perfilData.modulos_acesso || []

      if (acessos.length === 1) {
        selecionarModulo(acessos[0])
        navigate(`/${acessos[0]}/dashboard`, { replace: true })
        return
      }

      setModulosPermitidos(acessos)
    } catch (error) {
      console.error('Erro ao buscar permissões:', error)
      setErro('Não foi possível carregar suas permissões de acesso.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelecionarModulo = (idModulo) => {
    selecionarModulo(idModulo)
    navigate(`/${idModulo}/dashboard`)
  }

  const modulosVisiveis = todosModulos.filter(mod => modulosPermitidos.includes(mod.id))

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 size={40} className="animate-spin text-blue-500 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Preparando seu ambiente de trabalho...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-500 font-sans relative overflow-hidden">
      
      {/* Efeito visual de fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full blur-[120px] opacity-50 mix-blend-multiply pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-200 rounded-full blur-[120px] opacity-50 mix-blend-multiply pointer-events-none"></div>

      {/* AQUI FOI ALTERADO DE max-w-5xl PARA max-w-7xl PARA CABER 5 COLUNAS */}
      <div className="max-w-7xl w-full relative z-10">
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
            <span className="font-black text-2xl tracking-tight text-blue-900">IOFV</span>
            <span className="font-medium text-2xl text-slate-400 ml-2">Gestão</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-3 tracking-tight">Selecione o Ambiente</h1>
          <p className="text-slate-500 text-base md:text-lg max-w-xl mx-auto">
            Escolha o módulo de operação para carregar os equipamentos e ordens de serviço correspondentes.
          </p>
        </div>

        {erro ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <AlertTriangle size={32} className="mb-3" />
            <p className="font-bold">{erro}</p>
          </div>
        ) : modulosVisiveis.length === 0 ? (
          <div className="bg-slate-100 text-slate-600 p-8 rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-center max-w-lg mx-auto shadow-sm">
            <AlertTriangle size={40} className="mb-4 text-amber-500" />
            <h3 className="text-xl font-bold mb-2 text-slate-800">Nenhum Módulo Liberado</h3>
            <p>Seu usuário não possui permissão para acessar nenhum setor do sistema no momento. Contate o administrador.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 xl:gap-5 justify-center">
            {modulosVisiveis.map((mod) => {
              const Icone = mod.icone
              return (
                <button
                  key={mod.id}
                  onClick={() => handleSelecionarModulo(mod.id)}
                  className={`group flex flex-col items-start p-5 xl:p-6 bg-white rounded-3xl border-2 ${mod.corBorder} ${mod.corHover} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left relative overflow-hidden`}
                >
                  <div className={`absolute top-0 left-0 w-full h-1.5 ${mod.cor}`}></div>
                  
                  <div className={`w-12 h-12 xl:w-14 xl:h-14 rounded-2xl ${mod.corBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icone className={mod.cor.replace('bg-', 'text-')} size={26} strokeWidth={2.5} />
                  </div>
                  
                  <h3 className="text-lg xl:text-xl font-bold text-slate-800 mb-2 leading-tight">{mod.nome}</h3>
                  <p className="text-xs xl:text-sm text-slate-500 leading-relaxed mb-6 flex-1">
                    {mod.descricao}
                  </p>
                  
                  <div className="mt-auto flex items-center text-xs xl:text-sm font-bold text-slate-400 group-hover:text-slate-800 transition-colors">
                    Acessar painel <ArrowRight size={16} className="ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}