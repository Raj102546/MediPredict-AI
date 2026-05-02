import { useNavigate } from 'react-router-dom'
import { useDiagnosis } from '../context/DiagnosisContext'

const FEATURES = [
  { color: 'var(--teal)',  label: 'AI differential diagnosis', sub: 'Top 5 candidates ranked by confidence' },
  { color: 'var(--amber)', label: 'Smart follow-up questions', sub: 'Bayesian narrowing across 3 phases' },
  { color: 'var(--green)', label: 'Full treatment plan',       sub: 'Medicine, diet, exercises, roadmap' },
  { color: 'var(--red)',   label: 'Emergency red flag system', sub: 'Instant critical alert detection' },
]

const STATS = [
  { num: '41+',  label: 'diseases' },
  { num: '95%',  label: 'accuracy' },
  { num: '132',  label: 'symptoms' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { reset } = useDiagnosis()

  const handleStart = () => { reset(); navigate('/onboarding') }

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 gap-3 sm:gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--teal-dim)', border: '1px solid var(--border-2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.2" strokeLinecap="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <span className="font-syne font-bold text-base tracking-tight" style={{ color: 'var(--text-1)' }}>
            Prognos<span style={{ color: 'var(--teal)' }}>AI</span>
          </span>
        </div>
        <span className="badge badge-teal">v1.0 beta</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="px-5 pt-10 pb-6 anim-fade-up">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: 'var(--teal-dim)', border: '1px solid var(--border-2)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.8" strokeLinecap="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <h1 className="font-syne font-bold text-3xl leading-tight mb-3" style={{ color: 'var(--text-1)' }}>
            Your AI<br/>health companion
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Clinical-grade disease prediction powered by a 3-phase AI reasoning engine — just like a real doctor.
          </p>
        </div>

        {/* Phase strip */}
        <div className="mx-5 mb-6 anim-fade-up-1">
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {[
              { label: 'Diagnose', color: 'var(--teal)',  sub: 'Top 5 candidates' },
              { label: 'Contain',  color: 'var(--amber)', sub: 'Narrow down' },
              { label: 'Destroy',  color: 'var(--green)', sub: 'Final verdict' },
            ].map((p, i) => (
              <div
                key={p.label}
                className="flex-1 py-3 px-2 text-center"
                style={{
                  background: 'var(--navy-card)',
                  borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div className="font-syne font-semibold text-xs mb-0.5" style={{ color: p.color }}>{p.label}</div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>{p.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mx-5 mb-6 anim-fade-up-2">
          {STATS.map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--navy-card)', border: '1px solid var(--border)' }}>
              <div className="font-syne font-bold text-xl" style={{ color: 'var(--teal)' }}>{s.num}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="px-5 mb-8 flex flex-col gap-3 anim-fade-up-3">
          {FEATURES.map(f => (
            <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--navy-card)', border: '1px solid var(--border)' }}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{f.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-5 pb-10 flex flex-col gap-3 anim-fade-up-4">
          <button className="btn-primary" onClick={handleStart}>
            Start diagnosis →
          </button>
          <button className="btn-ghost" onClick={() => navigate('/destroy')}>
            View sample report
          </button>
        </div>
      </div>
    </div>
  )
}