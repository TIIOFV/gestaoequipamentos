import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Printer, Trash2, X, Plus, CalendarDays, FileText, Tag, Edit } from 'lucide-react'
import toast from 'react-hot-toast'

// FUNÇÃO BLINDADA CONTRA FUSO HORÁRIO
const formatarMesAnoExtenso = (dataString) => {
  if (!dataString) return '-';
  const partes = dataString.split('T')[0].split('-'); // Pega apenas AAAA-MM
  if (partes.length < 2) return dataString;
  const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  return `${meses[parseInt(partes[1], 10) - 1]} DE ${partes[0]}`;
}

// Pega o mês atual no fuso local para evitar bugs na virada da noite
const getMesAtualLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function DetalheBilhetagem({ equipamento }) {
  const [leituras, setLeituras] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [leituraEditando, setLeituraEditando] = useState(null)

  const [formData, setFormData] = useState({
    mes_referencia: getMesAtualLocal(),
    contador_pb: '',
    contador_cor: '',
    contador_etiquetas: '',
    contador_pulseiras: ''
  })

  const tipo = equipamento?.tipo_impressora?.toLowerCase() || ''
  const isColorida = tipo.includes('colorida') || tipo.includes('multifuncional')
  const isTermica = tipo.includes('térmica') || tipo.includes('termica') || tipo.includes('etiqueta')

  useEffect(() => {
    if (equipamento?.id) carregarLeituras()
  }, [equipamento?.id])

  const carregarLeituras = async () => {
    try {
      const { data, error } = await supabase
        .from('leituras_impressoras')
        .select('*')
        .eq('equipamento_id', equipamento.id)
        .order('mes_referencia', { ascending: false })

      if (error) throw error
      setLeituras(data || [])
    } catch (error) {
      toast.error("Erro ao carregar leituras.")
    } finally {
      setLoading(false)
    }
  }

  const fecharModal = () => {
    setModalAberto(false)
    setLeituraEditando(null)
    setFormData({ 
      mes_referencia: getMesAtualLocal(), 
      contador_pb: '', 
      contador_cor: '', 
      contador_etiquetas: '', 
      contador_pulseiras: '' 
    })
  }

  const handleEditar = (leitura) => {
    setLeituraEditando(leitura.id)
    setFormData({
      mes_referencia: leitura.mes_referencia.slice(0, 7),
      contador_pb: leitura.contador_pb || '',
      contador_cor: leitura.contador_cor || '',
      contador_etiquetas: leitura.contador_etiquetas || '',
      contador_pulseiras: leitura.contador_pulseiras || ''
    })
    setModalAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    
    try {
      const dataReferencia = `${formData.mes_referencia}-01`

      const payload = {
        equipamento_id: equipamento.id,
        mes_referencia: dataReferencia,
        contador_pb: parseInt(formData.contador_pb) || 0,
        contador_cor: parseInt(formData.contador_cor) || 0,
        contador_etiquetas: parseInt(formData.contador_etiquetas) || 0,
        contador_pulseiras: parseInt(formData.contador_pulseiras) || 0
      }

      if (leituraEditando) {
        const { error } = await supabase.from('leituras_impressoras').update(payload).eq('id', leituraEditando)
        if (error) throw error
        toast.success('Contagem atualizada com sucesso!')
      } else {
        const { error } = await supabase.from('leituras_impressoras').insert([payload])
        if (error) throw error
        toast.success('Contagem registada com sucesso!')
      }

      fecharModal()
      carregarLeituras()
    } catch (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id) => {
    if (!window.confirm('Tem a certeza que deseja excluir esta contagem?')) return
    try {
      const { error } = await supabase.from('leituras_impressoras').delete().eq('id', id)
      if (error) throw error
      toast.success('Registo excluído!')
      carregarLeituras()
    } catch (error) {
      toast.error('Erro ao excluir.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Printer className="text-blue-600" size={20} /> 
          Histórico de Volume (Fechamento Geral)
        </h3>
        <button onClick={() => setModalAberto(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors text-sm">
          <Plus size={16} /> Lançar Mês
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse h-20 bg-slate-100 rounded-xl w-full"></div>
      ) : leituras.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <Printer size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Nenhum fechamento registado para esta impressora.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-bold">Mês Referência</th>
                {!isTermica && <th className="px-4 py-3 font-bold text-center">Págs P&B</th>}
                {isColorida && <th className="px-4 py-3 font-bold text-center text-rose-600">Págs Cor</th>}
                {isTermica && <th className="px-4 py-3 font-bold text-center text-emerald-600">Etiquetas/Pulseiras</th>}
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leituras.map((leitura) => (
                <tr key={leitura.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-700 uppercase">
                    {/* AQUI ESTÁ A CORREÇÃO PRINCIPAL */}
                    {formatarMesAnoExtenso(leitura.mes_referencia)}
                  </td>
                  {!isTermica && <td className="px-4 py-3 text-center font-medium text-slate-600">{leitura.contador_pb || 0}</td>}
                  {isColorida && <td className="px-4 py-3 text-center font-bold text-rose-600 bg-rose-50/50">{leitura.contador_cor || 0}</td>}
                  {isTermica && <td className="px-4 py-3 text-center font-bold text-emerald-600 bg-emerald-50/50">{(leitura.contador_etiquetas || 0) + (leitura.contador_pulseiras || 0)}</td>}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => handleEditar(leitura)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Editar registo"><Edit size={16} /></button>
                      <button onClick={() => handleExcluir(leitura.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Excluir registo"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE LANÇAMENTO / EDIÇÃO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{leituraEditando ? 'Editar Contagem' : 'Lançamento de Contagem'}</h3>
              <button onClick={fecharModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSalvar} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><CalendarDays size={14}/> Mês de Referência</label>
                <input required type="month" value={formData.mes_referencia} onChange={e => setFormData({...formData, mes_referencia: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>

              {!isTermica && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><FileText size={14}/> Total P&B</label>
                    <input type="number" min="0" placeholder="0" value={formData.contador_pb} onChange={e => setFormData({...formData, contador_pb: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  
                  {isColorida && (
                    <div>
                      <label className="block text-sm font-bold text-rose-600 mb-1 flex items-center gap-2"><FileText size={14}/> Total Cor</label>
                      <input type="number" min="0" placeholder="0" value={formData.contador_cor} onChange={e => setFormData({...formData, contador_cor: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-rose-200 outline-none focus:ring-2 focus:ring-rose-500 bg-rose-50 text-rose-700" />
                    </div>
                  )}
                </div>
              )}

              {isTermica && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Tag size={14}/> Etiquetas</label>
                    <input type="number" min="0" placeholder="0" value={formData.contador_etiquetas} onChange={e => setFormData({...formData, contador_etiquetas: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Tag size={14}/> Pulseiras</label>
                    <input type="number" min="0" placeholder="0" value={formData.contador_pulseiras} onChange={e => setFormData({...formData, contador_pulseiras: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={fecharModal} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-70">
                  {salvando ? 'A processar...' : (leituraEditando ? 'Atualizar' : 'Salvar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}