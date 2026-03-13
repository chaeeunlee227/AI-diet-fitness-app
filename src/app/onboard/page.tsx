'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const USER_ID = 'personal-user'

const GOALS = [
  { value: 'lose_weight', label: '⬇ Lose weight' },
  { value: 'build_muscle', label: '💪 Build muscle' },
  { value: 'more_energy', label: '⚡ More energy' },
  { value: 'eat_healthier', label: '❤ Eat healthier' },
  { value: 'improve_fitness', label: '🏃 Improve fitness' },
  { value: 'maintain_weight', label: '⚖ Maintain weight' },
]

const DIET_PREFS = ['No restrictions', 'Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Keto', 'Low carb']
const WORKOUT_PREFS = ['Weights', 'Running', 'Cycling', 'Yoga', 'Swimming', 'HIIT', 'Walking', 'Sports']
const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little movement' },
  { value: 'lightly_active', label: 'Lightly active', desc: '1–3 workouts/week' },
  { value: 'moderately_active', label: 'Moderately active', desc: '3–5 workouts/week' },
  { value: 'very_active', label: 'Very active', desc: '6–7 workouts/week' },
]

type FormData = {
  goal: string
  goal_due_date: string
  height_cm: string
  weight_kg: string
  age: string
  sex: string
  activity_level: string
  diet_preferences: string[]
  workout_preferences: string[]
}

export default function OnboardPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>({
    goal: 'lose_weight',
    goal_due_date: '',
    height_cm: '',
    weight_kg: '',
    age: '',
    sex: 'male',
    activity_level: 'lightly_active',
    diet_preferences: ['No restrictions'],
    workout_preferences: ['Weights', 'Running'],
  })

  const totalSteps = 4

  function toggleArr(key: 'diet_preferences' | 'workout_preferences', val: string) {
    setForm(p => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter(v => v !== val) : [...p[key], val],
    }))
  }

  // Estimate calorie target from profile (Mifflin-St Jeor)
  function estimateCalories(): { calories: number; protein: number } {
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
    const calories = Math.max(1200, tdee + goalAdj)
    const protein = Math.round(w * (form.goal === 'build_muscle' ? 2.0 : 1.6))
    return { calories, protein }
  }

  async function handleFinish() {
    setSaving(true)
    const { calories, protein } = estimateCalories()
    await supabase.from('profiles').upsert({
      id: USER_ID,
      goal: form.goal,
      goal_due_date: form.goal_due_date || null,
      height_cm: parseFloat(form.height_cm) || null,
      weight_kg: parseFloat(form.weight_kg) || null,
      age: parseInt(form.age) || null,
      sex: form.sex,
      activity_level: form.activity_level,
      diet_preferences: form.diet_preferences,
      workout_preferences: form.workout_preferences,
      daily_calorie_target: calories,
      daily_protein_target: protein,
    })
    setSaving(false)
    router.push('/dashboard')
  }

  const canProceed = [
    form.goal !== '',
    form.height_cm !== '' && form.weight_kg !== '' && form.age !== '',
    form.diet_preferences.length > 0,
    form.workout_preferences.length > 0,
  ][step]

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[...Array(totalSteps)].map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-sky-500' : i < step ? 'w-4 bg-sky-300' : 'w-4 bg-gray-200'}`}
          />
        ))}
      </div>

      <div className="card min-h-[420px] flex flex-col">
        {/* Step 0 — Goal */}
        {step === 0 && (
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">What's your goal?</h2>
            <p className="text-sm text-gray-500 mb-5">We'll personalize your daily plan around this.</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setForm(p => ({ ...p, goal: g.value }))}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${form.goal === g.value ? 'bg-sky-500 border-sky-500 text-white' : 'border-gray-200 text-gray-700 hover:border-sky-300'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Target date (optional)</label>
              <input
                type="date" value={form.goal_due_date}
                onChange={e => setForm(p => ({ ...p, goal_due_date: e.target.value }))}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
          </div>
        )}

        {/* Step 1 — Body stats */}
        {step === 1 && (
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">About you</h2>
            <p className="text-sm text-gray-500 mb-5">Used to calculate your calorie target accurately.</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Height (cm)" placeholder="175">
                <input type="number" value={form.height_cm} onChange={e => setForm(p => ({ ...p, height_cm: e.target.value }))} placeholder="175" className="field-input" />
              </Field>
              <Field label="Weight (kg)" placeholder="70">
                <input type="number" value={form.weight_kg} onChange={e => setForm(p => ({ ...p, weight_kg: e.target.value }))} placeholder="70" className="field-input" />
              </Field>
              <Field label="Age" placeholder="28">
                <input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} placeholder="28" className="field-input" />
              </Field>
              <Field label="Biological sex">
                <select value={form.sex} onChange={e => setForm(p => ({ ...p, sex: e.target.value }))} className="field-input">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Prefer not to say</option>
                </select>
              </Field>
            </div>
            <Field label="Activity level">
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITY_LEVELS.map(al => (
                  <button
                    key={al.value}
                    onClick={() => setForm(p => ({ ...p, activity_level: al.value }))}
                    className={`text-left px-3 py-2 rounded-xl border text-xs transition-colors ${form.activity_level === al.value ? 'bg-sky-50 border-sky-400 text-sky-800' : 'border-gray-200 text-gray-700 hover:border-sky-200'}`}
                  >
                    <div className="font-medium">{al.label}</div>
                    <div className="text-gray-400 mt-0.5">{al.desc}</div>
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* Step 2 — Diet */}
        {step === 2 && (
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Diet preferences</h2>
            <p className="text-sm text-gray-500 mb-5">Select all that apply — AI will respect these when suggesting meals.</p>
            <div className="flex flex-wrap gap-2">
              {DIET_PREFS.map(p => (
                <button
                  key={p}
                  onClick={() => toggleArr('diet_preferences', p)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${form.diet_preferences.includes(p) ? 'bg-sky-500 border-sky-500 text-white' : 'border-gray-200 text-gray-700 hover:border-sky-300'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Workout */}
        {step === 3 && (
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Workout preferences</h2>
            <p className="text-sm text-gray-500 mb-5">AI will suggest workouts you actually enjoy.</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {WORKOUT_PREFS.map(p => (
                <button
                  key={p}
                  onClick={() => toggleArr('workout_preferences', p)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${form.workout_preferences.includes(p) ? 'bg-sky-500 border-sky-500 text-white' : 'border-gray-200 text-gray-700 hover:border-sky-300'}`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Preview calculated targets */}
            {form.height_cm && form.weight_kg && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-sky-700 uppercase mb-2">Your estimated daily targets</div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-lg font-semibold text-sky-800">{estimateCalories().calories}</div>
                    <div className="text-xs text-sky-600">kcal / day</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-sky-800">{estimateCalories().protein}g</div>
                    <div className="text-xs text-sky-600">protein / day</div>
                  </div>
                </div>
                <p className="text-xs text-sky-500 mt-2">Based on Mifflin-St Jeor formula. Adjust in your profile anytime.</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-4 mt-auto border-t border-gray-100">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              ← Back
            </button>
          )}
          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed}
              className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving || !canProceed}
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {saving ? 'Saving...' : '✦ Generate my plan →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, placeholder }: { label: string; children: React.ReactNode; placeholder?: string }) {
  return (
    <div className="mb-3">
      <label className="block text-sm text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
