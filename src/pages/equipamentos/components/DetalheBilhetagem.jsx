import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { Printer, Trash2, X, Plus, CalendarDays, FileText, Tag, Edit, Calculator, AlertTriangle, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import ModalConfirmacao from '../../../components/ModalConfirmacao'
import { useAuth } from '../../../contexts/AuthContext' // 🚀 IMPORTADO PARA OS LOGS

const formatarMesAnoExtenso = (dataString) => {
  if (!dataString) return '-';
  const partes = dataString.split('T')[0].split('-'); 
  if (partes.length < 2) return dataString;
  const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  return `${meses[parseInt(partes[1], 10) - 1]} DE ${partes[0]}`;
}

const getMesAtualLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function DetalheBilhetagem({ equipamento }) {
  const { profile } = useAuth() // 🚀 PERFIL PARA GRAVAR QUEM FEZ A AÇÃO
  const [leituras, setLeituras] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [leituraEditando, setLeituraEditando] = useState(null)
  
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear().toString())
  const [selecionados, setSelecionados] = useState([])
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, idsParaExcluir: [] })

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
      setSelecionados([]) 
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

      // 🚀 GRAVAR NO LOG DE AUDITORIA
      await supabase.from('logs_auditoria').insert([{
        usuario_nome: profile?.nome || 'Usuário Desconhecido',
        acao: leituraEditando ? 'EDIÇÃO' : 'CRIAÇÃO',
        modulo: 'impressoras',
        detalhes: leituraEditando 
          ? `Editou o totalizador de faturamento da impressora ${equipamento.nome} (Ref: ${formData.mes_referencia})`
          : `Lançou novo totalizador para a impressora ${equipamento.nome} (Ref: ${formData.mes_referencia})`
      }]);

      setAnoFiltro(formData.mes_referencia.substring(0, 4))
      fecharModal()
      carregarLeituras()
    } catch (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setSalvando(false)
    }
  }

  const solicitarExclusao = (ids) => {
    setModalConfirm({ isOpen: true, idsParaExcluir: Array.isArray(ids) ? ids : [ids] })
  }

  const confirmarExclusao = async () => {
    if (!modalConfirm.idsParaExcluir.length) return;
    try {
      const { error } = await supabase.from('leituras_impressoras').delete().in('id', modalConfirm.idsParaExcluir)
      if (error) throw error
      
      // 🚀 GRAVAR NO LOG DE AUDITORIA
      await supabase.from('logs_auditoria').insert([{
        usuario_nome: profile?.nome || 'Usuário Desconhecido',
        acao: 'EXCLUSÃO',
        modulo: 'impressoras',
        detalhes: modalConfirm.idsParaExcluir.length > 1
          ? `Excluiu ${modalConfirm.idsParaExcluir.length} totalizadores em lote da impressora ${equipamento.nome}`
          : `Excluiu um totalizador de faturamento da impressora ${equipamento.nome}`
      }]);

      toast.success(modalConfirm.idsParaExcluir.length > 1 ? `${modalConfirm.idsParaExcluir.length} leituras excluídas!` : 'Leitura excluída com sucesso!')
      carregarLeituras()
    } catch (error) {
      toast.error('Erro ao excluir registros.')
    } finally {
      setModalConfirm({ isOpen: false, idsParaExcluir: [] })
    }
  }

  const calcularConsumo = (leituraAtual, leituraAnterior) => {
    if (leituraAnterior === undefined || leituraAnterior === null) {
      return { valor: leituraAtual, isBase: true, tooltip: 'Primeira leitura registada (Marco Zero)' };
    }
    const diff = (leituraAtual || 0) - (leituraAnterior || 0);
    if (diff < 0) {
      return { valor: diff, isReset: true, tooltip: 'Atenção: O totalizador diminuiu. O contador pode ter sido zerado ou a máquina trocada.' };
    }
    return { valor: diff, isReset: false, tooltip: 'Consumo faturável no período' };
  }

  const dadosProcessados = useMemo(() => {
    const processados = leituras.map((leitura, index) => {
      const prevLeitura = leituras[index + 1];
      return {
        ...leitura,
        consumoPB: calcularConsumo(leitura.contador_pb, prevLeitura?.contador_pb),
        consumoCor: calcularConsumo(leitura.contador_cor, prevLeitura?.contador_cor),
        consumoTermica: calcularConsumo(
          (leitura.contador_etiquetas || 0) + (leitura.contador_pulseiras || 0), 
          prevLeitura ? ((prevLeitura.contador_etiquetas || 0) + (prevLeitura.contador_pulseiras || 0)) : null
        )
      }
    });

    const anos = [...new Set(leituras.map(l => l.mes_referencia.substring(0, 4)))].sort((a,b) => b.localeCompare(a));
    if (!anos.includes(new Date().getFullYear().toString()) && anos.length > 0) anos.unshift(new Date().getFullYear().toString());
    
    const exibidos = processados.filter(l => l.mes_referencia.startsWith(anoFiltro));
    return { exibidos, anosDisponiveis: anos };
  }, [leituras, anoFiltro]);

  const isTodosSelecionados = dadosProcessados.exibidos.length > 0 && selecionados.length === dadosProcessados.exibidos.length;
  
  const handleSelecionarTudo = () => {
    if (isTodosSelecionados) {
      setSelecionados([]);
    } else {
      setSelecionados(dadosProcessados.exibidos.map(l => l.id));
    }
  }

  const handleSelecionarItem = (id) => {
    if (selecionados.includes(id)) {
      setSelecionados(selecionados.filter(item => item !== id));
    } else {
      setSelecionados([...selecionados, id]);
    }
  }

  return (
    <div className="space-y-6">
      
      <ModalConfirmacao 
        isOpen={modalConfirm.isOpen}
        onClose={() => setModalConfirm({ isOpen: false, idsParaExcluir: [] })}
        onConfirm={confirmarExclusao}
        titulo={modalConfirm.idsParaExcluir.length > 1 ? `Excluir ${modalConfirm.idsParaExcluir.length} Leituras` : "Excluir Leitura"}
        mensagem={modalConfirm.idsParaExcluir.length > 1 
          ? "Tem a certeza que deseja excluir TODOS os registros selecionados de uma vez? O cálculo do mês seguinte será afetado." 
          : "Tem a certeza que deseja excluir esta contagem? O cálculo do mês seguinte será afetado."}
        textoConfirmar="Sim, Excluir"
      />

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 items-start">
        <Calculator className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-sm font-bold text-blue-900">Cálculo de Consumo Inteligente</h4>
          <p className="text-xs text-blue-800 mt-1">O sistema agora calcula a produção automaticamente. Insira sempre o <strong>Totalizador Físico (Total que aparece no relatório BrAdmin)</strong>. O sistema mostrará esse total (em cinza pequeno) e o volume impresso no mês (em destaque).</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Printer className="text-blue-600" size={20} /> 
          Histórico e Consumo
        </h3>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {selecionados.length > 0 && (
            <button onClick={() => solicitarExclusao(selecionados)} className="animate-in zoom-in duration-200 flex-1 md:flex-none bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-red-200 text-sm">
              <Trash2 size={16} /> Excluir ({selecionados.length})
            </button>
          )}
          
          <select 
            value={anoFiltro} 
            onChange={(e) => { setAnoFiltro(e.target.value); setSelecionados([]); }} 
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-slate-200 font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 cursor-pointer"
          >
            {dadosProcessados.anosDisponiveis.length === 0 && <option value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</option>}
            {dadosProcessados.anosDisponiveis.map(ano => <option key={ano} value={ano}>Ano {ano}</option>)}
          </select>

          <button onClick={() => setModalAberto(true)} className="flex-1 md:flex-none w-full md:w-auto bg-blue-800 hover:bg-blue-900 text-white font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm text-sm active:scale-95">
            <Plus size={16} /> Lançar Mês
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse h-20 bg-slate-100 rounded-xl w-full"></div>
      ) : dadosProcessados.exibidos.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <Printer size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Nenhum fechamento registado para o ano de {anoFiltro}.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-4 w-12 text-center border-r border-slate-100">
                  <input 
                    type="checkbox" 
                    checked={isTodosSelecionados} 
                    onChange={handleSelecionarTudo}
                    className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-4 font-bold">Mês Referência</th>
                {!isTermica && <th className="px-4 py-4 font-bold text-center border-l border-slate-100">Consumo P&B</th>}
                {isColorida && <th className="px-4 py-4 font-bold text-center border-l border-slate-100 text-rose-600">Consumo Cor</th>}
                {isTermica && <th className="px-4 py-4 font-bold text-center border-l border-slate-100 text-emerald-600">Etiquetas/Pulseiras</th>}
                <th className="px-4 py-4 text-right border-l border-slate-100">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dadosProcessados.exibidos.map((leitura) => (
                <tr key={leitura.id} className={`hover:bg-slate-50 transition-colors group ${selecionados.includes(leitura.id) ? 'bg-blue-50/30' : ''}`}>
                  
                  <td className="px-4 py-3 text-center border-r border-slate-50">
                    <input 
                      type="checkbox" 
                      checked={selecionados.includes(leitura.id)} 
                      onChange={() => handleSelecionarItem(leitura.id)}
                      className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  <td className="px-4 py-3 font-black text-slate-700 uppercase">
                    {formatarMesAnoExtenso(leitura.mes_referencia)}
                  </td>
                  
                  {!isTermica && (
                    <td className="px-4 py-3 text-center border-l border-slate-50">
                      <div className="flex flex-col items-center gap-0.5">
                        {leitura.consumoPB.isBase ? (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title={leitura.consumoPB.tooltip}>BASE INICIAL</span>
                        ) : leitura.consumoPB.isReset ? (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title={leitura.consumoPB.tooltip}><AlertTriangle size={12} className="inline mr-1 mb-0.5" />Reset/Erro</span>
                        ) : (
                          <span className="text-sm font-black text-blue-700 bg-blue-50 px-3 py-1 rounded border border-blue-100 shadow-sm" title={leitura.consumoPB.tooltip}>+{leitura.consumoPB.valor} págs</span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">Total: {leitura.contador_pb || 0}</span>
                      </div>
                    </td>
                  )}

                  {isColorida && (
                    <td className="px-4 py-3 text-center border-l border-slate-50">
                      <div className="flex flex-col items-center gap-0.5">
                        {leitura.consumoCor.isBase ? (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title={leitura.consumoCor.tooltip}>BASE INICIAL</span>
                        ) : leitura.consumoCor.isReset ? (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title={leitura.consumoCor.tooltip}><AlertTriangle size={12} className="inline mr-1 mb-0.5" />Reset/Erro</span>
                        ) : (
                          <span className="text-sm font-black text-rose-700 bg-rose-50 px-3 py-1 rounded border border-rose-200 shadow-sm" title={leitura.consumoCor.tooltip}>+{leitura.consumoCor.valor} págs</span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">Total: {leitura.contador_cor || 0}</span>
                      </div>
                    </td>
                  )}

                  {isTermica && (
                    <td className="px-4 py-3 text-center border-l border-slate-50">
                       <div className="flex flex-col items-center gap-0.5">
                        {leitura.consumoTermica.isBase ? (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title={leitura.consumoTermica.tooltip}>BASE INICIAL</span>
                        ) : leitura.consumoTermica.isReset ? (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title={leitura.consumoTermica.tooltip}><AlertTriangle size={12} className="inline mr-1 mb-0.5" />Reset/Erro</span>
                        ) : (
                          <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded border border-emerald-200 shadow-sm" title={leitura.consumoTermica.tooltip}>+{leitura.consumoTermica.valor} un</span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">Total: {(leitura.contador_etiquetas || 0) + (leitura.contador_pulseiras || 0)}</span>
                      </div>
                    </td>
                  )}

                  <td className="px-4 py-3 text-right border-l border-slate-50">
                    <div className="flex justify-end gap-3 opacity-30 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditar(leitura)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Editar Totalizador"><Edit size={16} /></button>
                      <button onClick={() => solicitarExclusao(leitura.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Excluir Leitura"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{leituraEditando ? 'Editar Totalizador' : 'Lançar Totalizador do Mês'}</h3>
              <button onClick={fecharModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSalvar} className="p-5 space-y-5">
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-2">
                <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
                <p className="text-[11px] text-blue-800 font-medium leading-relaxed">Digite o valor absoluto retirado do relatório do equipamento. O sistema calculará o consumo mensal automaticamente subtraindo o valor registado no mês anterior.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><CalendarDays size={14}/> Mês da Leitura</label>
                <input required type="month" value={formData.mes_referencia} onChange={e => setFormData({...formData, mes_referencia: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>

              {!isTermica && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><FileText size={14}/> Leitura Total P&B</label>
                    <input type="number" min="0" placeholder="Total no painel" value={formData.contador_pb} onChange={e => setFormData({...formData, contador_pb: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                  </div>
                  
                  {isColorida && (
                    <div>
                      <label className="block text-sm font-bold text-rose-700 mb-1 flex items-center gap-2"><FileText size={14}/> Leitura Total Cor</label>
                      <input type="number" min="0" placeholder="Total no painel" value={formData.contador_cor} onChange={e => setFormData({...formData, contador_cor: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-rose-200 outline-none focus:ring-2 focus:ring-rose-500 bg-rose-50 text-rose-800 font-mono" />
                    </div>
                  )}
                </div>
              )}

              {isTermica && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Tag size={14}/> Total Etiquetas</label>
                    <input type="number" min="0" placeholder="0" value={formData.contador_etiquetas} onChange={e => setFormData({...formData, contador_etiquetas: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Tag size={14}/> Total Pulseiras</label>
                    <input type="number" min="0" placeholder="0" value={formData.contador_pulseiras} onChange={e => setFormData({...formData, contador_pulseiras: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={fecharModal} className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex-[2] bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-70 shadow-md">
                  {salvando ? 'A processar...' : (leituraEditando ? 'Atualizar Totalizador' : 'Salvar Totalizador')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}