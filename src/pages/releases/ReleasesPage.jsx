import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Rocket, Plus, X, ArrowLeft, Loader2, PackageOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ReleaseForm from './components/ReleaseForm';
import ReleaseCard from './components/ReleaseCard';

export default function ReleasesPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.perfil === 'administrador';
  const navigate = useNavigate();

  const [releases, setReleases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

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
    setReleases(isAdmin ? (data || []) : (data || []).filter(r => r.publicado));
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
      toast.error('Erro ao salvar no banco. Verifique as permissões.');
    }
  };

  // Antes esta função não existia de verdade: o botão de olho chamava
  // diretamente "carregarReleases", que só recarrega a lista e nunca
  // muda o campo "publicado" no banco. Agora o toggle funciona de fato.
  const handleToggle = async (id, statusAtual) => {
    try {
      const { error } = await supabase
        .from('historico_releases')
        .update({ publicado: !statusAtual })
        .eq('id', id);
      if (error) throw error;

      toast.success(!statusAtual ? 'Release publicada!' : 'Release ocultada.');
      await carregarReleases();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar. Verifique as permissões.');
    }
  };

  // Mesmo problema do toggle: o botão de lixeira não excluía nada de fato.
  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta release? Essa ação não pode ser desfeita.')) return;
    try {
      const { error } = await supabase.from('historico_releases').delete().eq('id', id);
      if (error) throw error;

      toast.success('Release excluída.');
      await carregarReleases();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir. Verifique as permissões.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Rocket className="text-indigo-600" /> Notas de Atualização
            </h1>
            <p className="text-sm text-slate-400 mt-1">Histórico de versões e melhorias do sistema.</p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${showForm ? 'bg-red-100 text-red-600' : 'bg-slate-900 text-white hover:bg-slate-700'}`}
          >
            {showForm ? <><X size={18}/> Cancelar</> : <><Plus size={18}/> Nova Release</>}
          </button>
        )}
      </div>

      {showForm && <ReleaseForm onSalvar={handleSalvar} onCancelar={() => setShowForm(false)} />}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
          <Loader2 className="animate-spin" size={20} /> Carregando releases...
        </div>
      ) : releases.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          <PackageOpen size={32} />
          <p className="text-sm">Nenhuma release {isAdmin ? '' : 'publicada '}ainda.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {releases.map(rel => (
            <ReleaseCard key={rel.id} rel={rel} isAdmin={isAdmin} onDelete={handleDelete} onToggle={handleToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
