import { AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { TrendingUp, PieChart as PieIcon, Printer } from 'lucide-react'

export default function DashboardGraficos({ graficos, moduloAtivo }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[350px]">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><TrendingUp size={18} className="text-blue-500" /> Volume de OS Registradas (6 Meses)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="99%" height="100%">
              <AreaChart data={graficos.tendencia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="corOS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#1e293b', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="OS Registradas" stroke="#3b82f6" strokeWidth={3} fill="url(#corOS)" activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[350px]">
          <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><PieIcon size={18} className="text-emerald-500" /> Status do Parque</h3>
          <div className="flex-1 w-full min-h-0 relative">
            {graficos.statusParque.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">Nenhum equipamento neste ambiente</div>
            ) : (
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie data={graficos.statusParque} innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                    {graficos.statusParque.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Equipamentos']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '20px', fontWeight: '500', color: '#475569'}} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {moduloAtivo === 'impressoras' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[350px] border-t-4 border-t-purple-500">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Printer size={18} className="text-purple-500" /> Volume de Impressões e Etiquetas (Últimos 6 Meses)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={graficos.tendenciaImpressoes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                {/* Barras empilhadas (stackId="a" agrupa todas na mesma coluna) */}
                <Bar dataKey="Páginas P&B" stackId="a" fill="#334155" />
                <Bar dataKey="Páginas Cor" stackId="a" fill="#c084fc" />
                <Bar dataKey="Etiquetas" stackId="a" fill="#10b981" />
                <Bar dataKey="Pulseiras" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}