'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { format, subDays } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type Plan = {
  daily_calories: number
  daily_protein_g: number
  tip: string
  meals: Record<string, { name: string; calories: number; description: string }>
  workout: { name: string; duration_minutes: number; description: string; calories_burned: number }
}

type FoodLog = {
  calories: number
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  meal_type: string
  food_name: string
}
type WorkoutLog = { workout_type: string; duration_minutes: number; calories_burned: number | null }

const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }
const MEAL_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-50 border-amber-200',
  lunch: 'bg-green-50 border-green-200',
  dinner: 'bg-blue-50 border-blue-200',
  snack: 'bg-pink-50 border-pink-200',
}

// ─── localStorage cache helpers ──────────────────────────────────────────────
// Keyed by userId + date → plan is generated at most once per day.
// User can force a regenerate which overwrites the cache.
function getPlanCacheKey(userId: string, date: string) {
  return `ht_plan_${userId}_${date}`
}
function loadCachedPlan(userId: string, date: string): Plan | null {
  try {
    const raw = localStorage.getItem(getPlanCacheKey(userId, date))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function savePlanCache(userId: string, date: string, plan: Plan) {
  try {
    localStorage.setItem(getPlanCacheKey(userId, date), JSON.stringify(plan))
  } catch { /* storage full — ignore */ }
}
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [weeklyData, setWeeklyData] = useState<{ date: string; label: string; calories: number }[]>([])
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{
    daily_calorie_target: number
    daily_protein_target: number
    goal: string
  } | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')
  const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd')

  useEffect(() => { if (!authLoading && !user) router.push('/login') }, [user, authLoading])
  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const userId = user!.id

    const [
      { data: profileData },
      { data: foodData },
      { data: workoutData },
      { data: weekData },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('food_logs').select('*').eq('user_id', userId).eq('log_date', today),
      supabase.from('workout_logs').select('*').eq('user_id', userId).eq('log_date', today),
      supabase
        .from('food_logs')
        .select('log_date, calories')
        .eq('user_id', userId)
        .gte('log_date', sevenDaysAgo)
        .lte('log_date', today),
    ])

    setProfile(profileData)
    setFoodLogs(foodData || [])
    setWorkoutLogs(workoutData || [])

    // Build weekly bar chart — pre-fill all 7 days so empty days show as 0
    const dayMap = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      dayMap.set(format(subDays(new Date(), i), 'yyyy-MM-dd'), 0)
    }
    weekData?.forEach(({ log_date, calories }: { log_date: string; calories: number }) => {
      dayMap.set(log_date, (dayMap.get(log_date) || 0) + calories)
    })
    setWeeklyData(
      Array.from(dayMap.entries()).map(([date, calories]) => ({
        date,
        calories,
        label: format(new Date(date + 'T00:00:00'), 'EEE'),
      }))
    )

    setLoading(false) // ← UI unblocks here, no AI calls yet

    // Restore cached plan from localStorage — zero API calls
    const cached = loadCachedPlan(userId, today)
    if (cached) setPlan(cached)
  }

  // ─── On-demand: called when user clicks "Generate" or "↺ Regenerate" ───────
  async function generatePlan(force = false) {
    if (!profile || !user || planLoading) return

    // If cached and not forcing, just show cache (shouldn't normally reach here)
    const cached = loadCachedPlan(user.id, today)
    if (cached && !force) { setPlan(cached); return }

    setPlanLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_plan', data: { profile } }),
      })
      const { data: planData } = await res.json()
      if (planData) {
        setPlan(planData)
        savePlanCache(user.id, today, planData) // Cache for the rest of the day
      }
    } catch (e) {
      console.error('AI plan failed', e)
    }
    setPlanLoading(false)

    // Piggyback: also fetch feedback if food is already logged today
    if (foodLogs.length > 0) {
      try {
        const fbRes = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'daily_feedback',
            data: {
              logs: foodLogs,
              targets: {
                calories: profile.daily_calorie_target,
                protein_g: profile.daily_protein_target,
              },
              date: today,
            },
          }),
        })
        const { data: fbData } = await fbRes.json()
        if (fbData?.feedback) setFeedback(fbData.feedback)
      } catch (e) {
        console.error('AI feedback failed', e)
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const totalCals = foodLogs.reduce((s, l) => s + l.calories, 0)
  const totalProtein = foodLogs.reduce((s, l) => s + (l.protein_g || 0), 0)
  const calTarget = profile?.daily_calorie_target ?? 2000
  const protTarget = profile?.daily_protein_target ?? 150
  const calPct = Math.min(100, Math.round((totalCals / calTarget) * 100))
  const calRemaining = Math.max(0, calTarget - totalCals)

  const R = 52, C = 2 * Math.PI * R
  const calDash = C - (calPct / 100) * C

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-56" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    )
  }

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
      </div>

      {/* AI Feedback banner */}
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
          <MacroBar
            label="Carbs"
            value={foodLogs.reduce((s, l) => s + (l.carbs_g || 0), 0)}
            target={Math.round(calTarget * 0.45 / 4)}
            unit="g"
            color="bg-amber-400"
          />
          <MacroBar
            label="Fat"
            value={foodLogs.reduce((s, l) => s + (l.fat_g || 0), 0)}
            target={Math.round(calTarget * 0.3 / 9)}
            unit="g"
            color="bg-purple-400"
          />
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

      {/* Weekly bar chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span>📊</span>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">This week at a glance</h2>
        </div>
        {weeklyData.every(d => d.calories === 0) ? (
          <p className="text-sm text-gray-400 italic text-center py-6">No data logged this week yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyData} barCategoryGap="30%">
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip
                formatter={(v: number) => [`${v} kcal`, 'Calories']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                {weeklyData.map((entry, index) => (
                  <Cell key={index} fill={entry.date === today ? '#0284c7' : '#bae6fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* AI Plan section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span>✦</span>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              AI suggested plan for today
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {plan ? (
              // Already have a plan — show small Regenerate button
              <button
                onClick={() => generatePlan(true)}
                disabled={planLoading}
                className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                title="Fetch a fresh plan (1 AI call)"
              >
                {planLoading ? '…' : '↺ Regenerate'}
              </button>
            ) : (
              // No plan yet — show primary CTA
              <button
                onClick={() => generatePlan(false)}
                disabled={planLoading || !profile}
                className="flex items-center gap-1.5 text-sm bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-medium transition-colors"
              >
                {planLoading ? (
                  <>
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    Generating…
                  </>
                ) : '✦ Generate today\'s plan'}
              </button>
            )}
          </div>
        </div>

        {/* Loading skeleton (only when no plan exists yet) */}
        {planLoading && !plan && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
            </div>
            <div className="skeleton h-14 rounded-xl" />
          </div>
        )}

        {/* Empty state */}
        {!planLoading && !plan && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-3">🥗</div>
            <p className="text-sm">
              {profile
                ? 'Click the button above to get a personalized meal & workout plan.'
                : <>Complete your <a href="/profile" className="text-sky-500 hover:underline">profile</a> first.</>
              }
            </p>
          </div>
        )}

        {/* Plan cards */}
        {plan && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(meal => (
                <div key={meal} className={`rounded-xl border p-3 ${MEAL_COLORS[meal]}`}>
                  <div className="text-lg mb-1">{MEAL_ICONS[meal]}</div>
                  <div className="text-xs font-semibold text-gray-700 capitalize">{meal}</div>
                  <div className="text-sm font-medium text-gray-900 mt-1 leading-tight">
                    {plan.meals[meal]?.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{plan.meals[meal]?.calories} kcal</div>
                </div>
              ))}
            </div>
            {plan.workout && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3 mb-3">
                <span className="text-xl">🏋️</span>
                <div>
                  <div className="text-sm font-semibold text-blue-800">
                    {plan.workout.name} · {plan.workout.duration_minutes} min
                  </div>
                  <div className="text-xs text-blue-600 mt-0.5">{plan.workout.description}</div>
                </div>
              </div>
            )}
            {plan.tip && (
              <div className="text-sm text-gray-600 italic border-t border-gray-100 pt-3">
                💡 {plan.tip}
              </div>
            )}
            <p className="text-xs text-gray-300 mt-3 text-right">Cached for today · regenerate to refresh</p>
          </>
        )}
      </div>

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

function MacroBar({ label, value, target, unit, color }: {
  label: string; value: number; target: number; unit: string; color: string
}) {
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