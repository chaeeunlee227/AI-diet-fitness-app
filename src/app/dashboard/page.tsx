'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

type Plan = {
  daily_calories: number
  daily_protein_g: number
  tip: string
  meals: Record<string, { name: string; calories: number; description: string }>
  workout: { name: string; duration_minutes: number; description: string; calories_burned: number }
}

type FoodLog = { calories: number; protein_g: number | null; meal_type: string; food_name: string }
type WorkoutLog = { workout_type: string; duration_minutes: number; calories_burned: number | null }

const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }
const MEAL_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-50 border-amber-200',
  lunch: 'bg-green-50 border-green-200',
  dinner: 'bg-blue-50 border-blue-200',
  snack: 'bg-pink-50 border-pink-200',
}

export default function DashboardPage() {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ daily_calorie_target: number; daily_protein_target: number; goal: string } | null>(null)
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    // For personal use — use a fixed user_id or get from auth
    const userId = 'personal-user'

    const [{ data: profileData }, { data: foodData }, { data: workoutData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('food_logs').select('*').eq('user_id', userId).eq('log_date', today),
      supabase.from('workout_logs').select('*').eq('user_id', userId).eq('log_date', today),
    ])

    if (profileData) {
      setProfile(profileData)
      setFoodLogs(foodData || [])
      setWorkoutLogs(workoutData || [])

      // Generate AI plan
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_plan', data: { profile: profileData } }),
      })
      const { data: planData } = await res.json()
      setPlan(planData)

      // Get AI feedback if there are logs
      if (foodData && foodData.length > 0) {
        const fbRes = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'daily_feedback',
            data: {
              logs: foodData,
              targets: { calories: profileData.daily_calorie_target, protein_g: profileData.daily_protein_target },
              date: today,
            },
          }),
        })
        const { data: fbData } = await fbRes.json()
        if (fbData?.feedback) setFeedback(fbData.feedback)
      }
    }
    setLoading(false)
  }

  const totalCals = foodLogs.reduce((s, l) => s + l.calories, 0)
  const totalProtein = foodLogs.reduce((s, l) => s + (l.protein_g || 0), 0)
  const calTarget = profile?.daily_calorie_target || (plan?.daily_calories ?? 2000)
  const protTarget = profile?.daily_protein_target || (plan?.daily_protein_g ?? 150)
  const calPct = Math.min(100, Math.round((totalCals / calTarget) * 100))
  const protPct = Math.min(100, Math.round((totalProtein / protTarget) * 100))
  const calRemaining = Math.max(0, calTarget - totalCals)

  // SVG ring helpers
  const R = 52, C = 2 * Math.PI * R
  const calDash = C - (calPct / 100) * C

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Good {getGreeting()}, you! 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <span className="text-xl">🔥</span>
          <div>
            <div className="text-lg font-semibold text-amber-700">12</div>
            <div className="text-xs text-amber-600">day streak</div>
          </div>
        </div>
      </div>

      {/* AI Feedback */}
      {feedback && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex gap-3">
          <span className="text-lg flex-shrink-0">✦</span>
          <p className="text-sm text-sky-800 leading-relaxed">{feedback}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Calorie ring */}
        <div className="card flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={R} fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle
                cx="60" cy="60" r={R} fill="none"
                stroke={calPct >= 100 ? '#16a34a' : '#0284c7'}
                strokeWidth="10"
                strokeDasharray={C}
                strokeDashoffset={calDash}
                strokeLinecap="round"
                className="ring-progress"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold text-gray-900">{totalCals}</span>
              <span className="text-xs text-gray-500">kcal</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700">Calories today</div>
            <div className="text-xs text-gray-500 mt-1">Goal: {calTarget} kcal</div>
            <div className="text-xs text-sky-600 mt-1">{calRemaining} remaining</div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${calPct}%` }} />
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="card space-y-3">
          <div className="text-sm font-medium text-gray-700">Macros</div>
          <MacroBar label="Protein" value={totalProtein} target={protTarget} unit="g" color="bg-blue-500" />
          <MacroBar label="Carbs" value={foodLogs.reduce((s, l: any) => s + (l.carbs_g || 0), 0)} target={Math.round(calTarget * 0.45 / 4)} unit="g" color="bg-amber-400" />
          <MacroBar label="Fat" value={foodLogs.reduce((s, l: any) => s + (l.fat_g || 0), 0)} target={Math.round(calTarget * 0.3 / 9)} unit="g" color="bg-purple-400" />
        </div>

        {/* Workout summary */}
        <div className="card">
          <div className="text-sm font-medium text-gray-700 mb-3">Today's activity</div>
          {workoutLogs.length === 0 ? (
            <div className="text-sm text-gray-400 italic">No workouts logged yet</div>
          ) : (
            <div className="space-y-2">
              {workoutLogs.map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-lg">🏃</span>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{w.workout_type}</div>
                    <div className="text-xs text-gray-500">{w.duration_minutes} min · {w.calories_burned || '—'} kcal</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <a href="/log" className="mt-3 block text-xs text-sky-600 hover:underline">+ Log workout</a>
        </div>
      </div>

      {/* AI Plan */}
      {loading ? (
        <div className="card space-y-3">
          <div className="skeleton h-4 w-40" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        </div>
      ) : plan ? (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">✦</span>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">AI suggested plan for today</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(meal => (
              <div key={meal} className={`rounded-xl border p-3 ${MEAL_COLORS[meal]}`}>
                <div className="text-lg mb-1">{MEAL_ICONS[meal]}</div>
                <div className="text-xs font-semibold text-gray-700 capitalize">{meal}</div>
                <div className="text-sm font-medium text-gray-900 mt-1 leading-tight">{plan.meals[meal]?.name}</div>
                <div className="text-xs text-gray-500 mt-1">{plan.meals[meal]?.calories} kcal</div>
              </div>
            ))}
          </div>
          {plan.workout && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3 mb-3">
              <span className="text-xl">🏋️</span>
              <div>
                <div className="text-sm font-semibold text-blue-800">{plan.workout.name} · {plan.workout.duration_minutes} min</div>
                <div className="text-xs text-blue-600 mt-0.5">{plan.workout.description}</div>
              </div>
            </div>
          )}
          {plan.tip && (
            <div className="text-sm text-gray-600 italic border-t border-gray-100 pt-3">
              💡 {plan.tip}
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-8">
          <p className="text-gray-500 text-sm">No profile found. <a href="/onboard" className="text-sky-600 hover:underline">Set up your profile</a> to get a personalized plan.</p>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <a href="/log" className="card hover:border-sky-300 hover:bg-sky-50 transition-colors cursor-pointer text-center py-5 block">
          <div className="text-3xl mb-2">📋</div>
          <div className="text-sm font-medium text-gray-700">Log today's meals</div>
          <div className="text-xs text-gray-400 mt-1">{foodLogs.length} items logged</div>
        </a>
        <a href="/calendar" className="card hover:border-sky-300 hover:bg-sky-50 transition-colors cursor-pointer text-center py-5 block">
          <div className="text-3xl mb-2">📅</div>
          <div className="text-sm font-medium text-gray-700">View calendar</div>
          <div className="text-xs text-gray-400 mt-1">See your progress</div>
        </a>
      </div>
    </div>
  )
}

function MacroBar({ label, value, target, unit, color }: { label: string; value: number; target: number; unit: string; color: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-500">{Math.round(value)}{unit} / {target}{unit}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
