import Groq from 'groq-sdk'

const API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const groq    = new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true })

// Using llama-3.3-70b-versatile (currently active model)
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

// ─── Retry helper — waits and retries on 429 ─────────────────────────────────
const withRetry = async (fn, retries = 3, delayMs = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      const is429 = err?.status === 429
                 || err?.message?.includes('429')
                 || err?.message?.includes('quota')
                 || err?.message?.includes('Too Many Requests')

      if (is429 && i < retries - 1) {
        const wait = delayMs * (i + 1) // 2s → 4s → 6s
        console.warn(`[Gemini] 429 rate limit — retrying in ${wait}ms (attempt ${i + 1}/${retries})`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }

      // Not a 429, or out of retries — throw
      throw err
    }
  }
}

/**
 * Single-turn prompt — returns plain text
 * Used for quiz generation and prediction
 */
export const geminiPrompt = async (prompt, systemInstruction = '') => {
  return withRetry(async () => {
    const message = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2048,
    })
    return message.choices[0]?.message?.content || ''
  })
}

/**
 * Create a persistent chat session
 * Used for the Phase 1 chat window
 */
export const createChatSession = (systemInstruction = '') => {
  return {
    history: [],
    systemInstruction,
  }
}

/**
 * Send a message in a chat session — with retry on 429
 * Use this instead of session.sendMessage() directly
 */
export const sendChatMessage = async (session, message) => {
  return withRetry(async () => {
    const messages = [
      ...(session.systemInstruction ? [{ role: 'system', content: session.systemInstruction }] : []),
      ...session.history,
      { role: 'user', content: message }
    ]
    
    const response = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    })
    
    const assistantMessage = response.choices[0]?.message?.content || ''
    
    // Store in history for next turn
    session.history.push({ role: 'user', content: message })
    session.history.push({ role: 'assistant', content: assistantMessage })
    
    return assistantMessage
  })
}

/**
 * Parse JSON safely from Gemini response
 */
export const parseGeminiJSON = (raw) => {
  try {
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()
    return JSON.parse(cleaned)
  } catch (e) {
    console.error('[Gemini] JSON parse failed. Raw response:', raw)
    return null
  }
}

export { groq, DEFAULT_MODEL }