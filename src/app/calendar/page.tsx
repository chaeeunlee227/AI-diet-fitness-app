'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
type DaySummary = { date: string; calories: number; logged: boolean; workouts: number }

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

  useEffect(() => { if (!authLoading && !user) router.push('/login') }, [user, authLoading])
  useEffect(() => { if (user) loadMonthData() }, [current, user])

  async function loadMonthData() {
    setLoading(true)
    const start = format(startOfMonth(current), 'yyyy-MM-dd')
    const end   = format(endOfMonth(current),   'yyyy-MM-dd')

    const [{ data: foodData }, { data: workoutData }, { data: wData }] = await Promise.all([
      supabase.from('food_logs').select('log_date, calories').eq('user_id', user!.id).gte('log_date', start).lte('log_date', end),
      supabase.from('workout_logs').select('log_date').eq('user_id', user!.id).gte('log_date', start).lte('log_date', end),
      supabase.from('weight_logs').select('log_date, weight_kg').eq('user_id', user!.id).gte('log_date', start).lte('log_date', end).order('log_date'),
    ])

    const map = new Map<string, DaySummary>()
    foodData?.forEach(({ log_date, calories }) => {
      const e = map.get(log_date) ?? { date: log_date, calories: 0, logged: false, workouts: 0 }
      map.set(log_date, { ...e, calories: e.calories + calories, logged: true })
    })
    workoutData?.forEach(({ log_date }) => {
      const e = map.get(log_date) ?? { date: log_date, calories: 0, logged: false, workouts: 0 }
      map.set(log_date, { ...e, workouts: e.workouts + 1 })
    })
    setSummaries(map)
    setWeightData(wData?.map(w => ({ date: w.log_date, weight: w.weight_kg })) || [])
    setLoading(false)
  }

  async function loadDayDetail(date: string) {
    setSelectedDetail(null)
    const [{ data: food }, { data: workouts }] = await Promise.all([
      supabase.from('food_logs').select('*').eq('user_id', user!.id).eq('log_date', date),
      supabase.from('workout_logs').select('*').eq('user_id', user!.id).eq('log_date', date),
    ])
    setSelectedDetail({ food: food || [], workouts: workouts || [] })
  }

  function handleDayClick(date: string) {
    if (selected === date) return
    setSelected(date)
    loadDayDetail(date)
  }

  const monthStart = startOfMonth(current)
  const monthEnd   = endOfMonth(current)
  const calDays    = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) })

  const allSummaries  = Array.from(summaries.values())
  const loggedDays    = allSummaries.filter(s => s.logged).length
  const avgCals       = loggedDays > 0 ? Math.round(allSummaries.filter(s => s.logged).reduce((s, d) => s + d.calories, 0) / loggedDays) : 0
  const totalWorkouts = allSummaries.reduce((s, d) => s + d.workouts, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-green-900">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1))} className="w-8 h-8 border border-green-200 rounded-xl hover:bg-green-50 flex items-center justify-center text-green-700 font-bold">‹</button>
          <span className="text-sm font-black text-green-900 w-32 text-center">{format(current, 'MMMM yyyy')}</span>
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1))} className="w-8 h-8 border border-green-200 rounded-xl hover:bg-green-50 flex items-center justify-center text-green-700 font-bold">›</button>
          <button onClick={() => setCurrent(new Date())} className="ml-1 text-xs text-green-600 hover:underline px-2 py-1 font-bold">Today</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Days logged"     value={`${loggedDays}`}              icon="📋" />
        <StatCard label="Avg calories/day" value={avgCals > 0 ? `${avgCals}` : '—'} icon="🔥" />
        <StatCard label="Workouts"         value={`${totalWorkouts}`}           icon="🏋️" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 card">
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => <div key={d} className="text-center text-xs text-green-400 font-black py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calDays.map(day => {
              const key  = format(day, 'yyyy-MM-dd')
              const s    = summaries.get(key)
              const inMonth = day.getMonth() === current.getMonth()
              const isSel   = selected === key
              const isT     = key === todayKey

              return (
                <button
                  key={key}
                  onClick={() => handleDayClick(key)}
                  className={`
                    aspect-square rounded-xl p-1 flex flex-col items-center justify-center relative transition-all text-xs font-bold
                    ${!inMonth ? 'opacity-30' : ''}
                    ${inMonth && !isT   ? 'hover:bg-green-50' : ''}
                    ${isSel && !isT     ? 'ring-2 ring-green-400 bg-green-50' : ''}
                    ${isSel && isT      ? 'ring-2 ring-green-600 bg-green-500 text-white' : ''}
                    ${isT  && !isSel    ? 'bg-green-500 text-white' : ''}
                    ${!isT && !isSel    ? 'text-green-900' : ''}
                  `}
                >
                  <span>{format(day, 'd')}</span>
                  {s?.logged && (
                    <div className="flex gap-0.5 mt-0.5">
                      <span className={`w-1 h-1 rounded-full ${isT ? 'bg-white' : 'bg-green-400'}`} />
                      {s.workouts > 0 && <span className={`w-1 h-1 rounded-full ${isT ? 'bg-white' : 'bg-emerald-400'}`} />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-green-500 font-semibold">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" />Diet logged</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Workout</span>
          </div>
        </div>

        {/* Day detail */}
        <div className="card">
          {selected ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-green-900">{format(parseISO(selected), 'MMM d, yyyy')}</h3>
                <a href={`/log?date=${selected}`} className="text-xs text-green-600 hover:underline font-bold">Edit →</a>
              </div>
              {selectedDetail ? (
                <>
                  {selectedDetail.food.length === 0 && selectedDetail.workouts.length === 0 ? (
                    <p className="text-sm text-green-300 italic font-semibold">Nothing logged on this day.</p>
                  ) : (
                    <>
                      {selectedDetail.food.length > 0 && (
                        <div className="mb-4">
                          <div className="section-title mb-2">Food</div>
                          <div className="space-y-1">
                            {selectedDetail.food.map((f: any) => (
                              <div key={f.id} className="flex justify-between text-sm">
                                <span className="text-green-900 font-semibold truncate">{f.food_name}</span>
                                <span className="text-green-500 ml-2 flex-shrink-0 font-semibold">{f.calories} kcal</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-green-100 mt-2 pt-2 flex justify-between text-sm font-black">
                            <span className="text-green-800">Total</span>
                            <span className="text-green-600">{selectedDetail.food.reduce((s: number, f: any) => s + f.calories, 0)} kcal</span>
                          </div>
                        </div>
                      )}
                      {selectedDetail.workouts.length > 0 && (
                        <div>
                          <div className="section-title mb-2">Workouts</div>
                          {selectedDetail.workouts.map((w: any) => (
                            <div key={w.id} className="text-sm text-green-900 font-semibold">{w.workout_type} · {w.duration_minutes} min</div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-2"><div className="skeleton h-4" /><div className="skeleton h-4 w-3/4" /></div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-green-300">
              <div className="text-3xl mb-2">📅</div>
              <p className="text-sm font-semibold">Click a day to see details</p>
            </div>
          )}
        </div>
      </div>

      {/* Weight chart */}
      {weightData.length > 1 && (
        <div className="card">
          <h3 className="section-title mb-4">Weight Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dcf2e6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 700 }} tickFormatter={d => format(parseISO(d), 'MMM d')} />
              <YAxis tick={{ fontSize: 11, fontWeight: 700 }} domain={['auto', 'auto']} />
              <Tooltip formatter={(v: any) => [`${v} kg`, 'Weight']} labelFormatter={d => format(parseISO(d), 'MMM d, yyyy')} contentStyle={{ fontFamily: 'Nunito', borderRadius: 12, border: '1.5px solid #b6dfc8' }} />
              <Line type="monotone" dataKey="weight" stroke="#2e9e5b" strokeWidth={2.5} dot={{ r: 3, fill: '#2e9e5b' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card text-center py-4 hover:border-green-300 transition-colors">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-black text-green-900">{value}</div>
      <div className="text-xs text-green-500 mt-0.5 font-bold">{label}</div>
    </div>
  )
}