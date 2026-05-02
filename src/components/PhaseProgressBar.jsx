const PHASES = [
  { key: 1, label: 'Diagnose', color: 'var(--teal)' },
  { key: 2, label: 'Contain',  color: 'var(--amber)' },
  { key: 3, label: 'Destroy',  color: 'var(--green)' },
]

export default function PhaseProgressBar({ current }) {
  return (
    <div
      className="flex items-center px-5 py-3 gap-1"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {PHASES.map((p, i) => {
        const done   = p.key < current
        const active = p.key === current
        const color  = done ? 'var(--green)' : active ? p.color : 'var(--text-3)'

        return (
          <div key={p.key} className="flex items-center gap-1" style={{ flex: i < 2 ? '1' : 'none' }}>
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: color,
                  boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${p.color} 25%, transparent)` : 'none',
                  transition: 'all .3s',
                }}
              />
              <span
                className="text-xs font-medium"
                style={{ color, fontFamily: 'Syne, sans-serif', transition: 'color .3s' }}
              >
                {p.label}
              </span>
            </div>
            {i < 2 && (
              <div
                className="flex-1 mx-2"
                style={{
                  height: 1,
                  background: done
                    ? 'linear-gradient(90deg, var(--green), var(--teal))'
                    : 'var(--border)',
                  transition: 'background .4s',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}