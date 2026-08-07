import { useState } from 'react';
import { Plus, Trash2, Save, Sparkles, Wrench, X } from 'lucide-react';

export default function ReleaseForm({ onSalvar, onCancelar }) {
  const [data, setData] = useState({
    versao: 'v1.',
    data_release: new Date().toISOString().split('T')[0],
    publicado: true
  });
  
  const [inputAdicionado, setInputAdicionado] = useState('');
  const [inputCorrigido, setInputCorrigido] = useState('');
  const [listaAdicionados, setListaAdicionados] = useState([]);
  const [listaCorrigidos, setListaCorrigidos] = useState([]);

  const adicionarItem = (tipo) => {
    if (tipo === 'adicionado' && inputAdicionado.trim()) {
      setListaAdicionados([...listaAdicionados, inputAdicionado.trim()]);
      setInputAdicionado('');
    }
    if (tipo === 'corrigido' && inputCorrigido.trim()) {
      setListaCorrigidos([...listaCorrigidos, inputCorrigido.trim()]);
      setInputCorrigido('');
    }
  };

  const handleSalvarClick = () => {
    if (!podeSalvar) return;
    onSalvar({
      versao: data.versao.trim(),
      data_release: data.data_release,
      publicado: data.publicado,
      adicionado: listaAdicionados,
      corrigido: listaCorrigidos
    });
  };

  const podeSalvar = data.versao.trim().length > 0 && (listaAdicionados.length > 0 || listaCorrigidos.length > 0);

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      
      {/* HEADER DO MODAL */}
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-black text-slate-800">Criar Nova Release</h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Informe os utilizadores sobre a nova versão.</p>
        </div>
        <button onClick={onCancelar} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* CORPO DO FORMULÁRIO */}
      <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Versão (Tag)</label>
            <input
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              placeholder="Ex: v1.5.0"
              value={data.versao}
              onChange={e => setData({ ...data, versao: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Data do Lançamento</label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              value={data.data_release}
              onChange={e => setData({ ...data, data_release: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-8">
          {/* SESSÃO DE NOVIDADES */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
              <Sparkles size={16} /> O que há de novo?
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-3 bg-white border border-emerald-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Descreva o novo recurso..."
                value={inputAdicionado}
                onChange={e => setInputAdicionado(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarItem('adicionado'); } }}
              />
              <button onClick={() => adicionarItem('adicionado')} className="bg-emerald-50 text-emerald-700 px-4 rounded-xl hover:bg-emerald-100 border border-emerald-100 transition-colors">
                <Plus size={20} />
              </button>
            </div>
            
            {listaAdicionados.length > 0 && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl space-y-2 mt-2">
                {listaAdicionados.map((item, i) => (
                  <div key={i} className="flex justify-between items-start gap-3 text-sm bg-white border border-emerald-100 text-emerald-900 px-4 py-3 rounded-lg shadow-sm">
                    <span className="font-medium leading-relaxed">{item}</span>
                    <button onClick={() => setListaAdicionados(listaAdicionados.filter((_, idx) => idx !== i))} className="text-emerald-300 hover:text-red-500 shrink-0 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SESSÃO DE CORREÇÕES */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-1.5">
              <Wrench size={16} /> O que foi corrigido?
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Qual bug foi resolvido?"
                value={inputCorrigido}
                onChange={e => setInputCorrigido(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarItem('corrigido'); } }}
              />
              <button onClick={() => adicionarItem('corrigido')} className="bg-blue-50 text-blue-700 px-4 rounded-xl hover:bg-blue-100 border border-blue-100 transition-colors">
                <Plus size={20} />
              </button>
            </div>

            {listaCorrigidos.length > 0 && (
              <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl space-y-2 mt-2">
                {listaCorrigidos.map((item, i) => (
                  <div key={i} className="flex justify-between items-start gap-3 text-sm bg-white border border-blue-100 text-blue-900 px-4 py-3 rounded-lg shadow-sm">
                    <span className="font-medium leading-relaxed">{item}</span>
                    <button onClick={() => setListaCorrigidos(listaCorrigidos.filter((_, idx) => idx !== i))} className="text-blue-300 hover:text-red-500 shrink-0 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RODAPÉ FIXO DO MODAL */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={data.publicado}
            onChange={e => setData({ ...data, publicado: e.target.checked })}
            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Publicar imediatamente</span>
        </label>

        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={onCancelar} className="flex-1 sm:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 hover:text-slate-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSalvarClick}
            disabled={!podeSalvar}
            className="flex-1 sm:flex-none bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Save size={18} /> Salvar Release
          </button>
        </div>
      </div>

    </div>
  );
}