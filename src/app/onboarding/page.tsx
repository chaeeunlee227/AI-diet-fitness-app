'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

const GOALS = [
  { value: 'lose_weight', label: '⬇ Lose weight' },
  { value: 'build_muscle', label: '💪 Build muscle' },
  { value: 'more_energy', label: '⚡ More energy' },
  { value: 'eat_healthier', label: '❤️ Eat healthier' },
  { value: 'improve_fitness', label: '🏃 Improve fitness' },
  { value: 'maintain_weight', label: '⚖️ Maintain weight' },
]
const DIET_PREFS = ['No restrictions', 'Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Keto', 'Low carb']
const WORKOUT_PREFS = ['Weights', 'Running', 'Cycling', 'Yoga', 'Swimming', 'HIIT', 'Walking', 'Sports']
const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little movement' },
  { value: 'lightly_active', label: 'Lightly active', desc: '1–3 workouts/week' },
  { value: 'moderately_active', label: 'Moderately active', desc: '3–5 workouts/week' },
  { value: 'very_active', label: 'Very active', desc: '6–7 workouts/week' },
]

const EMPTY_FORM = {
  goal: 'lose_weight',
  height_cm: '',
  weight_kg: '',
  age: '',
  sex: 'male',
  activity_level: 'lightly_active',
  diet_preferences: ['No restrictions'] as string[],
  workout_preferences: ['Weights'] as string[],
}

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading])

  function toggleArr(key: 'diet_preferences' | 'workout_preferences', val: string) {
    setForm(p => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter(v => v !== val) : [...p[key], val],
    }))
  }

  function estimateCalories() {
    const h = parseFloat(form.height_cm) || 170
    const w = parseFloat(form.weight_kg) || 70
    const a = parseInt(form.age) || 25
    const bmr = form.sex === 'female'
      ? 10 * w + 6.25 * h - 5 * a - 161
      : 10 * w + 6.25 * h - 5 * a + 5
    const multipliers: Record<string, number> = {
      sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725,
    }
    const tdee = Math.round(bmr * (multipliers[form.activity_level] || 1.375))
    const goalAdj = form.goal === 'lose_weight' ? -500 : form.goal === 'build_muscle' ? +300 : 0
    return {
      calories: Math.max(1200, tdee + goalAdj),
      protein: Math.round(w * (form.goal === 'build_muscle' ? 2.0 : 1.6)),
    }
  }

  async function handleSave() {
    if (!user) return
    if (!form.height_cm || !form.weight_kg || !form.age) {
      setError('Please fill in height, weight, and age.')
      return
    }
    setSaving(true)
    setError('')
    const { calories, protein } = estimateCalories()
    const { error: dbError } = await supabase.from('profiles').upsert({
      id: user.id,
      goal: form.goal,
      height_cm: parseFloat(form.height_cm),
      weight_kg: parseFloat(form.weight_kg),
      age: parseInt(form.age),
      sex: form.sex,
      activity_level: form.activity_level,
      diet_preferences: form.diet_preferences,
      workout_preferences: form.workout_preferences,
      daily_calorie_target: calories,
      daily_protein_target: protein,
    })
    setSaving(false)
    if (dbError) {
      setError('Something went wrong. Please try again.')
    } else {
      router.push('/dashboard')
    }
  }

  if (authLoading) return null

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">🥗</div>
          <h1 className="text-2xl font-semibold text-gray-900">Welcome to HealthTrack!</h1>
          <p className="text-sm text-gray-500 mt-1">Let's set up your profile to personalize your experience.</p>
        </div>

        {/* Goal */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Your goal</h2>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => (
              <button key={g.value} onClick={() => setForm(p => ({ ...p, goal: g.value }))}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${form.goal === g.value ? 'bg-sky-500 border-sky-500 text-white' : 'border-gray-200 text-gray-700 hover:border-sky-300'}`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body stats */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Body stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Height (cm)', key: 'height_cm', placeholder: '175' },
              { label: 'Weight (kg)', key: 'weight_kg', placeholder: '70' },
              { label: 'Age', key: 'age', placeholder: '28' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm text-gray-600 mb-1">{f.label}</label>
                <input type="number" value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} className="field-input" />
              </div>
            ))}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Sex</label>
              <select value={form.sex} onChange={e => setForm(p => ({ ...p, sex: e.target.value }))} className="field-input">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activity level */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Activity level</h2>
          <div className="grid grid-cols-2 gap-2">
            {ACTIVITY_LEVELS.map(al => (
              <button key={al.value} onClick={() => setForm(p => ({ ...p, activity_level: al.value }))}
                className={`text-left px-3 py-2 rounded-xl border text-xs transition-colors ${form.activity_level === al.value ? 'bg-sky-500 border-sky-500 text-white' : 'border-gray-200 text-gray-700 hover:border-sky-300'}`}>
                <div className="font-medium">{al.label}</div>
                <div className="opacity-75">{al.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Diet preferences */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Diet preferences</h2>
          <div className="flex flex-wrap gap-2">
            {DIET_PREFS.map(p => (
              <button key={p} onClick={() => toggleArr('diet_preferences', p)}
                className={`px-3 py-1.5 rounded-xl border text-sm transition-colors ${form.diet_preferences.includes(p) ? 'bg-sky-500 border-sky-500 text-white' : 'border-gray-200 text-gray-700 hover:border-sky-300'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Workout preferences */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Workout preferences</h2>
          <div className="flex flex-wrap gap-2">
            {WORKOUT_PREFS.map(p => (
              <button key={p} onClick={() => toggleArr('workout_preferences', p)}
                className={`px-3 py-1.5 rounded-xl border text-sm transition-colors ${form.workout_preferences.includes(p) ? 'bg-sky-500 border-sky-500 text-white' : 'border-gray-200 text-gray-700 hover:border-sky-300'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
          {saving ? 'Saving...' : '✦ Get started →'}
        </button>
      </div>
    </div>
  )
}