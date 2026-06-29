import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import { Printer, Droplet, ListPlus, CalendarDays, Search, Trash2, X, Plus, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BilhetagemPage() {
  const { moduloAtivo } = useModulo()
  const [leituras, setLeituras] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0, 7))

  // Estados do Modal de Lote
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [impressoras, setImpressoras] = useState([])
  const [impressoraSelecionada, setImpressoraSelecionada] = useState('')
  const [linhasLote, setLinhasLote] = useState([{ id_impressao: '', usuario_setor: '', paginas_cor: '' }])

  useEffect(() => {
    // Redundância de segurança: só roda no módulo de impressoras
    if (moduloAtivo === 'impressoras') {
      carregarDados()
      carregarImpressorasColoridas()
    }
  }, [moduloAtivo, mesFiltro])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const dataInicio = `${mesFiltro}-01`
      const { data, error } = await supabase
        .from('auditoria_impressoes')
        .select(`*, equipamento:equipamento_id(nome)`)
        .eq('mes_referencia', dataInicio)
        .order('paginas_cor', { ascending: false }) // Mostra quem imprimiu mais primeiro

      if (error) throw error
      setLeituras(data || [])
    } catch (error) {
      toast.error('Erro ao carregar auditoria.')
    } finally {
      setLoading(false)
    }
  }

  const carregarImpressorasColoridas = async () => {
    const { data } = await supabase
      .from('equipamentos')
      .select('id, nome')
      .eq('modulo', 'impressoras')
      .ilike('tipo_impressora', '%colorida%') // Traz apenas as que importam
    
    setImpressoras(data || [])
    if (data && data.length > 0) setImpressoraSelecionada(data[0].id)
  }

  // --- FUNÇÕES DO MODAL EM LOTE ---
  const adicionarLinha = () => setLinhasLote([...linhasLote, { id_impressao: '', usuario_setor: '', paginas_cor: '' }])
  const removerLinha = (index) => setLinhasLote(linhasLote.filter((_, i) => i !== index).length ? linhasLote.filter((_, i) => i !== index) : [{ id_impressao: '', usuario_setor: '', paginas_cor: '' }])
  const atualizarLinha = (index, campo, valor) => {
    const novas = [...linhasLote]; novas[index][campo] = valor; setLinhasLote(novas);
  }

  const handleSalvarLote = async (e) => {
    e.preventDefault()
    if (!impressoraSelecionada) return toast.error('Selecione uma impressora.')

    const validas = linhasLote.filter(l => l.usuario_setor.trim() !== '' && l.paginas_cor !== '')
    if (!validas.length) return toast.error('Preencha pelo menos um utilizador.')

    setSalvando(true)
    try {
      // 1. Converte o mês (ex: 2026-06) para data completa (ex: 2026-06-01)
      const dataFormatada = `${mesFiltro}-01`

      const payload = validas.map(linha => ({
        equipamento_id: impressoraSelecionada,
        mes_referencia: dataFormatada,
        id_impressao: linha.id_impressao || null,
        usuario_setor: linha.usuario_setor,
        paginas_cor: parseInt(linha.paginas_cor) || 0
      }))

      console.log("Enviando para Supabase:", payload); // Debug: Veja no F12 o que está a ser enviado

      const { error } = await supabase
        .from('auditoria_impressoes')
        .insert(payload)

      if (error) {
        console.error("Erro detalhado Supabase:", error);
        throw error;
      }

      toast.success(`Relatório guardado com sucesso!`);
      setModalAberto(false);
      setLinhasLote([{ id_impressao: '', usuario_setor: '', paginas_cor: '' }]);
      carregarDados();
    } catch (err) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSalvando(false);
    }
  }

  const handleExcluir = async (id) => {
    if (!window.confirm('Excluir este registo de utilizador?')) return
    const { error } = await supabase.from('auditoria_impressoes').delete().eq('id', id)
    if (!error) { toast.success('Excluído!'); carregarDados(); }
  }

  // Filtro de busca em tela
  const dadosFiltrados = leituras.filter(l => l.usuario_setor.toLowerCase().includes(busca.toLowerCase()) || l.id_impressao?.includes(busca))
  const totalPaginas = dadosFiltrados.reduce((acc, curr) => acc + (curr.paginas_cor || 0), 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Droplet className="text-rose-600" /> Auditoria de Cor
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Gestão de bilhetagem e consumo por utilizador/setor.</p>
        </div>
        <button onClick={() => setModalAberto(true)} className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
          <ListPlus size={20} /> Lançar Relatório Mensal
        </button>
      </div>

      {/* CONTROLES E RESUMO */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex gap-4 w-full md:w-auto">
          <input type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-700" />
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar utilizador..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500 text-sm" />
          </div>
        </div>
        
        <div className="bg-rose-50 px-6 py-3 rounded-xl border border-rose-100 flex items-center gap-3 w-full md:w-auto justify-center">
          <Droplet className="text-rose-600" size={24} />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Total Colorido no Mês</span>
            <span className="text-xl font-black text-rose-700 leading-none">{totalPaginas} págs</span>
          </div>
        </div>
      </div>

      {/* TABELA DE DADOS */}
      {loading ? (
         <div className="animate-pulse h-64 bg-slate-100 rounded-2xl w-full border border-slate-200"></div>
      ) : dadosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 shadow-sm rounded-2xl">
          <Printer size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium text-lg">Nenhum registo encontrado em {mesFiltro}.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-bold">Máquina</th>
                <th className="px-6 py-4 font-bold">ID Impressão</th>
                <th className="px-6 py-4 font-bold">Utilizador / Setor</th>
                <th className="px-6 py-4 font-bold text-center text-rose-600">Páginas Cor</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dadosFiltrados.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-slate-500 text-xs font-bold uppercase">{item.equipamento?.nome}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{item.id_impressao || '-'}</td>
                  <td className="px-6 py-4 font-bold text-slate-700">{item.usuario_setor}</td>
                  <td className="px-6 py-4 text-center font-black text-rose-600 text-base">{item.paginas_cor}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleExcluir(item.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE LANÇAMENTO EM LOTE */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Novo Relatório Mensal</h3>
                <p className="text-xs text-slate-500 mt-1">Registe as impressões coloridas em lote</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Impressora Origem</label>
                  <select value={impressoraSelecionada} onChange={e => setImpressoraSelecionada(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700 bg-slate-50">
                    {impressoras.map(imp => <option key={imp.id} value={imp.id}>{imp.nome}</option>)}
                  </select>
                </div>
                <div className="w-48">
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><CalendarDays size={16}/> Mês Referência</label>
                  <input type="month" value={mesFiltro} disabled className="w-full px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-500 bg-slate-100 cursor-not-allowed" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-3 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <div className="col-span-3">ID (Opcional)</div>
                  <div className="col-span-5">Utilizador / Setor</div>
                  <div className="col-span-3 text-rose-500">Págs Cor</div>
                  <div className="col-span-1"></div>
                </div>
                {linhasLote.map((linha, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-center group">
                    <div className="col-span-3"><input type="text" placeholder="Ex: 1045" value={linha.id_impressao} onChange={e => atualizarLinha(index, 'id_impressao', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500 font-mono text-sm" /></div>
                    <div className="col-span-5"><input type="text" placeholder="Ex: Maria (Recepção)" value={linha.usuario_setor} onChange={e => atualizarLinha(index, 'usuario_setor', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500 text-sm" /></div>
                    <div className="col-span-3"><input type="number" min="1" placeholder="0" value={linha.paginas_cor} onChange={e => atualizarLinha(index, 'paginas_cor', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-rose-200 outline-none focus:ring-2 focus:ring-rose-500 text-sm font-bold text-rose-700 bg-rose-50" /></div>
                    <div className="col-span-1 flex justify-center"><button type="button" onClick={() => removerLinha(index)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={18} /></button></div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={adicionarLinha} className="mt-4 flex items-center gap-2 text-sm font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-lg transition-colors w-full justify-center border border-dashed border-rose-200"><Plus size={16} /> Adicionar linha</button>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
              <button type="button" onClick={() => setModalAberto(false)} className="flex-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleSalvarLote} disabled={salvando} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-md"><Save size={18} /> {salvando ? 'A guardar...' : 'Salvar Relatório'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}