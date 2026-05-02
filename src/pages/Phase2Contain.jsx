import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiagnosis } from '../context/DiagnosisContext'
import { runContain } from '../api/predictApi'
import Navbar from '../components/Navbar'
import PhaseProgressBar from '../components/PhaseProgressBar'
import CandidateBar from '../components/CandidateBar'

export default function Phase2Contain() {
  const navigate = useNavigate()
  const {
    candidates, setCandidates,
    questions, setQuestions,
    answers, setAnswers,
    currentQ, setCurrentQ,
    profile, symptoms, vitals, severity, duration,
    setDiagnosis,
    loading, setLoading,
  } = useDiagnosis()

  const [selected, setSelected] = useState(null)
  const [apiError, setApiError] = useState(null)

  const question = questions[currentQ] || null
  const totalQ   = questions.length || 1
  const progress = Math.round(((currentQ) / totalQ) * 100)

  // Guard — if no candidates, go back
  useEffect(() => {
    if (!candidates.length) navigate('/diagnose')
  }, [candidates.length, navigate])

  const handleAnswer = async (optionValue) => {
    setSelected(optionValue)
    const newAnswers = { ...answers, [question.id]: optionValue }
    setAnswers(newAnswers)

    setLoading(true)
    setApiError(null)
    try {
      const res = await runContain({
        candidates,
        currentAnswers: newAnswers,
        questionIndex: currentQ,
        profile, symptoms, vitals, severity, duration,
      })

      setCandidates(res.candidates || candidates)

      if (res.done || currentQ >= questions.length - 1) {
        navigate('/destroy')
      } else {
        if (res.nextQuestion) {
          setQuestions(prev => {
            const updated = [...prev]
            updated[currentQ + 1] = res.nextQuestion
            return updated
          })
        }
        setTimeout(() => {
          setCurrentQ(q => q + 1)
          setSelected(null)
        }, 700)
      }
    } catch (err) {
      setApiError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const skip = () => {
    if (currentQ >= questions.length - 1) navigate('/destroy')
    else { setCurrentQ(q => q + 1); setSelected(null) }
  }

  return (
    <div className="page-shell">
      <Navbar
        title="Phase 2 — Contain"
        subtitle="Narrowing candidates"
        backTo="/diagnose"
        rightSlot={
          <span className="badge badge-amber">
            Q {currentQ + 1}/{totalQ}
          </span>
        }
      />
      <PhaseProgressBar current={2} />

      {/* Progress bar */}
      <div className="h-0.5" style={{ background: 'var(--border)' }}>
        <div
          className="h-0.5 transition-all duration-500"
          style={{ width: `${progress}%`, background: 'var(--amber)' }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">

        {/* Candidate list */}
        <div className="anim-fade-up">
          <p className="section-label">Live candidates</p>
          <div className="flex flex-col gap-2">
            {candidates.map((c, i) => (
              <CandidateBar
                key={c.disease}
                disease={c.disease}
                confidence={c.confidence}
                rank={i}
                fading={c.confidence < 25}
              />
            ))}
          </div>
        </div>

        {/* Question */}
        {question && (
          <div
            className="p-4 rounded-xl anim-fade-in"
            style={{
              background: 'var(--navy-card)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--amber)',
            }}
          >
            <div className="badge badge-amber mb-3">AI is asking</div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-1)' }}>
              {question.text}
            </p>
            <div className="flex flex-col gap-2">
              {question.options.map(opt => {
                const isSelected = selected === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => !selected && !loading && handleAnswer(opt.value)}
                    disabled={!!selected || loading}
                    className="text-left px-4 py-3 rounded-xl text-sm transition-all"
                    style={{
                      border: `1px solid ${isSelected ? 'var(--amber)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--amber-dim)' : 'var(--navy-light)',
                      color: isSelected ? 'var(--amber)' : 'var(--text-2)',
                      fontWeight: isSelected ? 500 : 400,
                      opacity: selected && !isSelected ? 0.4 : 1,
                      cursor: selected ? 'default' : 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {apiError && (
          <p className="text-xs p-3 rounded-xl" style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
            {apiError}
          </p>
        )}

        <div className="flex gap-3 mt-2">
          <button className="btn-ghost" onClick={skip} style={{ flex: 1 }}>
            Skip question
          </button>
          <button
            className="btn-primary"
            onClick={() => navigate('/destroy')}
            style={{ flex: 1 }}
          >
            Final diagnosis →
          </button>
        </div>
      </div>
    </div>
  )
}