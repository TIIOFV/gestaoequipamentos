import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Bell, Ticket, CheckCircle2 } from 'lucide-react'

export default function NotificacoesBell() {
  const { profile } = useAuth()
  const [notificacoes, setNotificacoes] = useState([])
  const [aberto, setAberto] = useState(false)
  
  const menuRef = useRef(null)
  const unreadAnterior = useRef(0)

  const unreadCount = notificacoes.filter(n => !n.lida).length

  const tocarSomPessoal = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      
      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(880, 0, 0.15); 
    } catch (e) {
      console.error("Erro no áudio:", e);
    }
  }, []);

  const buscarNotificacoes = useCallback(async (tocarSom = false) => {
    if (!profile?.id) return;
    
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('usuario_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
      
    if (data) {
      const unreadAtual = data.filter(n => !n.lida).length;
      if (tocarSom && unreadAtual > unreadAnterior.current) {
        tocarSomPessoal();
      }
      unreadAnterior.current = unreadAtual;
      setNotificacoes(data);
    }
  }, [profile?.id, tocarSomPessoal])

  useEffect(() => {
    if (!profile?.id) return;

    buscarNotificacoes(false);

    const intervalo = setInterval(() => {
      buscarNotificacoes(true);
    }, 10000);

    // 🚀 ORDEM CORRIGIDA: .on() ANTES de .subscribe() para evitar o erro do Supabase
    const canalNotifId = `sino-${profile.id}-${Date.now()}`
    const channelNotif = supabase
      .channel(canalNotifId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, (payload) => {
        if (payload.new && payload.new.usuario_id === profile.id) {
          buscarNotificacoes(true);
        }
      })
      .subscribe()

    const handleClickFora = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setAberto(false)
    }
    document.addEventListener('mousedown', handleClickFora)

    return () => {
      clearInterval(intervalo);
      supabase.removeChannel(channelNotif);
      document.removeEventListener('mousedown', handleClickFora)
    }
  }, [profile?.id, buscarNotificacoes])

  const marcarComoLida = async (id) => {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
  }

  const marcarTodasLidas = async () => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
    await supabase.from('notificacoes').update({ lida: true }).eq('usuario_id', profile.id).eq('lida', false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setAberto(!aberto)} 
        className="relative p-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-full transition-colors shadow-sm active:scale-95"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in">
            {unreadCount}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white border border-slate-200 rounded-[2rem] shadow-2xl overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Bell size={14} className="text-indigo-600" /> Notificações
            </h3>
            {unreadCount > 0 && (
              <button onClick={marcarTodasLidas} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                <CheckCircle2 size={12} /> Marcar lidas
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {notificacoes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold">Sem notificações novas.</div>
            ) : (
              notificacoes.map(notif => (
                <div 
                  key={notif.id} 
                  onClick={() => marcarComoLida(notif.id)}
                  className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!notif.lida ? 'bg-indigo-50/40' : 'opacity-75'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${!notif.lida ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Ticket size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs ${!notif.lida ? 'font-black text-slate-800' : 'font-bold text-slate-600'}`}>
                      {notif.titulo}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {notif.mensagem}
                    </p>
                    <span className="text-[9px] font-bold text-slate-400 mt-2 block uppercase tracking-wider">
                      {new Date(notif.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {!notif.lida && <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1 shadow-sm" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}