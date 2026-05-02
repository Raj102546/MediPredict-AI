import { useNavigate } from 'react-router-dom'

export default function Navbar({ title, subtitle, backTo, rightSlot }) {
  const navigate = useNavigate()

  return (
    <nav
      className="sticky top-0 z-50 flex items-center gap-3 px-5 py-4" 
      style={{ background: 'var(--navy)', borderBottom: '1px solid var(--border)' }}
    >
      {backTo && (
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center justify-center rounded-xl shrink-0 transition-colors"
          style={{
            width: 36, height: 36,
            background: 'var(--navy-card)',
            border: '1px solid var(--border)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="font-syne font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>{subtitle}</p>
        )}
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </nav>
  )
}