import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiagnosis } from '../context/DiagnosisContext'
import Navbar from '../components/Navbar'

const GENDERS   = ['Male', 'Female', 'Other']
const EXISTING  = ['Diabetes', 'Hypertension', 'Asthma', 'Heart disease', 'Thyroid', 'None']
const REGIONS   = ['North India', 'South India', 'East India', 'West India', 'Other']

export default function Onboarding() {
  const navigate = useNavigate()
  const { profile, setProfile } = useDiagnosis()
  const [errors, setErrors] = useState({})

  const update = (key, val) => setProfile(p => ({ ...p, [key]: val }))

  const toggleExisting = (item) => {
    const list = profile.existing.includes(item)
      ? profile.existing.filter(x => x !== item)
      : [...profile.existing, item]
    update('existing', list)
  }

  const validate = () => {
    const e = {}
    if (!profile.name.trim()) e.name = 'Required'
    if (!profile.age || profile.age < 1 || profile.age > 120) e.age = 'Enter valid age'
    if (!profile.gender) e.gender = 'Select gender'
    return e
  }

  const handleNext = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    navigate('/diagnose')
  }

  return (
    <div className="page-shell">
      <Navbar title="Your profile" subtitle="One-time setup · improves accuracy" backTo="/" />

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        {/* Name */}
        <div className="anim-fade-up">
          <p className="section-label">Full name</p>
          <input
            className="input-field"
            placeholder="e.g. Arjun Sharma"
            value={profile.name}
            onChange={e => update('name', e.target.value)}
          />
          {errors.name && <p className="text-xs mt-1" style={{ color: 'var(--red)' }}>{errors.name}</p>}
        </div>

        {/* Age + BMI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 anim-fade-up-1">
          <div>
            <p className="section-label">Age</p>
            <input
              className="input-field"
              type="number"
              placeholder="25"
              value={profile.age}
              onChange={e => update('age', e.target.value)}
            />
            {errors.age && <p className="text-xs mt-1" style={{ color: 'var(--red)' }}>{errors.age}</p>}
          </div>
          <div>
            <p className="section-label">BMI (optional)</p>
            <input
              className="input-field"
              type="number"
              placeholder="22.5"
              value={profile.bmi}
              onChange={e => update('bmi', e.target.value)}
            />
          </div>
        </div>

        {/* Gender */}
        <div className="anim-fade-up-2">
          <p className="section-label">Gender</p>
          <div className="flex gap-2">
            {GENDERS.map(g => (
              <button
                key={g}
                onClick={() => update('gender', g)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  border: `1px solid ${profile.gender === g ? 'var(--teal)' : 'var(--border)'}`,
                  background: profile.gender === g ? 'var(--teal-dim)' : 'var(--navy-card)',
                  color: profile.gender === g ? 'var(--teal-soft)' : 'var(--text-2)',
                }}
              >
                {g}
              </button>
            ))}
          </div>
          {errors.gender && <p className="text-xs mt-1" style={{ color: 'var(--red)' }}>{errors.gender}</p>}
        </div>

        {/* Region */}
        <div className="anim-fade-up-3">
          <p className="section-label">Region</p>
          <select
            className="input-field"
            value={profile.region}
            onChange={e => update('region', e.target.value)}
            style={{ appearance: 'none' }}
          >
            <option value="">Select region</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Pre-existing */}
        <div className="anim-fade-up-4">
          <p className="section-label">Pre-existing conditions</p>
          <div className="flex flex-wrap gap-2">
            {EXISTING.map(item => {
              const sel = profile.existing.includes(item)
              return (
                <button
                  key={item}
                  onClick={() => toggleExisting(item)}
                  className="px-3 py-1.5 rounded-full text-sm transition-all"
                  style={{
                    border: `1px solid ${sel ? 'var(--amber)' : 'var(--border)'}`,
                    background: sel ? 'var(--amber-dim)' : 'var(--navy-card)',
                    color: sel ? 'var(--amber)' : 'var(--text-2)',
                  }}
                >
                  {item}
                </button>
              )
            })}
          </div>
        </div>

        <div className="pt-2 anim-fade-up-5">
          <button className="btn-primary" onClick={handleNext}>
            Continue to diagnosis →
          </button>
        </div>
      </div>
    </div>
  )
}