import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = 'AIzaSyCBeNESDAc0U82H07SnGUG_0yGShush9Nc'
const genAI   = new GoogleGenerativeAI(API_KEY)

// gemini-1.5-flash-latest → higher free quota than gemini-2.0-flash
const DEFAULT_MODEL = 'gemini-1.5-flash-latest'

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
    const model = genAI.getGenerativeModel({
      model: DEFAULT_MODEL,
      ...(systemInstruction ? { systemInstruction } : {}),
    })
    const result = await model.generateContent(prompt)
    return result.response.text()
  })
}

/**
 * Create a persistent chat session
 * Used for the Phase 1 chat window
 */
export const createChatSession = (systemInstruction = '') => {
  const model = genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    ...(systemInstruction ? { systemInstruction } : {}),
  })
  return model.startChat({ history: [] })
}

/**
 * Send a message in a chat session — with retry on 429
 * Use this instead of session.sendMessage() directly
 */
export const sendChatMessage = async (session, message) => {
  return withRetry(async () => {
    const result = await session.sendMessage(message)
    return result.response.text()
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

export { genAI, DEFAULT_MODEL }