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

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${data.error?.message ?? JSON.stringify(data)}`)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error(`Gemini returned no content: ${JSON.stringify(data)}`)
  }

  return text
}

async function callOpenAI(system: string, messages: AIMessage[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: 1024,
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? 'No response'
}

export async function callAI(system: string, userMessage: string): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? 'anthropic'
  const messages: AIMessage[] = [{ role: 'user', content: userMessage }]
  switch (provider) {
    case 'gemini': return callGemini(system, messages)
    case 'openai': return callOpenAI(system, messages)
    default:       return callAnthropic(system, messages)
  }
}

/** Parse JSON from AI response — strips markdown fences and extracts first JSON object/array */
export function parseAIJson<T>(text: string): T {
  // Strip markdown fences
  let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  // Extract the first { ... } or [ ... ] block in case Gemini adds preamble text
  const start = clean.search(/[{\[]/)
  const lastCurly = clean.lastIndexOf('}')
  const lastSquare = clean.lastIndexOf(']')
  const end = Math.max(lastCurly, lastSquare)
  if (start !== -1 && end !== -1) {
    clean = clean.slice(start, end + 1)
  }
  return JSON.parse(clean) as T
}