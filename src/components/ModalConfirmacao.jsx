import { AlertTriangle, X } from 'lucide-react'

export default function ModalConfirmacao({ 
  isOpen, 
  onClose, 
  onConfirm, 
  titulo, 
  mensagem, 
  textoConfirmar = 'Sim, excluir', 
  textoCancelar = 'Cancelar',
  isDestructive = true // Se true, botão fica vermelho. Se false, fica azul.
}) {
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-5 md:p-6 text-center">
          <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4 ${isDestructive ? 'bg-red-100' : 'bg-blue-100'}`}>
            <AlertTriangle className={`h-7 w-7 ${isDestructive ? 'text-red-600' : 'text-blue-600'}`} />
          </div>
          
          <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2">
            {titulo}
          </h3>
          
          <p className="text-sm text-slate-500">
            {mensagem}
          </p>
        </div>

        <div className="bg-slate-50 px-5 py-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-colors"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full sm:w-auto px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-colors shadow-sm ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {textoConfirmar}
          </button>
        </div>

      </div>
    </div>
  )
}