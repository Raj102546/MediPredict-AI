export default function VitalCard({ label, unit, value, onChange, placeholder = '—' }) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1 transition-all"
      style={{ background: 'var(--navy-light)', border: '1px solid var(--border)' }}
    >
      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</span>
      <div className="flex items-baseline gap-1.5">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent outline-none font-syne font-semibold text-xl flex-1 min-w-0"
          style={{ color: value ? 'var(--text-1)' : 'var(--text-3)' }}
        />
        <span className="text-xs shrink-0" style={{ color: 'var(--text-3)' }}>{unit}</span>
      </div>
    </div>
  )
}