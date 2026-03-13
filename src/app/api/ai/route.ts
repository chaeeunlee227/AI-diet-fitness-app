import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'

const FOOD_SYSTEM = `You are a nutrition expert. When given a food description, return ONLY a JSON object with these fields:
{
  "food_name": "cleaned name of the food",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "quantity_g": number,
  "confidence": "high" | "medium" | "low",
  "notes": "brief note if needed, otherwise empty string"
}
Use standard nutritional databases. If quantity is unclear, assume a typical serving size. Return ONLY the JSON, no markdown, no explanation.`

const PLAN_SYSTEM = `You are a certified nutritionist and personal trainer. Given a user's profile, generate a personalized daily meal plan and workout suggestion. Return ONLY a JSON object:
{
  "daily_calories": number,
  "daily_protein_g": number,
  "meals": {
    "breakfast": { "name": string, "calories": number, "description": string },
    "lunch": { "name": string, "calories": number, "description": string },
    "dinner": { "name": string, "calories": number, "description": string },
    "snack": { "name": string, "calories": number, "description": string }
  },
  "workout": { "name": string, "duration_minutes": number, "description": string, "calories_burned": number },
  "tip": "one short actionable tip for today"
}`

const FEEDBACK_SYSTEM = `You are a supportive health coach. Given what a user has eaten and their goals, write a short (2-3 sentence) encouraging and actionable feedback message. Be specific to their data. Be warm but concise. Plain text only, no markdown.`

export async function POST(req: NextRequest) {
  const { action, data } = await req.json()

  try {
    if (action === 'analyze_food') {
      const text = await callAI(FOOD_SYSTEM, `Analyze this food: "${data.description}"`)
      const nutrition = parseAIJson(text)
      return NextResponse.json({ success: true, data: nutrition })
    }

    if (action === 'generate_plan') {
      const profile = data.profile
      const prompt = `User profile:
- Goal: ${profile.goal}
- Age: ${profile.age}, Sex: ${profile.sex}
- Height: ${profile.height_cm}cm, Weight: ${profile.weight_kg}kg
- Activity level: ${profile.activity_level}
- Diet preferences: ${profile.diet_preferences?.join(', ') || 'none'}
- Workout preferences: ${profile.workout_preferences?.join(', ') || 'none'}
Generate a daily plan for today.`
      const text = await callAI(PLAN_SYSTEM, prompt)
      const plan = parseAIJson(text)
      return NextResponse.json({ success: true, data: plan })
    }

    if (action === 'daily_feedback') {
      const { logs, targets, date } = data
      const totalCals = logs.reduce((s: number, l: { calories: number }) => s + l.calories, 0)
      const totalProtein = logs.reduce((s: number, l: { protein_g?: number }) => s + (l.protein_g || 0), 0)
      const prompt = `Date: ${date}
Calorie target: ${targets.calories} kcal, eaten so far: ${totalCals} kcal
Protein target: ${targets.protein_g}g, eaten so far: ${totalProtein}g
Meals logged: ${logs.map((l: { meal_type: string; food_name: string; calories: number }) => `${l.meal_type}: ${l.food_name} (${l.calories} kcal)`).join(', ') || 'none yet'}
Write brief feedback.`
      const feedback = await callAI(FEEDBACK_SYSTEM, prompt)
      return NextResponse.json({ success: true, data: { feedback } })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('AI error:', err)
    return NextResponse.json({ success: false, error: 'AI request failed' }, { status: 500 })
  }
}
