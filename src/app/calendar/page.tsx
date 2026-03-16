‘use client’
import { useEffect, useState } from ‘react’
import { useAuth } from ‘@/lib/auth-context’
import { useRouter } from ‘next/navigation’
import { supabase } from ‘@/lib/supabase’
import {
format, startOfMonth, endOfMonth, eachDayOfInterval,
parseISO, startOfWeek, endOfWeek
} from ‘date-fns’
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from ‘recharts’

const DAYS = [‘Sun’, ‘Mon’, ‘Tue’, ‘Wed’, ‘Thu’, ‘Fri’, ‘Sat’]

type DaySummary = { date: string; calories: number; logged: boolean; workouts: number }

// Get today’s date as a yyyy-MM-dd string using LOCAL time (avoids UTC offset bugs)
function getTodayKey() {
const d = new Date()
const y = d.getFullYear()
const m = String(d.getMonth() + 1).padStart(2, ‘0’)
const day = String(d.getDate()).padStart(2, ‘0’)
return `${y}-${m}-${day}`
}

export default function CalendarPage() {
const { user, loading: authLoading } = useAuth()
const router = useRouter()
const [current, setCurrent] = useState(new Date())
const [summaries, setSummaries] = useState<Map<string, DaySummary>>(new Map())
const [selected, setSelected] = useState<string | null>(null)
const [selectedDetail, setSelectedDetail] = useState<{ food: any[]; workouts: any[] } | null>(null)
const [weightData, setWeightData] = useState<{ date: string; weight: number }[]>([])
const [loading, setLoading] = useState(true)

const todayKey = getTodayKey()

useEffect(() => { if (!authLoading && !user) router.push(’/login’) }, [user, authLoading])
useEffect(() => { if (user) loadMonthData() }, [current, user])

async function loadMonthData() {
setLoading(true)
const start = format(startOfMonth(current), ‘yyyy-MM-dd’)
const end = format(endOfMonth(current), ‘yyyy-MM-dd’)

```
const [{ data: foodData }, { data: workoutData }, { data: wData }] = await Promise.all([
  supabase.from('food_logs').select('log_date, calories').eq('user_id', user!.id).gte('log_date', start).lte('log_date', end),
  supabase.from('workout_logs').select('log_date').eq('user_id', user!.id).gte('log_date', start).lte('log_date', end),
  supabase.from('weight_logs').select('log_date, weight_kg').eq('user_id', user!.id).gte('log_date', start).lte('log_date', end).order('log_date'),
])

const map = new Map<string, DaySummary>()
foodData?.forEach(({ log_date, calories }) => {
  const existing = map.get(log_date) ?? { date: log_date, calories: 0, logged: false, workouts: 0 }
  map.set(log_date, { ...existing, calories: existing.calories + calories, logged: true })
})
workoutData?.forEach(({ log_date }) => {
  const existing = map.get(log_date) ?? { date: log_date, calories: 0, logged: false, workouts: 0 }
  map.set(log_date, { ...existing, workouts: existing.workouts + 1 })
})
setSummaries(map)
setWeightData(wData?.map(w => ({ date: w.log_date, weight: w.weight_kg })) || [])
setLoading(false)
```

}

async function loadDayDetail(date: string) {
// Reset to null so loading skeleton shows while fetching
setSelectedDetail(null)
const [{ data: food }, { data: workouts }] = await Promise.all([
supabase.from(‘food_logs’).select(’*’).eq(‘user_id’, user!.id).eq(‘log_date’, date),
supabase.from(‘workout_logs’).select(’*’).eq(‘user_id’, user!.id).eq(‘log_date’, date),
])
setSelectedDetail({ food: food || [], workouts: workouts || [] })
}

function handleDayClick(date: string) {
// If clicking the already-selected date, keep it selected and don’t re-fetch
if (selected === date) return
setSelected(date)
loadDayDetail(date)
}

// Calendar grid
const monthStart = startOfMonth(current)
const monthEnd = endOfMonth(current)
const calStart = startOfWeek(monthStart)
const calEnd = endOfWeek(monthEnd)
const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

// Monthly stats
const allSummaries = Array.from(summaries.values())
const loggedDays = allSummaries.filter(s => s.logged).length
const avgCals = loggedDays > 0 ? Math.round(allSummaries.filter(s => s.logged).reduce((s, d) => s + d.calories, 0) / loggedDays) : 0
const totalWorkouts = allSummaries.reduce((s, d) => s + d.workouts, 0)

return (
<div className="space-y-6">
{/* Header */}
<div className="flex items-center justify-between">
<h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
<div className="flex items-center gap-2">
<button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1))}
className=“w-8 h-8 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center text-gray-600”>‹</button>
<span className="text-sm font-medium text-gray-700 w-32 text-center">{format(current, ‘MMMM yyyy’)}</span>
<button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1))}
className=“w-8 h-8 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center text-gray-600”>›</button>
<button onClick={() => setCurrent(new Date())}
className=“ml-1 text-xs text-sky-600 hover:underline px-2 py-1”>Today</button>
</div>
</div>

