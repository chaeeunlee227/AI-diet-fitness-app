'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
type FoodLog = {
  id: string; food_name: string; calories: number; protein_g: number | null
  carbs_g: number | null; fat_g: number | null; meal_type: MealType; quantity_g: number | null
}
type WorkoutLog = {
  id: string; workout_type: string; duration_minutes: number; calories_burned: number | null; notes: string | null
}

const MEAL_CONFIG: { key: MealType; icon: string; label: string; color: string }[] = [
  { key: 'breakfast', icon: '🌅', label: 'Breakfast', color: 'border-amber-200 bg-amber-50' },
  { key: 'lunch', icon: '☀️', label: 'Lunch', color: 'border-green-200 bg-green-50' },
  { key: 'dinner', icon: '🌙', label: 'Dinner', color: 'border-blue-200 bg-blue-50' },
  { key: 'snack', icon: '🍎', label: 'Snack', color: 'border-pink-200 bg-pink-50' },
]

export default function LogPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [addingMeal, setAddingMeal] = useState<MealType | null>(null)
  const [foodInput, setFoodInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)
  const [analyzeError, setAnalyzeError] = useState('')   // ← new: surface errors
  const [saving, setSaving] = useState(false)
  const [showWorkoutForm, setShowWorkoutForm] = useState(false)
  const [workout, setWorkout] = useState({ type: '', duration: '', calories: '', notes: '' })

  useEffect(() => { if (!authLoading && !user) router.push('/login') }, [user, authLoading])
  useEffect(() => { if (user) loadLogs() }, [date, user])

  async function loadLogs() {
    const [{ data: food }, { data: workouts }] = await Promise.all([
      supabase.from('food_logs').select('*').eq('user_id', user!.id).eq('log_date', date).order('created_at'),
      supabase.from('workout_logs').select('*').eq('user_id', user!.id).eq('log_date', date).order('created_at'),
    ])
    setFoodLogs(food || [])
    setWorkoutLogs(workouts || [])
  }

  async function analyzeFood() {
    if (!foodInput.trim()) return
    setAnalyzing(true)
    setAiResult(null)
    setAnalyzeError('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze_food', data: { description: foodInput } }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        // Show the actual error message from the API route
        setAnalyzeError(json.error ?? 'Analysis failed. Please try again.')
      } else {
        setAiResult(json.data)
      }
    } catch (err: any) {
      setAnalyzeError(err?.message ?? 'Network error. Please check your connection.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function saveFood() {
    if (!aiResult || !addingMeal) return
    setSaving(true)
    await supabase.from('food_logs').insert({
      user_id: user!.id,
      log_date: date,
      meal_type: addingMeal,
      food_name: aiResult.food_name,
      calories: aiResult.calories,
      protein_g: aiResult.protein_g,
      carbs_g: aiResult.carbs_g,
      fat_g: aiResult.fat_g,
      quantity_g: aiResult.quantity_g,
    })
    setAddingMeal(null)
    setFoodInput('')
    setAiResult(null)
    setAnalyzeError('')
    setSaving(false)
    loadLogs()
  }

  async function deleteFood(id: string) {
    await supabase.from('food_logs').delete().eq('id', id)
    loadLogs()
  }

  async function saveWorkout() {
    if (!workout.type || !workout.duration) return
    setSaving(true)
    await supabase.from('workout_logs').insert({
      user_id: user!.id,
      log_date: date,
      workout_type: workout.type,
      duration_minutes: parseInt(workout.duration),
      calories_burned: workout.calories ? parseInt(workout.calories) : null,
      notes: workout.notes || null,
    })
    setWorkout({ type: '', duration: '', calories: '', notes: '' })
    setShowWorkoutForm(false)
    setSaving(false)
    loadLogs()
  }

  async function deleteWorkout(id: string) {
    await supabase.from('workout_logs').delete().eq('id', id)
    loadLogs()
  }

  const totalCals = foodLogs.reduce((s, l) => s + l.calories, 0)
  const totalProtein = foodLogs.reduce((s, l) => s + (l.protein_g || 0), 0)
  const totalCarbs = foodLogs.reduce((s, l) => s + (l.carbs_g || 0), 0)
  const totalFat = foodLogs.reduce((s, l) => s + (l.fat_g || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Daily Log</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">‹</button>
          <input
            type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white"
          />
          <button onClick={() => changeDate(1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">›</button>
        </div>
      </div>

      {/* Daily totals */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Calories', value: totalCals, unit: 'kcal', color: 'text-sky-600' },
          { label: 'Protein', value: Math.round(totalProtein), unit: 'g', color: 'text-blue-600' },
          { label: 'Carbs', value: Math.round(totalCarbs), unit: 'g', color: 'text-amber-600' },
          { label: 'Fat', value: Math.round(totalFat), unit: 'g', color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="card text-center py-3">
            <div className={`text-xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label} <span className="text-gray-400">{s.unit}</span></div>
          </div>
        ))}
      </div>

      {/* Meal sections */}
      {MEAL_CONFIG.map(meal => {
        const mealLogs = foodLogs.filter(l => l.meal_type === meal.key)
        const mealCals = mealLogs.reduce((s, l) => s + l.calories, 0)
        return (
          <div key={meal.key} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{meal.icon}</span>
                <span className="font-medium text-gray-800">{meal.label}</span>
                {mealCals > 0 && <span className="text-xs text-gray-400">{mealCals} kcal</span>}
              </div>
              <button
                onClick={() => { setAddingMeal(meal.key); setAiResult(null); setAnalyzeError(''); setFoodInput('') }}
                className="text-xs bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                + Add food
              </button>
            </div>

            {mealLogs.length === 0 && addingMeal !== meal.key && (
              <p className="text-sm text-gray-400 italic">Nothing logged yet</p>
            )}

            {mealLogs.map(log => (
              <div key={log.id} className="flex items-center gap-3 py-2 border-t border-gray-50 group">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{log.food_name}</div>
                  <div className="text-xs text-gray-400">
                    {log.quantity_g ? `${log.quantity_g}g · ` : ''}{log.protein_g ? `P: ${Math.round(log.protein_g)}g · ` : ''}{log.carbs_g ? `C: ${Math.round(log.carbs_g)}g · ` : ''}{log.fat_g ? `F: ${Math.round(log.fat_g)}g` : ''}
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-700">{log.calories} kcal</span>
                <button onClick={() => deleteFood(log.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-lg transition-opacity">×</button>
              </div>
            ))}

            {/* Add food form */}
            {addingMeal === meal.key && (
              <div className={`mt-3 p-3 rounded-xl border ${meal.color}`}>
                <div className="flex gap-2 mb-3">
                  <input
                    value={foodInput}
                    onChange={e => { setFoodInput(e.target.value); setAnalyzeError('') }}
                    onKeyDown={e => e.key === 'Enter' && analyzeFood()}
                    placeholder="e.g. 2 scrambled eggs with toast, bowl of oatmeal..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                    autoFocus
                  />
                  <button
                    onClick={analyzeFood}
                    disabled={analyzing || !foodInput.trim()}
                    className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                  >
                    {analyzing ? '⏳ Analyzing...' : '✦ Analyze'}
                  </button>
                </div>

                {/* Error message - now visible! */}
                {analyzeError && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                    ⚠ {analyzeError}
                  </p>
                )}

                {aiResult && (
                  <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900">{aiResult.food_name}</div>
                        {aiResult.quantity_g && <div className="text-xs text-gray-500">~{aiResult.quantity_g}g serving</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-sky-600">{aiResult.calories} kcal</div>
                        <div className={`text-xs ${aiResult.confidence === 'high' ? 'text-green-600' : aiResult.confidence === 'medium' ? 'text-amber-600' : 'text-red-500'}`}>
                          {aiResult.confidence} confidence
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Protein: <b className="text-gray-700">{aiResult.protein_g}g</b></span>
                      <span>Carbs: <b className="text-gray-700">{aiResult.carbs_g}g</b></span>
                      <span>Fat: <b className="text-gray-700">{aiResult.fat_g}g</b></span>
                    </div>
                    {aiResult.notes && <p className="text-xs text-gray-400 mt-2 italic">{aiResult.notes}</p>}
                    <div className="flex gap-2 mt-3">
                      <button onClick={saveFood} disabled={saving} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                        {saving ? 'Saving...' : '✓ Save'}
                      </button>
                      <button onClick={() => setAiResult(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                        Edit
                      </button>
                    </div>
                  </div>
                )}
                <button onClick={() => { setAddingMeal(null); setAiResult(null); setAnalyzeError('') }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            )}
          </div>
        )
      })}

      {/* Workout section */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏋️</span>
            <span className="font-medium text-gray-800">Workouts</span>
          </div>
          <button
            onClick={() => setShowWorkoutForm(true)}
            className="text-xs bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add workout
          </button>
        </div>

        {workoutLogs.map(w => (
          <div key={w.id} className="flex items-center gap-3 py-2 border-t border-gray-50 group">
            <span className="text-xl">🏃</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">{w.workout_type}</div>
              <div className="text-xs text-gray-400">{w.duration_minutes} min{w.calories_burned ? ` · ~${w.calories_burned} kcal burned` : ''}{w.notes ? ` · ${w.notes}` : ''}</div>
            </div>
            <button onClick={() => deleteWorkout(w.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-lg transition-opacity">×</button>
          </div>
        ))}

        {workoutLogs.length === 0 && !showWorkoutForm && (
          <p className="text-sm text-gray-400 italic">No workouts logged</p>
        )}

        {showWorkoutForm && (
          <div className="mt-3 p-3 rounded-xl border border-blue-100 bg-blue-50">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                value={workout.type} onChange={e => setWorkout(p => ({ ...p, type: e.target.value }))}
                placeholder="e.g. Running, Weights..." autoFocus
                className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              <input
                value={workout.duration} onChange={e => setWorkout(p => ({ ...p, duration: e.target.value }))}
                type="number" placeholder="Duration (min)"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              <input
                value={workout.calories} onChange={e => setWorkout(p => ({ ...p, calories: e.target.value }))}
                type="number" placeholder="Kcal burned (optional)"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              <input
                value={workout.notes} onChange={e => setWorkout(p => ({ ...p, notes: e.target.value }))}
                placeholder="Notes (optional)" className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={saveWorkout} disabled={saving} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                {saving ? 'Saving...' : 'Save workout'}
              </button>
              <button onClick={() => setShowWorkoutForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  function changeDate(delta: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(format(d, 'yyyy-MM-dd'))
  }
}