import axios from 'axios'

// ─── Base URL ─────────────────────────────────────────────────────────────────
// In your .env file at project root: VITE_API_URL=http://localhost:8000
// If no .env exists, falls back to localhost:8000
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Fix 1: needed if your FastAPI/Flask backend is on a different port (CORS)
  withCredentials: false,
})

// ─── Request interceptor — logs every outgoing request ───────────────────────
API.interceptors.request.use(
  config => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data)
    return config
  },
  err => Promise.reject(err)
)

// ─── Response interceptor — normalises all errors ────────────────────────────
API.interceptors.response.use(
  res => {
    // Fix 2: some backends wrap data in { data: ... } or { result: ... }
    // Unwrap intelligently — return res.data always
    return res.data
  },
  err => {
    if (err.code === 'ERR_NETWORK') {
      // Fix 3: backend is not running or wrong port
      console.error('[API] Network error — is your backend running?', `Expected: ${BASE_URL}`)
      return Promise.reject(new Error(
        `Cannot reach backend at ${BASE_URL}. Make sure your server is running.`
      ))
    }

    if (err.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Backend took too long to respond.'))
    }

    if (err.response) {
      // Fix 4: handle different error shapes from FastAPI / Flask / Express
      const status = err.response.status
      const detail =
        err.response.data?.detail ||      // FastAPI default
        err.response.data?.message ||     // Express / custom
        err.response.data?.error ||       // common pattern
        err.response.data ||              // raw string
        err.message ||
        'Server error'

      console.error(`[API] ${status} error:`, detail)

      if (status === 404) return Promise.reject(new Error(`Endpoint not found: ${err.config?.url}`))
      if (status === 422) return Promise.reject(new Error(`Validation error: ${JSON.stringify(detail)}`))
      if (status === 500) return Promise.reject(new Error('Internal server error. Check your backend logs.'))

      return Promise.reject(new Error(typeof detail === 'string' ? detail : JSON.stringify(detail)))
    }

    return Promise.reject(new Error(err.message || 'Unknown error'))
  }
)

// ─── Static preview payloads (for UI dev without backend) ────────────────────
export const previewDiagnosis = {
  symptoms: ['Fever', 'Cough', 'Fatigue'],
  vitals: { temperature: '100.8', bp: '118/76', heartRate: '88', spo2: '97' },
  profile: {
    name: 'Arjun Sharma', age: '28', gender: 'Male',
    bmi: '22.7', region: 'North India', existing: ['Asthma'],
  },
  severity: 'moderate',
  duration: '2–3 days',
}

// ─── Mock responses — used when VITE_USE_MOCK=true in .env ───────────────────
// Set VITE_USE_MOCK=true in your .env to develop UI without any backend
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const delay = (ms) => new Promise(r => setTimeout(r, ms))

const MOCK_DIAGNOSE = {
  candidates: [
    { disease: 'Dengue Fever',   confidence: 74, bodySystem: 'Infectious' },
    { disease: 'Malaria',        confidence: 51, bodySystem: 'Infectious' },
    { disease: 'Typhoid',        confidence: 34, bodySystem: 'Infectious' },
    { disease: 'Influenza',      confidence: 22, bodySystem: 'Respiratory' },
    { disease: 'Common Cold',    confidence: 14, bodySystem: 'Respiratory' },
  ],
  questions: [
    {
      id: 'q1',
      text: 'Do you have a skin rash or red spots anywhere on your body?',
      options: [
        { label: 'Yes — prominent red rash', value: 'yes_prominent' },
        { label: 'Yes — faint or mild spots', value: 'yes_mild' },
        { label: 'No rash at all',           value: 'no' },
        { label: 'Not sure',                 value: 'unsure' },
      ],
    },
    {
      id: 'q2',
      text: 'Does your fever come in cycles or waves?',
      options: [
        { label: 'Yes, every few days', value: 'cyclic' },
        { label: 'No, it\'s continuous', value: 'continuous' },
        { label: 'Comes and goes randomly', value: 'random' },
      ],
    },
  ],
}

const MOCK_CONTAIN = (payload) => ({
  done: payload.questionIndex >= 1,
  candidates: [
    { disease: 'Dengue Fever', confidence: 89, bodySystem: 'Infectious' },
    { disease: 'Malaria',      confidence: 31, bodySystem: 'Infectious' },
    { disease: 'Typhoid',      confidence: 12, bodySystem: 'Infectious' },
  ],
  nextQuestion: payload.questionIndex < 1 ? {
    id: 'q3',
    text: 'Have you been to a forested or flood-prone area recently?',
    options: [
      { label: 'Yes — forested area',  value: 'forest' },
      { label: 'Yes — flood area',     value: 'flood' },
      { label: 'No',                   value: 'no' },
    ],
  } : null,
})

const MOCK_DESTROY = {
  disease: 'Dengue Fever',
  confidence: 91,
  bodySystem: 'Infectious — vector-borne (Aedes mosquito)',
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
      { name: 'Complete bed rest', note: 'Days 1–4 · no physical exertion' },
      { name: 'Gentle stretching', note: 'Day 5+ · 5 min morning stretch only' },
      { name: 'Short walks',       note: 'Day 7+ · 10–15 min light walking' },
    ],
    precautions: [
      'Use mosquito repellent and nets at all times',
      'Monitor for warning signs: bleeding gums, severe abdominal pain',
      'Get blood platelet count checked every 24 hours',
      'Seek ER immediately if platelets drop below 20,000',
    ],
  },
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Phase 1 — Diagnose
 * Send:    { symptoms[], vitals{}, profile{}, severity, duration }
 * Receive: { candidates: [{ disease, confidence, bodySystem }], questions[] }
 */
export const runDiagnose = async (payload) => {
  if (USE_MOCK) {
    await delay(1200)
    return MOCK_DIAGNOSE
  }

  // Fix 5: validate payload before sending so you get clear errors
  if (!payload.symptoms?.length) throw new Error('No symptoms provided')
  if (!payload.severity)         throw new Error('Severity is required')
  if (!payload.duration)         throw new Error('Duration is required')

  return API.post('/predict/diagnose', payload)
}

/**
 * Phase 2 — Contain
 * Send:    { candidates[], currentAnswers{}, questionIndex, profile, symptoms, vitals, severity, duration }
 * Receive: { candidates[], nextQuestion: { id, text, options[] } | null, done: bool }
 */
export const runContain = async (payload) => {
  if (USE_MOCK) {
    await delay(800)
    return MOCK_CONTAIN(payload)
  }

  if (!payload.candidates?.length) throw new Error('No candidates to narrow')

  return API.post('/predict/contain', payload)
}

/**
 * Phase 3 — Destroy
 * Send:    { candidates[], allAnswers{}, profile{} }
 * Receive: { disease, confidence, drivers[], treatment: { medicines[], diet[], exercise[], precautions[] } }
 */
export const runDestroy = async (payload) => {
  if (USE_MOCK) {
    await delay(1500)
    return MOCK_DESTROY
  }

  if (!payload.candidates?.length) throw new Error('No candidates for final prediction')

  return API.post('/predict/destroy', payload)
}

/**
 * Health check — call this on app start to verify backend is reachable
 * Usage: import { checkBackendHealth } from './api/predictApi'
 *        checkBackendHealth().then(ok => console.log('Backend alive:', ok))
 */
export const checkBackendHealth = async () => {
  if (USE_MOCK) return true
  try {
    await API.get('/health')
    console.log('[API] Backend is reachable ✓')
    return true
  } catch {
    console.warn('[API] Backend unreachable — running in degraded mode')
    return false
  }
}