```
  {/* Monthly stats */}
  <div className="grid grid-cols-3 gap-4">
    <StatCard label="Days logged" value={`${loggedDays}`} icon="📋" />
    <StatCard label="Avg calories/day" value={avgCals > 0 ? `${avgCals}` : '—'} icon="🔥" />
    <StatCard label="Workouts" value={`${totalWorkouts}`} icon="🏋️" />
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Calendar */}
    <div className="lg:col-span-2 card">
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calDays.map(day => {
          // Use string key comparison for today — avoids timezone issues with isToday()
          const key = format(day, 'yyyy-MM-dd')
          const s = summaries.get(key)
          const isCurrentMonth = day.getMonth() === current.getMonth()
          const isSel = selected === key
          const isT = key === todayKey

          return (
            <button
              key={key}
              onClick={() => handleDayClick(key)}
              className={`
                aspect-square rounded-lg p-1 flex flex-col items-center justify-center relative transition-all text-xs
                ${isCurrentMonth ? 'hover:bg-gray-50' : 'opacity-30'}
                ${isSel && !isT ? 'ring-2 ring-sky-400 bg-sky-50' : ''}
                ${isSel && isT ? 'ring-2 ring-sky-600 bg-sky-500 text-white' : ''}
                ${isT && !isSel ? 'bg-sky-500 text-white' : ''}
                ${!isT && !isSel ? 'text-gray-700' : ''}
              `}
            >
              <span className={`font-medium ${isT ? 'text-white' : ''}`}>{format(day, 'd')}</span>
              {s?.logged && (
                <div className="flex gap-0.5 mt-0.5">
                  {/* Green dot for diet - always show on non-today days; show white on today */}
                  <span className={`w-1 h-1 rounded-full ${isT ? 'bg-white' : 'bg-green-400'}`} />
                  {s.workouts > 0 && (
                    <span className={`w-1 h-1 rounded-full ${isT ? 'bg-white' : 'bg-blue-400'}`} />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" />Diet logged</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Workout</span>
      </div>
    </div>

    {/* Day detail panel */}
    <div className="card">
      {selected ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-800">{format(parseISO(selected), 'MMM d, yyyy')}</h3>
            <a href={`/log?date=${selected}`} className="text-xs text-sky-600 hover:underline">Edit →</a>
          </div>
          {selectedDetail ? (
            <>
              {selectedDetail.food.length === 0 && selectedDetail.workouts.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Nothing logged on this day.</p>
              ) : (
                <>
                  {selectedDetail.food.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Food</div>
                      <div className="space-y-1">
                        {selectedDetail.food.map((f: any) => (
                          <div key={f.id} className="flex justify-between text-sm">
                            <span className="text-gray-700 truncate">{f.food_name}</span>
                            <span className="text-gray-500 ml-2 flex-shrink-0">{f.calories} kcal</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between text-sm font-medium">
                        <span className="text-gray-700">Total</span>
                        <span className="text-sky-600">{selectedDetail.food.reduce((s: number, f: any) => s + f.calories, 0)} kcal</span>
                      </div>
                    </div>
                  )}
                  {selectedDetail.workouts.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Workouts</div>
                      {selectedDetail.workouts.map((w: any) => (
                        <div key={w.id} className="text-sm text-gray-700">{w.workout_type} · {w.duration_minutes} min</div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <div className="skeleton h-4" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          <div className="text-3xl mb-2">📅</div>
          Click a day to see details
        </div>
      )}
    </div>
  </div>

  {/* Weight trend chart */}
  {weightData.length > 1 && (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Weight Trend</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={weightData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => format(parseISO(d), 'MMM d')} />
          <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
          <Tooltip formatter={(v: any) => [`${v} kg`, 'Weight']} labelFormatter={d => format(parseISO(d), 'MMM d, yyyy')} />
          <Line type="monotone" dataKey="weight" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )}
</div>
```

)
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
return (
<div className="card text-center py-4">
<div className="text-2xl mb-1">{icon}</div>
<div className="text-xl font-bold text-gray-900">{value}</div>
<div className="text-xs text-gray-500 mt-0.5">{label}</div>
</div>
)
}
