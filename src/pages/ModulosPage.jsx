import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Stethoscope, Monitor, BatteryCharging, Wrench, ArrowRight, Loader2, AlertTriangle, Printer, ShieldCheck } from 'lucide-react'
import { useModulo } from '../contexts/ModuloContext'
import { VERSAO_SISTEMA } from '../config'

export default function ModulosPage() {
  const navigate = useNavigate()
  const { selecionarModulo } = useModulo()
  const [modulosPermitidos, setModulosPermitidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const todosModulos = [
    {
      id: 'medicos',
      nome: 'Equipamentos Médicos',
      descricao: 'Gestão de maquinário clínico e cirúrgico.',
      icone: Stethoscope,
      corBarra: 'from-emerald-500 to-teal-600',
      corIcone: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      corHover: 'hover:border-emerald-300 hover:shadow-emerald-500/10'
    },
    {
      id: 'ti',
      nome: 'Tecnologia da Informação',
      descricao: 'Inventário de computadores e rede.',
      icone: Monitor,
      corBarra: 'from-blue-500 to-indigo-600',
      corIcone: 'text-blue-600 bg-blue-50 border-blue-100',
      corHover: 'hover:border-blue-300 hover:shadow-blue-500/10'
    },
    {
      id: 'infra',
      nome: 'Nobreaks & Baterias',
      descricao: 'Controle de autonomia e manutenções.',
      icone: BatteryCharging,
      corBarra: 'from-amber-500 to-orange-600',
      corIcone: 'text-amber-600 bg-amber-50 border-amber-100',
      corHover: 'hover:border-amber-300 hover:shadow-amber-500/10'
    },
    {
      id: 'manutencao',
      nome: 'Manutenção Predial',
      descricao: 'Ar condicionado e infraestrutura.',
      icone: Wrench,
      corBarra: 'from-slate-600 to-slate-800',
      corIcone: 'text-slate-700 bg-slate-100 border-slate-200',
      corHover: 'hover:border-slate-400 hover:shadow-slate-500/10'
    },
    { 
      id: 'impressoras', 
      nome: 'Impressoras & Copiadoras', 
      descricao: 'Gestão de impressoras e comodatos.', 
      icone: Printer,
      corBarra: 'from-purple-500 to-indigo-600',
      corIcone: 'text-purple-600 bg-purple-50 border-purple-100',
      corHover: 'hover:border-purple-300 hover:shadow-purple-500/10'
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
      setErro('Não foi possível carregar as suas permissões.')
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
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse text-sm">A carregar o seu ambiente...</p>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-slate-100/70 flex flex-col items-center justify-between p-4 md:p-8 animate-in fade-in duration-500 font-sans relative overflow-hidden">
      
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/50 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/50 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl w-full relative z-10 my-auto py-8">
        <div className="text-center mb-10 md:mb-12">
          <div className="inline-flex items-center justify-center px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-200/80 mb-4">
            <span className="font-black text-xl tracking-tight text-blue-900">IOFV</span>
            <span className="font-semibold text-xl text-slate-400 ml-2">Gestão Hospitalar</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-800 mb-2 tracking-tight">Selecione o Ambiente</h1>
          <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto font-medium">
            Escolha o módulo de operação para gerir os equipamentos e ordens de serviço.
          </p>
        </div>

        {erro ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-200 flex flex-col items-center justify-center text-center max-w-md mx-auto shadow-sm">
            <AlertTriangle size={32} className="mb-3" />
            <p className="font-bold text-sm">{erro}</p>
          </div>
        ) : modulosVisiveis.length === 0 ? (
          <div className="bg-white text-slate-600 p-8 rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-center max-w-lg mx-auto shadow-sm">
            <AlertTriangle size={40} className="mb-4 text-amber-500" />
            <h3 className="text-xl font-bold mb-2 text-slate-800">Sem Permissões</h3>
            <p className="text-sm text-slate-500">O seu usuário não possui acesso a nenhum módulo. Contate o administrador.</p>
          </div>
        ) : (
          /* 🚀 GRELHA CORRIGIDA: 1 Coluna no Mobile, 2 no Tablet, 5 no Desktop */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 justify-center max-w-6xl mx-auto">
            {modulosVisiveis.map((mod) => {
              const Icone = mod.icone
              
              return (
                <button
                  key={mod.id}
                  onClick={() => handleSelecionarModulo(mod.id)}
                  className={`group flex flex-col items-start p-6 bg-white rounded-3xl border border-slate-200/80 ${mod.corHover} shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left relative overflow-hidden`}
                >
                  <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${mod.corBarra}`}></div>
                  
                  <div className={`w-14 h-14 rounded-2xl border ${mod.corIcone} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm shrink-0`}>
                    <Icone size={26} strokeWidth={2.2} />
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors">{mod.nome}</h3>
                  
                  {/* 🚀 DESCRIÇÃO RESTAURADA NO MOBILE */}
                  <p className="text-xs text-slate-500 leading-relaxed mb-6 flex-1 font-medium">
                    {mod.descricao}
                  </p>
                  
                  {/* 🚀 TEXTO CORRIGIDO PARA ACESSAR PAINEL */}
                  <div className="mt-auto flex items-center text-xs font-bold text-slate-400 group-hover:text-blue-700 transition-colors pt-3 border-t border-slate-100 w-full uppercase tracking-widest">
                    Acessar Painel <ArrowRight size={14} className="ml-2 opacity-100 md:opacity-0 md:-translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-auto py-4 text-center relative z-10 opacity-70">
        <div className="flex items-center justify-center gap-2 text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase text-center px-4">
          <ShieldCheck size={14} className="text-blue-600 shrink-0" />
          Desenvolvido por Pedro Oliveira • {VERSAO_SISTEMA}
        </div>
      </div>
    </div>
  )
}