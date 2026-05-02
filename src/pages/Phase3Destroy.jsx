import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiagnosis } from '../context/DiagnosisContext'
import { runDestroy } from '../api/predictApi'
import Navbar from '../components/Navbar'
import PhaseProgressBar from '../components/PhaseProgressBar'

const TABS = ['Medicines', 'Diet', 'Exercise', 'Precautions']

// Fallback sample when no real API data yet
const SAMPLE = {
  disease: 'Dengue Fever',
  confidence: 91,
  bodySystem: 'Infectious — vector-borne',
  drivers: ['High fever', 'Joint pain', 'Rash', 'Fatigue', 'Low platelet sign'],
  ensemble: { rf: 93, xgb: 90, nb: 88, mlp: 92 },
  treatment: {
    medicines: [
      { name: 'Paracetamol 500mg', dose: 'Every 6 hrs · max 4g/day', warning: 'Avoid Aspirin & NSAIDs' },
      { name: 'ORS solution',       dose: '2–3 litres daily',          warning: null },
      { name: 'Vitamin C 1000mg',   dose: 'Once daily',                warning: null },
    ],
    diet: [
      { name: 'Papaya leaf juice', note: 'Proven to increase platelet count' },
      { name: 'Coconut water',     note: '2–3 glasses daily · electrolytes' },
      { name: 'Light khichdi',     note: 'Easy to digest, high protein' },
    ],
    exercise: [
      { name: 'Complete bed rest',    note: 'Days 1–4 · no physical exertion' },
      { name: 'Gentle stretching',    note: 'Day 5+ · 5 min morning stretch only' },
      { name: 'Short walks',          note: 'Day 7+ · 10–15 min light walking' },
    ],
    precautions: [
      'Use mosquito repellent and nets at all times',
      'Monitor for warning signs: bleeding gums, severe abdominal pain',
      'Get blood platelet count checked every 24 hours',
      'Seek ER immediately if platelets drop below 20,000',
    ],
  },
}

export default function Phase3Destroy() {
  const navigate = useNavigate()
  const {
    candidates, answers, profile,
    diagnosis, setDiagnosis,
    loading, setLoading,
    reset,
  } = useDiagnosis()

  const [activeTab, setActiveTab] = useState('Medicines')
  const [apiError, setApiError]   = useState(null)

  const data = diagnosis || SAMPLE

  useEffect(() => {
    if (diagnosis) return
    if (!candidates.length) { setDiagnosis(SAMPLE); return }

    setLoading(true)
    runDestroy({ candidates, allAnswers: answers, profile })
      .then(res => setDiagnosis(res))
      .catch(err => { setApiError(err.message); setDiagnosis(SAMPLE) })
      .finally(() => setLoading(false))
  }, [diagnosis, candidates.length, answers, profile, setDiagnosis, setLoading])

  const confColor =
    data.confidence >= 80 ? 'var(--green)' :
    data.confidence >= 55 ? 'var(--amber)' : 'var(--red)'

  return (
    <div className="page-shell">
      <Navbar
        title="Phase 3 — Destroy"
        subtitle="Diagnosis confirmed"
        backTo="/contain"
        rightSlot={<span className="badge badge-green">Complete</span>}
      />
      <PhaseProgressBar current={3} />

      <div className="flex-1 overflow-y-auto pb-8">

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-12 h-12 rounded-full"
              style={{ border: '2px solid var(--teal-dim)', borderTop: '2px solid var(--teal)', animation: 'spin 0.9s linear infinite' }}
            />
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Running final ensemble…</p>
            <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && (
          <>
            {/* Diagnosis card */}
            <div className="mx-5 mt-5 p-5 rounded-2xl anim-fade-up" style={{ background: 'var(--navy-card)', border: '1px solid var(--border-2)' }}>
              <div className="badge badge-green mb-3">Primary diagnosis</div>
              <h1 className="font-syne font-bold text-2xl mb-1" style={{ color: 'var(--text-1)' }}>
                {data.disease}
              </h1>
              <p className="text-xs mb-5" style={{ color: 'var(--text-2)' }}>{data.bodySystem}</p>

              {/* Confidence */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>Confidence</p>
                  <p className="font-syne font-bold text-3xl" style={{ color: confColor }}>
                    {data.confidence}%
                  </p>
                </div>
                <div className="flex-1">
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--navy-light)' }}>
                    <div
                      className="h-2 rounded-full anim-bar"
                      style={{ width: `${data.confidence}%`, background: confColor }}
                    />
                  </div>
                  {data.ensemble && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>
                      RF {data.ensemble.rf}% · XGB {data.ensemble.xgb}% · NB {data.ensemble.nb}% · MLP {data.ensemble.mlp}%
                    </p>
                  )}
                </div>
              </div>

              {/* Drivers */}
              <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Key drivers</p>
              <div className="flex flex-wrap gap-2">
                {(data.drivers || []).map(d => (
                  <span
                    key={d}
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: 'var(--teal-dim)', color: 'var(--teal-soft)' }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Treatment plan */}
            <div className="mx-5 mt-5 anim-fade-up-1">
              <p className="section-label">Treatment plan</p>

              {/* Tabs */}
              <div
                className="flex rounded-xl overflow-hidden mb-4"
                style={{ border: '1px solid var(--border)' }}
              >
                {TABS.map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-2.5 text-xs font-medium transition-all"
                    style={{
                      background: activeTab === tab ? 'var(--teal-dim)' : 'var(--navy-card)',
                      color: activeTab === tab ? 'var(--teal-soft)' : 'var(--text-3)',
                      borderRight: i < TABS.length - 1 ? '1px solid var(--border)' : 'none',
                      fontFamily: 'Syne, sans-serif',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex flex-col gap-3 anim-fade-in">
                {activeTab === 'Medicines' && (data.treatment?.medicines || []).map((m, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--navy-card)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--teal-dim)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.2" strokeLinecap="round">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{m.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{m.dose}</p>
                        {m.warning && (
                          <p className="text-xs mt-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
                            ⚠ {m.warning}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {activeTab === 'Diet' && (data.treatment?.diet || []).map((d, i) => (
                  <div key={i} className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'var(--navy-card)', border: '1px solid var(--border)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--green-dim)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{d.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{d.note}</p>
                    </div>
                  </div>
                ))}

                {activeTab === 'Exercise' && (data.treatment?.exercise || []).map((e, i) => (
                  <div key={i} className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'var(--navy-card)', border: '1px solid var(--border)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--teal-dim)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{e.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{e.note}</p>
                    </div>
                  </div>
                ))}

                {activeTab === 'Precautions' && (data.treatment?.precautions || []).map((p, i) => (
                  <div
                    key={i}
                    className="px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'var(--amber-dim)', borderLeft: '3px solid var(--amber)', color: 'var(--text-2)' }}
                  >
                    {p}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mx-5 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 anim-fade-up-2">
              <button
                className="btn-primary"
                style={{ background: 'var(--green)', fontSize: 13 }}
                onClick={() => window.print()}
              >
                Download PDF
              </button>
              <button
                className="btn-ghost"
                style={{ fontSize: 13 }}
                onClick={() => { reset(); navigate('/') }}
              >
                New diagnosis
              </button>
            </div>

            {apiError && (
              <p className="mx-5 mt-3 text-xs p-3 rounded-xl" style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
                API error — showing sample data. {apiError}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}