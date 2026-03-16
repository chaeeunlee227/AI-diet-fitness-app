/**
 * AI Provider Abstraction
 * Switch providers by setting AI_PROVIDER in .env.local
 * Supported: "anthropic" | "gemini" | "openai"
 * Default is now "gemini" (free tier).
 */

export type AIMessage = { role: 'user' | 'assistant'; content: string }

async function callAnthropic(system: string, messages: AIMessage[]): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system,
    messages,
  })
  return (response.content[0] as { text: string }).text
}

async function callGemini(system: string, messages: AIMessage[]): Promise<string> {
  const fullPrompt = system + '\n\n' + messages.map(m => `${m.role}: ${m.content}`).join('\n')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
    }
  )
  const data = await res.json()

  // Surface API errors clearly instead of silently returning 'No response'
  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${data.error?.message ?? JSON.stringify(data)}`)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error(`Gemini returned no content. Full response: ${JSON.stringify(data)}`)
  }

  return text
}

async function callOpenAI(system: string, messages: AIMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set in environment variables')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: 1024,
    }),
  })

  const data = await res.json()

  if (!res.ok || data.error) {
    throw new Error(`OpenAI API error: ${data.error?.message ?? res.statusText}`)
  }

  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenAI returned an empty response')

  return text
}

export async function callAI(system: string, userMessage: string): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? 'gemini'
  const messages: AIMessage[] = [{ role: 'user', content: userMessage }]
  switch (provider) {
    case 'gemini':    return callGemini(system, messages)
    case 'openai':    return callOpenAI(system, messages)
    case 'anthropic': return callAnthropic(system, messages)
    default: throw new Error(`Unknown AI_PROVIDER: "${provider}". Use "gemini", "openai", or "anthropic".`)
  }
}

/** Parse JSON from AI response safely, stripping markdown code fences */
export function parseAIJson<T>(text: string): T {
  const clean = text.replace(/```json\n?|```\n?/g, '').trim()
  try {
    return JSON.parse(clean) as T
  } catch {
    throw new Error(`Failed to parse AI response as JSON. Raw response: ${clean.slice(0, 200)}`)
  }
}