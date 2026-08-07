import { AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { TrendingUp, PieChart as PieIcon, Printer } from 'lucide-react'

export default function DashboardGraficos({ graficos, moduloAtivo }) {
  // Cores Customizadas e vibrantes
  const colorPB = "#0ea5e9";      // sky-500
  const colorCor = "#f43f5e";     // rose-500
  const colorTermica = "#10b981"; // emerald-500

  // Custom Tooltip super elegante
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-slate-100 shadow-xl">
          <p className="font-black text-slate-800 mb-2 border-b border-slate-100 pb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-3 py-1 text-sm">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
              <span className="font-bold text-slate-500 flex-1">{entry.name}:</span>
              <span className="font-black text-slate-800">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico 1: Área */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[380px] hover:shadow-md transition-shadow">
          <h3 className="font-black text-slate-800 flex items-center gap-2 mb-6"><TrendingUp size={20} className="text-blue-500" /> Volume de OS Registradas (6 Meses)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="99%" height="100%">
              <AreaChart data={graficos.tendencia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="corOS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 600}} dx={-10} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="OS Registradas" stroke="#3b82f6" strokeWidth={4} fill="url(#corOS)" activeDot={{ r: 8, strokeWidth: 4, stroke: '#fff', fill: '#2563eb' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Donut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[380px] hover:shadow-md transition-shadow">
          <h3 className="font-black text-slate-800 mb-2 flex items-center gap-2"><PieIcon size={20} className="text-emerald-500" /> Status do Parque</h3>
          <div className="flex-1 w-full min-h-0 relative">
            {graficos.statusParque.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">Nenhum equipamento neste ambiente</div>
            ) : (
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie data={graficos.statusParque} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                    {graficos.statusParque.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '20px', fontWeight: '700', color: '#64748b'}} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico 3: Barras Empilhadas (Impressoras) */}
      {moduloAtivo === 'impressoras' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[400px] hover:shadow-md transition-shadow relative overflow-hidden">
          {/* Detalhe visual premium (fio de cor no topo) */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-rose-400 to-emerald-400"></div>
          
          <h3 className="font-black text-slate-800 flex items-center gap-2 mb-8 mt-2"><Printer size={20} className="text-slate-400" /> Evolução de Consumo Faturável (6 Meses)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={graficos.tendenciaImpressoes} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 600}} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                <Legend wrapperStyle={{fontSize: '13px', paddingTop: '15px', fontWeight: '700'}} iconType="circle" />
                
                {/* 🚀 O truque do radius={[4,4,0,0]} faz as barras parecerem pílulas modernas */}
                <Bar dataKey="P&B" stackId="a" fill={colorPB} />
                <Bar dataKey="Cor" stackId="a" fill={colorCor} />
                <Bar dataKey="Térmica" stackId="a" fill={colorTermica} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}