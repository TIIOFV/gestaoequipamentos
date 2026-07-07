import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Paginacao({ paginaAtual, totalItens, itensPorPagina, setPaginaAtual }) {
  const totalPaginas = Math.ceil(totalItens / itensPorPagina)
  
  if (totalPaginas <= 1) return null;

  return (
    <div className="flex items-center justify-between border border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-2xl shadow-sm mt-6">
      <div className="flex flex-1 items-center justify-between">
        
        {/* Informação de contagem */}
        <div>
          <p className="text-sm text-slate-700">
            Mostrando <span className="font-bold">{(paginaAtual - 1) * itensPorPagina + 1}</span> a <span className="font-bold">{Math.min(paginaAtual * itensPorPagina, totalItens)}</span> de <span className="font-bold">{totalItens}</span> resultados
          </p>
        </div>
        
        {/* Botões de navegação */}
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
              disabled={paginaAtual === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-all"
            >
              <span className="sr-only">Anterior</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            
            <span className="relative inline-flex items-center px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-inset ring-slate-300 bg-slate-50 focus:outline-offset-0">
              Página {paginaAtual} de {totalPaginas}
            </span>
            
            <button
              onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
              disabled={paginaAtual === totalPaginas}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-all"
            >
              <span className="sr-only">Próxima</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>

      </div>
    </div>
  )
}