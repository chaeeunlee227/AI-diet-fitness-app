'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

const GOALS = [
  { value: 'lose_weight',     label: '⬇ Lose weight' },
  { value: 'build_muscle',    label: '💪 Build muscle' },
  { value: 'more_energy',     label: '⚡ More energy' },
  { value: 'eat_healthier',   label: '❤ Eat healthier' },
  { value: 'improve_fitness', label: '🏃 Improve fitness' },
  { value: 'maintain_weight', label: '⚖ Maintain weight' },
]
const DIET_PREFS    = ['No restrictions','Vegetarian','Vegan','Pescatarian','Gluten-free','Dairy-free','Keto','Low carb']
const WORKOUT_PREFS = ['Weights','Running','Cycling','Yoga','Swimming','HIIT','Walking','Sports']
const ACTIVITY_LEVELS = [
  { value: 'sedentary',          label: 'Sedentary',          desc: 'Desk job, little movement' },
  { value: 'lightly_active',     label: 'Lightly active',     desc: '1–3 workouts/week' },
  { value: 'moderately_active',  label: 'Moderately active',  desc: '3–5 workouts/week' },
  { value: 'very_active',        label: 'Very active',         desc: '6–7 workouts/week' },
]

type FormData = {
  goal: string; goal_due_date: string; height_cm: string; weight_kg: string
  age: string; sex: string; activity_level: string
  diet_preferences: string[]; workout_preferences: string[]
  daily_calorie_target: string; daily_protein_target: string
}

