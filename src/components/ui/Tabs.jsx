import React from 'react'

export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    // O w-full garante que ocupa o espaço, e a classe de scrollbar esconde a barra nativa
    <div className="w-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="inline-flex bg-slate-100/80 p-1.5 rounded-2xl gap-1 min-w-max border border-slate-200/60 shadow-inner">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                shrink-0 px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 flex items-center gap-2
                ${isActive 
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50 scale-100' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 scale-95 hover:scale-100 border border-transparent'}
              `}
            >
              {tab.icon && <span className="mb-0.5">{tab.icon}</span>}
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}