import { useState } from 'react';
import { Plus, Trash2, Save, Sparkles, Wrench } from 'lucide-react';

export default function ReleaseForm({ onSalvar, onCancelar }) {
  const [data, setData] = useState({
    versao: 'v1.',
    data_release: new Date().toISOString().split('T')[0],
    publicado: false
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

  // Antes era possível salvar uma release vazia (sem versão nem itens).
  // Agora exige uma versão e pelo menos um item de novidade ou correção.
  const podeSalvar =
    data.versao.trim().length > 0 && (listaAdicionados.length > 0 || listaCorrigidos.length > 0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Versão</span>
          <input
            className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
            placeholder="v1.0.0"
            value={data.versao}
            onChange={e => setData({ ...data, versao: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Data</span>
          <input
            type="date"
            className="mt-1 w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
            value={data.data_release}
            onChange={e => setData({ ...data, data_release: e.target.value })}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Adicionados */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-emerald-600 flex items-center gap-1">
            <Sparkles size={14} /> Novidades
          </span>
          <div className="flex gap-2">
            <input
              className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
              placeholder="O que há de novo?"
              value={inputAdicionado}
              onChange={e => setInputAdicionado(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  adicionarItem('adicionado');
                }
              }}
            />
            <button
              onClick={() => adicionarItem('adicionado')}
              className="bg-emerald-50 text-emerald-700 p-2 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          {listaAdicionados.map((item, i) => (
            <div key={i} className="flex justify-between items-center gap-2 text-sm bg-emerald-50 text-emerald-800 p-2 rounded-lg">
              <span>{item}</span>
              <Trash2
                size={14}
                className="cursor-pointer text-emerald-400 hover:text-red-500 shrink-0"
                onClick={() => setListaAdicionados(listaAdicionados.filter((_, idx) => idx !== i))}
              />
            </div>
          ))}
        </div>

        {/* Corrigidos */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-blue-600 flex items-center gap-1">
            <Wrench size={14} /> Correções
          </span>
          <div className="flex gap-2">
            <input
              className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
              placeholder="Bug corrigido?"
              value={inputCorrigido}
              onChange={e => setInputCorrigido(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  adicionarItem('corrigido');
                }
              }}
            />
            <button
              onClick={() => adicionarItem('corrigido')}
              className="bg-blue-50 text-blue-700 p-2 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          {listaCorrigidos.map((item, i) => (
            <div key={i} className="flex justify-between items-center gap-2 text-sm bg-blue-50 text-blue-800 p-2 rounded-lg">
              <span>{item}</span>
              <Trash2
                size={14}
                className="cursor-pointer text-blue-400 hover:text-red-500 shrink-0"
                onClick={() => setListaCorrigidos(listaCorrigidos.filter((_, idx) => idx !== i))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-slate-100">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={data.publicado}
            onChange={e => setData({ ...data, publicado: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
          />
          <span className="text-sm font-medium text-slate-600">Publicar imediatamente</span>
        </label>

        <div className="flex gap-3">
          <button onClick={onCancelar} className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700">
            Cancelar
          </button>
          <button
            onClick={handleSalvarClick}
            disabled={!podeSalvar}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={18} /> Salvar Release
          </button>
        </div>
      </div>
    </div>
  );
}
