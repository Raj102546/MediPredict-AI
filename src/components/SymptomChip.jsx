export default function SymptomChip({ label, selected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="px-3 py-1.5 text-sm rounded-full transition-all duration-150"
      style={{
        border: `1px solid ${selected ? 'var(--teal)' : 'var(--border)'}`,
        background: selected ? 'var(--teal-dim)' : 'var(--navy-card)',
        color: selected ? 'var(--teal-soft)' : 'var(--text-2)',
        fontWeight: selected ? 500 : 400,
        transform: selected ? 'scale(1.03)' : 'scale(1)',
      }}
    >
      {label}
    </button>
  )
}