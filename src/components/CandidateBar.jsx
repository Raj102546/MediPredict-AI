export default function CandidateBar({ disease, confidence, rank, fading }) {
  const colors = ['var(--teal)', 'var(--amber)', '#A78BFA', '#34D399', '#F87171']
  const color  = colors[rank] || 'var(--text-2)'

  return (
    <div
      className="p-3 rounded-xl transition-all duration-500"
      style={{
        background: 'var(--navy-card)',
        border: `1px solid ${rank === 0 && !fading ? 'var(--border-2)' : 'var(--border)'}`,
        opacity: fading ? 0.3 : 1,
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium" style={{ color: rank === 0 ? 'var(--text-1)' : 'var(--text-2)' }}>
          {disease}
        </span>
        <span className="text-sm font-syne font-semibold" style={{ color }}>
          {confidence}%
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--navy-light)' }}>
        <div
          className="h-1 rounded-full anim-bar"
          style={{ width: `${confidence}%`, background: color, transition: 'width .6s ease' }}
        />
      </div>
    </div>
  )
}