const EMPTY_FORM: FormData = {
  goal: 'lose_weight', goal_due_date: '', height_cm: '', weight_kg: '',
  age: '', sex: 'male', activity_level: 'lightly_active',
  diet_preferences: ['No restrictions'], workout_preferences: ['Weights'],
  daily_calorie_target: '', daily_protein_target: '',
}

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [form, setForm]         = useState<FormData>(EMPTY_FORM)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => { if (!authLoading && !user) router.push('/login') }, [user, authLoading])
  useEffect(() => { if (user) loadProfile() }, [user])

  async function loadProfile() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
    if (data && data.height_cm) {
      setForm({
        goal: data.goal || 'lose_weight', goal_due_date: data.goal_due_date || '',
        height_cm: data.height_cm?.toString() || '', weight_kg: data.weight_kg?.toString() || '',
        age: data.age?.toString() || '', sex: data.sex || 'male',
        activity_level: data.activity_level || 'lightly_active',
        diet_preferences: data.diet_preferences || ['No restrictions'],
        workout_preferences: data.workout_preferences || ['Weights'],
        daily_calorie_target: data.daily_calorie_target?.toString() || '',
        daily_protein_target: data.daily_protein_target?.toString() || '',
      })
      setIsNewUser(false)
    } else { setIsNewUser(true) }
    setLoading(false)
  }

  function estimateCalories() {
    const h = parseFloat(form.height_cm) || 170, w = parseFloat(form.weight_kg) || 70, a = parseInt(form.age) || 25
    const bmr = form.sex === 'female' ? 10*w + 6.25*h - 5*a - 161 : 10*w + 6.25*h - 5*a + 5
    const mult: Record<string,number> = { sedentary:1.2, lightly_active:1.375, moderately_active:1.55, very_active:1.725 }
    const tdee = Math.round(bmr * (mult[form.activity_level] || 1.375))
    const adj  = form.goal === 'lose_weight' ? -500 : form.goal === 'build_muscle' ? 300 : 0
    return { calories: Math.max(1200, tdee + adj), protein: Math.round(w * (form.goal === 'build_muscle' ? 2.0 : 1.6)) }
  }

  function toggleArr(key: 'diet_preferences' | 'workout_preferences', val: string) {
    setForm(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter(v => v !== val) : [...p[key], val] }))
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    const { calories, protein } = estimateCalories()
    await supabase.from('profiles').upsert({
      id: user.id, goal: form.goal, goal_due_date: form.goal_due_date || null,
      height_cm: parseFloat(form.height_cm) || null, weight_kg: parseFloat(form.weight_kg) || null,
      age: parseInt(form.age) || null, sex: form.sex, activity_level: form.activity_level,
      diet_preferences: form.diet_preferences, workout_preferences: form.workout_preferences,
      daily_calorie_target: form.daily_calorie_target ? parseInt(form.daily_calorie_target) : calories,
      daily_protein_target: form.daily_protein_target ? parseInt(form.daily_protein_target) : protein,
    })
    setSaving(false); setSaved(true); setIsNewUser(false)
    setTimeout(() => setSaved(false), 3000)
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="card space-y-3"><div className="skeleton h-4 w-32" /><div className="skeleton h-10" /><div className="skeleton h-10" /></div>
      </div>
    )
  }

  const { calories: estCal, protein: estProt } = estimateCalories()

  const chipBase  = "px-4 py-2 rounded-2xl border text-sm font-bold transition-colors cursor-pointer"
  const chipOn    = "bg-green-500 border-green-500 text-white"
  const chipOff   = "border-green-200 text-green-800 hover:border-green-400 hover:bg-green-50"
  const actBase   = "text-left px-3 py-2 rounded-2xl border text-xs transition-colors cursor-pointer w-full"
  const actOn     = "bg-green-50 border-green-400 text-green-900"
  const actOff    = "border-green-100 text-green-800 hover:border-green-300"

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-green-900">{isNewUser ? 'Set up your profile' : 'Your profile'}</h1>
          <p className="text-sm text-green-600 mt-1 font-semibold">{user?.email}</p>
        </div>
        <button onClick={async () => { await signOut(); router.push('/login') }} className="btn-ghost text-sm">Sign out</button>
      </div>

      {isNewUser && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-800 font-semibold">
          👋 Welcome! Fill in your details below so we can personalize your daily plan.
        </div>
      )}

      {/* Goal */}
      <div className="card">
        <h2 className="section-title mb-4">Goal</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {GOALS.map(g => (
            <button key={g.value} onClick={() => setForm(p => ({ ...p, goal: g.value }))}
              className={`${chipBase} ${form.goal === g.value ? chipOn : chipOff}`}>{g.label}</button>
          ))}
        </div>
        <div>
          <label className="block text-sm text-green-700 mb-1.5 font-bold">Target date (optional)</label>
          <input type="date" value={form.goal_due_date} onChange={e => setForm(p => ({ ...p, goal_due_date: e.target.value }))} className="field-input max-w-xs" />
        </div>
      </div>

      {/* Body stats */}
      <div className="card">
        <h2 className="section-title mb-4">Body stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Height (cm)', key: 'height_cm', placeholder: '175' },
            { label: 'Weight (kg)', key: 'weight_kg', placeholder: '70' },
            { label: 'Age',         key: 'age',       placeholder: '28' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm text-green-700 mb-1.5 font-bold">{f.label}</label>
              <input type="number" value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="field-input" />
            </div>
          ))}
          <div>
            <label className="block text-sm text-green-700 mb-1.5 font-bold">Sex</label>
            <select value={form.sex} onChange={e => setForm(p => ({ ...p, sex: e.target.value }))} className="field-input">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-green-700 mb-2 font-bold">Activity level</label>
          <div className="grid grid-cols-2 gap-2">
            {ACTIVITY_LEVELS.map(al => (
              <button key={al.value} onClick={() => setForm(p => ({ ...p, activity_level: al.value }))}
                className={`${actBase} ${form.activity_level === al.value ? actOn : actOff}`}>
                <div className="font-black">{al.label}</div>
                <div className="text-green-500 mt-0.5 font-semibold">{al.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calorie targets */}
      <div className="card">
        <h2 className="section-title mb-1">Daily targets</h2>
        <p className="text-xs text-green-400 mb-4 font-semibold">Auto-calculated from your stats, or override manually.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-green-700 mb-1.5 font-bold">Calories (kcal)</label>
            <input type="number" value={form.daily_calorie_target} onChange={e => setForm(p => ({ ...p, daily_calorie_target: e.target.value }))} placeholder={`Auto: ${estCal}`} className="field-input" />
          </div>
          <div>
            <label className="block text-sm text-green-700 mb-1.5 font-bold">Protein (g)</label>
            <input type="number" value={form.daily_protein_target} onChange={e => setForm(p => ({ ...p, daily_protein_target: e.target.value }))} placeholder={`Auto: ${estProt}`} className="field-input" />
          </div>
        </div>
        {form.height_cm && form.weight_kg && (
          <p className="text-xs text-green-400 mt-2 font-semibold">Based on your stats: {estCal} kcal · {estProt}g protein. Leave blank to use auto.</p>
        )}
      </div>

      {/* Diet preferences */}
      <div className="card">
        <h2 className="section-title mb-4">Diet preferences</h2>
        <div className="flex flex-wrap gap-2">
          {DIET_PREFS.map(p => (
            <button key={p} onClick={() => toggleArr('diet_preferences', p)}
              className={`${chipBase} ${form.diet_preferences.includes(p) ? chipOn : chipOff}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Workout preferences */}
      <div className="card">
        <h2 className="section-title mb-4">Workout preferences</h2>
        <div className="flex flex-wrap gap-2">
          {WORKOUT_PREFS.map(p => (
            <button key={p} onClick={() => toggleArr('workout_preferences', p)}
              className={`${chipBase} ${form.workout_preferences.includes(p) ? chipOn : chipOff}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pb-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-3">
          {saving ? 'Saving...' : isNewUser ? '✦ Save & go to dashboard' : 'Save changes'}
        </button>
        {saved && <span className="msg-success px-3 py-1.5">✓ Saved!</span>}
        {!isNewUser && (
          <button onClick={() => router.push('/dashboard')} className="text-sm text-green-500 hover:text-green-700 font-bold">← Back</button>
        )}
      </div>
    </div>
  )
}