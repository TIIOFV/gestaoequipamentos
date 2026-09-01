import { useState, useMemo, useRef, useEffect, memo } from 'react'
import { Search, CheckCircle2, Monitor, X } from 'lucide-react'

const EquipamentoSelector = memo(function EquipamentoSelector({ equipamentos = [], value, onChange }) {
  const [termoBusca, setTermoBusca] = useState('')
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const containerRef = useRef(null)

  // Sincroniza o texto inicial quando há um valor selecionado
  const equipamentoSelecionado = useMemo(() => {
    return equipamentos.find(eq => eq.id === value) || null
  }, [equipamentos, value])

  useEffect(() => {
    if (equipamentoSelecionado) {
      setTermoBusca(`${equipamentoSelecionado.nome} (Pat: ${equipamentoSelecionado.patrimonio || 'S/N'})`)
    } else if (!value) {
      setTermoBusca('')
    }
  }, [equipamentoSelecionado, value])

  // Fecha o menu ao clicar fora usando Ref nativo
  useEffect(() => {
    const handleClickFora = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownAberto(false)
        if (equipamentoSelecionado) {
          setTermoBusca(`${equipamentoSelecionado.nome} (Pat: ${equipamentoSelecionado.patrimonio || 'S/N'})`)
        } else {
          setTermoBusca('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [equipamentoSelecionado])

  // Filtro memorizado e limitado a 20 itens para renderização ultra-rápida
  const listaFiltrada = useMemo(() => {
    if (!termoBusca.trim()) return equipamentos.slice(0, 20)
    const termo = termoBusca.toLowerCase()
    
    // Se o texto digitado for idêntico ao já selecionado, exibe a lista geral
    if (equipamentoSelecionado && termoBusca === `${equipamentoSelecionado.nome} (Pat: ${equipamentoSelecionado.patrimonio || 'S/N'})`) {
      return equipamentos.slice(0, 20)
    }

    const resultado = []
    for (let i = 0; i < equipamentos.length; i++) {
      const eq = equipamentos[i]
      const matchNome = eq.nome && eq.nome.toLowerCase().includes(termo)
      const matchPat = eq.patrimonio && eq.patrimonio.toLowerCase().includes(termo)
      
      if (matchNome || matchPat) {
        resultado.push(eq)
        if (resultado.length >= 20) break // Limita a busca para performance instantânea
      }
    }
    return resultado
  }, [equipamentos, termoBusca, equipamentoSelecionado])

  const handleSelect = (eq) => {
    onChange(eq.id)
    setTermoBusca(`${eq.nome} (Pat: ${eq.patrimonio || 'S/N'})`)
    setDropdownAberto(false)
  }

  const handleLimpar = () => {
    onChange('')
    setTermoBusca('')
    setDropdownAberto(true)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
        Equipamento com defeito (Pesquise por nome ou patrimônio) *
      </label>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        
        <input 
          type="text" 
          placeholder="Ex: Monitor, 00512..." 
          value={termoBusca}
          onChange={(e) => {
            setTermoBusca(e.target.value)
            setDropdownAberto(true)
            if (value) onChange('')
          }}
          onFocus={() => setDropdownAberto(true)}
          className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
        />

        {value ? (
          <button 
            type="button" 
            onClick={handleLimpar} 
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      {dropdownAberto && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          {listaFiltrada.length > 0 ? (
            listaFiltrada.map(eq => (
              <button
                key={eq.id}
                type="button"
                onClick={() => handleSelect(eq)}
                className="w-full text-left px-5 py-3 hover:bg-indigo-50/70 transition-colors flex items-center justify-between group"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-slate-800 text-sm truncate block group-hover:text-indigo-700">
                    {eq.nome}
                  </span>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">
                    Patrimônio: {eq.patrimonio || 'S/N'}
                  </span>
                </div>
                {value === eq.id && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
              </button>
            ))
          ) : (
            <div className="p-6 text-center text-slate-400 flex flex-col items-center gap-2">
              <Monitor size={24} className="text-slate-300" />
              <span className="text-xs font-bold">Nenhum equipamento encontrado.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

export default EquipamentoSelector