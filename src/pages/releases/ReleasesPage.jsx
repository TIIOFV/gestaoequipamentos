import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Rocket, Plus, X, ArrowLeft, Loader2, PackageOpen, Search, Calendar, Sparkles, Wrench, Eye, EyeOff, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ReleaseForm from './components/ReleaseForm';

export default function ReleasesPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.perfil === 'administrador';
  const navigate = useNavigate();

  const [releases, setReleases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [busca, setBusca] = useState('');
  const [releaseAtiva, setReleaseAtiva] = useState(null);

  useEffect(() => { carregarReleases(); }, []);

  const carregarReleases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('historico_releases')
      .select('*')
      .order('data_release', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar dados.');
      setLoading(false);
      return;
    }
    
    const dadosFiltrados = isAdmin ? (data || []) : (data || []).filter(r => r.publicado);
    setReleases(dadosFiltrados);
    
    if (dadosFiltrados.length > 0) {
      setReleaseAtiva(dadosFiltrados[0]);
    }
    setLoading(false);
  };

  const handleSalvar = async (dados) => {
    try {
      const { error } = await supabase.from('historico_releases').insert([dados]);
      if (error) throw error;

      toast.success('Release gravada com sucesso!');
      setShowForm(false);
      await carregarReleases();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar no banco.');
    }
  };

  const handleToggle = async (id, statusAtual) => {
    try {
      const { error } = await supabase.from('historico_releases').update({ publicado: !statusAtual }).eq('id', id);
      if (error) throw error;

      toast.success(!statusAtual ? 'Release publicada!' : 'Release ocultada.');
      const novasReleases = releases.map(r => r.id === id ? { ...r, publicado: !statusAtual } : r);
      setReleases(novasReleases);
      if (releaseAtiva?.id === id) setReleaseAtiva({ ...releaseAtiva, publicado: !statusAtual });
      
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta release? Essa ação não pode ser desfeita.')) return;
    try {
      const { error } = await supabase.from('historico_releases').delete().eq('id', id);
      if (error) throw error;

      toast.success('Release excluída.');
      await carregarReleases();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir.');
    }
  };

  const releasesFiltradas = releases.filter(r => {
    const termo = busca.toLowerCase();
    const matchVersao = r.versao.toLowerCase().includes(termo);
    const matchNovidade = r.adicionado?.some(a => a.toLowerCase().includes(termo));
    const matchCorrecao = r.corrigido?.some(c => c.toLowerCase().includes(termo));
    return matchVersao || matchNovidade || matchCorrecao;
  });

  const formatarData = (dataStr) => {
    return new Date(`${dataStr}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    // 🚀 Ajuste 1: "w-full" para usar 100% do espaço que o Dashboard permite. Removido o max-w limitador.
    <div className="w-full space-y-6 animate-in fade-in duration-300 pb-10">
      
      {/* CABEÇALHO PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 rounded-xl transition-all active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shadow-inner">
                <Rocket className="text-indigo-600" size={20} />
              </div>
              Notas de Atualização
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">Acompanhe as últimas novidades, melhorias e correções do sistema.</p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 text-sm"
          >
            <Plus size={18}/> Nova Release
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl animate-in zoom-in-95 duration-200 shadow-2xl">
            <ReleaseForm onSalvar={handleSalvar} onCancelar={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-slate-400">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
          <span className="font-bold text-sm">Carregando painel de versões...</span>
        </div>
      ) : releases.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
            <PackageOpen size={32} className="text-slate-300" />
          </div>
          <p className="text-sm font-bold">Nenhuma atualização {isAdmin ? '' : 'publicada '}ainda.</p>
        </div>
      ) : (
        // 🚀 Ajuste 2: Layout Flexível (Esquerda fixa, Direita flexível)
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          
          {/* 📱 PAINEL ESQUERDO: LISTA DE VERSÕES & FILTRO */}
          {/* 🚀 Ajuste 3: Altura controlada sem `sticky` para evitar bugs de scroll */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
            
            <div className="p-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar novidade ou correção..." 
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1">
              {releasesFiltradas.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm font-medium">Nenhum resultado encontrado.</div>
              ) : (
                releasesFiltradas.map((rel, index) => {
                  const isActive = releaseAtiva?.id === rel.id;
                  const isLatest = index === 0 && busca === ''; 
                  
                  const qtdNovidades = rel.adicionado?.length || 0;
                  const qtdCorrecoes = rel.corrigido?.length || 0;
                  
                  return (
                    <button
                      key={rel.id}
                      onClick={() => setReleaseAtiva(rel)}
                      className={`w-full text-left p-4 rounded-xl transition-all flex flex-col gap-2 border
                        ${isActive 
                          ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-100' 
                          : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                    >
                      <div className="flex justify-between items-start w-full gap-2">
                        <span className={`font-black text-lg tracking-tight ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {rel.versao}
                        </span>
                        
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isLatest && rel.publicado && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Novo</span>
                          )}
                          {!rel.publicado && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Oculto</span>
                          )}
                        </div>
                      </div>
                      
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}>
                        <Calendar size={12} /> {formatarData(rel.data_release)}
                      </span>

                      {(qtdNovidades > 0 || qtdCorrecoes > 0) && (
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {qtdNovidades > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${isActive ? 'bg-emerald-100/50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                              <Sparkles size={10}/> {qtdNovidades}
                            </span>
                          )}
                          {qtdCorrecoes > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${isActive ? 'bg-blue-100/50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                              <Wrench size={10}/> {qtdCorrecoes}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* 💻 PAINEL DIREITO: DETALHES DA VERSÃO SELECIONADA */}
          {/* 🚀 Ajuste 4: `flex-1` faz ele ocupar exatamente o resto da tela! E sem animações travadas. */}
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden w-full">
            {releaseAtiva ? (
              <div className="flex flex-col h-full">
                
                <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent pb-1">
                      {releaseAtiva.versao}
                    </h2>
                    <p className="text-sm font-semibold text-slate-500 mt-2 flex items-center gap-2">
                      <Calendar size={16} className="text-indigo-400" />
                      Lançado em {formatarData(releaseAtiva.data_release)}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                      <button
                        onClick={() => handleToggle(releaseAtiva.id, releaseAtiva.publicado)}
                        className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 text-xs transition-colors ${releaseAtiva.publicado ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                      >
                        {releaseAtiva.publicado ? <><EyeOff size={16} /> Ocultar</> : <><Eye size={16} /> Publicar</>}
                      </button>
                      <div className="w-px h-6 bg-slate-200"></div>
                      <button
                        onClick={() => handleDelete(releaseAtiva.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Excluir Permanentemente"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-6 md:p-8 space-y-10">
                  {(!releaseAtiva.adicionado?.length && !releaseAtiva.corrigido?.length) ? (
                    <div className="text-center py-16">
                      <PackageOpen size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold text-sm">Sem notas detalhadas para esta versão.</p>
                    </div>
                  ) : (
                    <>
                      {releaseAtiva.adicionado?.length > 0 && (
                        <div className="space-y-5">
                          <h4 className="text-sm font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2.5 border-b-2 border-emerald-50 pb-3">
                            <Sparkles size={20} className="text-emerald-500 bg-emerald-50 p-1 rounded-md" /> 
                            Novidades & Recursos
                          </h4>
                          <ul className="space-y-3">
                            {releaseAtiva.adicionado.map((item, i) => (
                              <li key={`a-${i}`} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:border-emerald-100 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0 shadow-sm shadow-emerald-400/50"></div>
                                <span className="text-sm font-medium text-slate-700 leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {releaseAtiva.corrigido?.length > 0 && (
                        <div className="space-y-5 pt-2">
                          <h4 className="text-sm font-black uppercase tracking-widest text-blue-600 flex items-center gap-2.5 border-b-2 border-blue-50 pb-3">
                            <Wrench size={20} className="text-blue-500 bg-blue-50 p-1 rounded-md" /> 
                            Ajustes & Correções
                          </h4>
                          <ul className="space-y-3">
                            {releaseAtiva.corrigido.map((item, i) => (
                              <li key={`c-${i}`} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:border-blue-100 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0 shadow-sm shadow-blue-400/50"></div>
                                <span className="text-sm font-medium text-slate-700 leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>

              </div>
            ) : null}
          </div>

        </div>
      )}
    </div>
  );
}