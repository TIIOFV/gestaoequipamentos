import { useState, useEffect } from 'react'
import { BarChart, Printer, Plus, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

export default function DetalheBilhetagem({ equipamento }) {
  const [leituras, setLeituras] = useState([])
  const [isModalLeituraOpen, setIsModalLeituraOpen] = useState(false)
  const [formLeitura, setFormLeitura] = useState({
    mes_referencia: new Date().toISOString().slice(0, 7),
    contador_pb: '', contador_cor: '', contador_etiquetas: '', contador_pulseiras: '', custo_total: ''
  })

  useEffect(() => {
    if (equipamento?.id) buscarLeituras()
  }, [equipamento])

  const buscarLeituras = async () => {
    const { data } = await supabase
      .from('leituras_impressoras')
      .select('*, registrado_por:registrado_por_id(nome)')
      .eq('equipamento_id', equipamento.id)
      .order('mes_referencia', { ascending: false })
    if (data) setLeituras(data)
  }

  const handleSalvarLeitura = async (e) => {
    e.preventDefault()
    try {
      toast.loading('A registrar leitura...', { id: 'salvar-leitura' })
      const { data: authData } = await supabase.auth.getUser()
      let perfilId = null
      if (authData?.user?.id) {
         const { data: perfilData } = await supabase.from('perfis').select('id').eq('user_id', authData.user.id).maybeSingle()
         if (perfilData) perfilId = perfilData.id
      }

      const dataRef = `${formLeitura.mes_referencia}-01`
      const payload = {
        equipamento_id: equipamento.id, mes_referencia: dataRef,
        contador_pb: parseInt(formLeitura.contador_pb) || 0,
        contador_cor: parseInt(formLeitura.contador_cor) || 0,
        contador_etiquetas: parseInt(formLeitura.contador_etiquetas) || 0,
        contador_pulseiras: parseInt(formLeitura.contador_pulseiras) || 0,
        custo_total: parseFloat(formLeitura.custo_total) || 0,
        registrado_por_id: perfilId
      }

      const { error } = await supabase.from('leituras_impressoras').insert([payload])
      if (error) throw error

      toast.success('Leitura registada!', { id: 'salvar-leitura' })
      setIsModalLeituraOpen(false)
      setFormLeitura({ mes_referencia: new Date().toISOString().slice(0, 7), contador_pb: '', contador_cor: '', contador_etiquetas: '', contador_pulseiras: '', custo_total: '' })
      buscarLeituras()
    } catch (error) { toast.error('Erro ao registar leitura.', { id: 'salvar-leitura' }) }
  }

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-purple-500 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BarChart className="text-purple-600" size={20} /> Controle de Bilhetagem (Leituras)
        </h3>
        <button onClick={() => setIsModalLeituraOpen(true)} className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2">
          <Plus size={16} /> Lançar Leitura
        </button>
      </div>

      {leituras.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
          <Printer className="mx-auto text-slate-300 mb-2" size={32} />
          <h4 className="text-slate-600 font-bold">Nenhuma leitura registada</h4>
          <p className="text-sm text-slate-500">Comece a registar o volume impresso mês a mês.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Mês/Ano</th><th className="p-4">P&B</th><th className="p-4">Colorida</th>
                <th className="p-4">Etiquetas</th><th className="p-4">Pulseiras</th>
                <th className="p-4">Custo Faturado</th><th className="p-4">Registado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leituras.map((leitura) => (
                <tr key={leitura.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-800">{new Date(leitura.mes_referencia).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase()}</td>
                  <td className="p-4">{leitura.contador_pb > 0 ? leitura.contador_pb.toLocaleString('pt-BR') : '-'}</td>
                  <td className="p-4">{leitura.contador_cor > 0 ? leitura.contador_cor.toLocaleString('pt-BR') : '-'}</td>
                  <td className="p-4">{leitura.contador_etiquetas > 0 ? leitura.contador_etiquetas.toLocaleString('pt-BR') : '-'}</td>
                  <td className="p-4">{leitura.contador_pulseiras > 0 ? leitura.contador_pulseiras.toLocaleString('pt-BR') : '-'}</td>
                  <td className="p-4 font-bold text-red-600">{leitura.custo_total > 0 ? `R$ ${leitura.custo_total.toFixed(2).replace('.', ',')}` : '-'}</td>
                  <td className="p-4 text-xs">{leitura.registrado_por?.nome || 'Sistema'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalLeituraOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in duration-200 relative border border-slate-200">
            <button onClick={() => setIsModalLeituraOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"><X size={20} /></button>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Lançar Leitura</h2>
            
            <form onSubmit={handleSalvarLeitura} className="space-y-4 mt-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Mês de Referência</label>
                <input type="month" required value={formLeitura.mes_referencia} onChange={(e) => setFormLeitura({...formLeitura, mes_referencia: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {(!equipamento.tipo_impressora || equipamento.tipo_impressora.includes('Monocromática') || equipamento.tipo_impressora.includes('Colorida') || equipamento.tipo_impressora.includes('Multifuncional')) && (
                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Páginas P&B</label><input type="number" min="0" value={formLeitura.contador_pb} onChange={(e) => setFormLeitura({...formLeitura, contador_pb: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" /></div>
                )}
                {(!equipamento.tipo_impressora || equipamento.tipo_impressora.includes('Colorida') || equipamento.tipo_impressora.includes('Multifuncional')) && (
                  <div><label className="block text-sm font-bold text-purple-700 mb-1">Páginas Coloridas</label><input type="number" min="0" value={formLeitura.contador_cor} onChange={(e) => setFormLeitura({...formLeitura, contador_cor: e.target.value})} className="w-full p-3 rounded-xl border border-purple-200 bg-purple-50/50" /></div>
                )}
                {(!equipamento.tipo_impressora || equipamento.tipo_impressora.includes('Etiquetas')) && (
                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Qtd. Etiquetas</label><input type="number" min="0" value={formLeitura.contador_etiquetas} onChange={(e) => setFormLeitura({...formLeitura, contador_etiquetas: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" /></div>
                )}
                {(!equipamento.tipo_impressora || equipamento.tipo_impressora.includes('Pulseiras')) && (
                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Qtd. Pulseiras</label><input type="number" min="0" value={formLeitura.contador_pulseiras} onChange={(e) => setFormLeitura({...formLeitura, contador_pulseiras: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" /></div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-red-700 mb-1 mt-2">Custo Faturado no Mês (R$)</label>
                <input type="number" step="0.01" min="0" value={formLeitura.custo_total} onChange={(e) => setFormLeitura({...formLeitura, custo_total: e.target.value})} className="w-full p-3 rounded-xl border border-red-200 bg-red-50" />
              </div>

              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-md mt-6">Salvar Leitura</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}