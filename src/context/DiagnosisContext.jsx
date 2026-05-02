import { createContext, useContext, useState } from 'react'

const Ctx = createContext(null)

export function DiagnosisProvider({ children }) {
  const [profile, setProfile] = useState({
    name: '', age: '', gender: '', bmi: '', region: '', existing: [],
  })
  const [vitals, setVitals] = useState({
    temperature: '', bp: '', heartRate: '', spo2: '',
  })
  const [symptoms, setSymptoms]   = useState([])
  const [severity, setSeverity]   = useState('')
  const [duration, setDuration]   = useState('')
  const [candidates, setCandidates] = useState([])
  const [questions, setQuestions]   = useState([])
  const [answers, setAnswers]       = useState({})
  const [currentQ, setCurrentQ]     = useState(0)
  const [diagnosis, setDiagnosis]   = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  const reset = () => {
    setProfile({ name:'', age:'', gender:'', bmi:'', region:'', existing:[] })
    setVitals({ temperature:'', bp:'', heartRate:'', spo2:'' })
    setSymptoms([]); setSeverity(''); setDuration('')
    setCandidates([]); setQuestions([]); setAnswers({})
    setCurrentQ(0); setDiagnosis(null)
    setLoading(false); setError(null)
  }

  return (
    <Ctx.Provider value={{
      profile, setProfile,
      vitals, setVitals,
      symptoms, setSymptoms,
      severity, setSeverity,
      duration, setDuration,
      candidates, setCandidates,
      questions, setQuestions,
      answers, setAnswers,
      currentQ, setCurrentQ,
      diagnosis, setDiagnosis,
      loading, setLoading,
      error, setError,
      reset,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useDiagnosis = () => useContext(Ctx)