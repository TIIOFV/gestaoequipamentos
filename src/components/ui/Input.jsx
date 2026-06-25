export function Input({ className = '', ...props }) {
  return (
    <input
      className={`px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm transition-all disabled:opacity-50 disabled:bg-slate-50 ${className}`}
      {...props}
    />
  )
}