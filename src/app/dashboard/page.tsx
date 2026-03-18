"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Plan = {
  daily_calories: number;
  daily_protein_g: number;
  tip: string;
  meals: Record<
    string,
    { name: string; calories: number; description: string }
  >;
  workout: {
    name: string;
    duration_minutes: number;
    description: string;
    calories_burned: number;
  };
};

type FoodLog = {
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  meal_type: string;
  food_name: string;
};
type WorkoutLog = {
  workout_type: string;
  duration_minutes: number;
  calories_burned: number | null;
};

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};
const MEAL_COLORS: Record<string, string> = {
  breakfast: "bg-amber-50 border-amber-200",
  lunch: "bg-green-50 border-green-200",
  dinner: "bg-emerald-50 border-emerald-200",
  snack: "bg-teal-50 border-teal-200",
};

function getPlanCacheKey(userId: string, date: string) {
  return `ht_plan_${userId}_${date}`;
}
function loadCachedPlan(userId: string, date: string): Plan | null {
  try {
    const raw = localStorage.getItem(getPlanCacheKey(userId, date));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function savePlanCache(userId: string, date: string, plan: Plan) {
  try {
    localStorage.setItem(getPlanCacheKey(userId, date), JSON.stringify(plan));
  } catch {}
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [weeklyData, setWeeklyData] = useState<
    { date: string; label: string; calories: number }[]
  >([]);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    daily_calorie_target: number;
    daily_protein_target: number;
    goal: string;
  } | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const sevenDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading]);
  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    const userId = user!.id;

    const [
      { data: profileData },
      { data: foodData },
      { data: workoutData },
      { data: weekData },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", today),
      supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", today),
      supabase
        .from("food_logs")
        .select("log_date, calories")
        .eq("user_id", userId)
        .gte("log_date", sevenDaysAgo)
        .lte("log_date", today),
    ]);

    setProfile(profileData);
    setFoodLogs(foodData || []);
    setWorkoutLogs(workoutData || []);

    const dayMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      dayMap.set(format(subDays(new Date(), i), "yyyy-MM-dd"), 0);
    }
    weekData?.forEach(
      ({ log_date, calories }: { log_date: string; calories: number }) => {
        dayMap.set(log_date, (dayMap.get(log_date) || 0) + calories);
      },
    );
    setWeeklyData(
      Array.from(dayMap.entries()).map(([date, calories]) => ({
        date,
        calories,
        label: format(new Date(date + "T00:00:00"), "MM/dd"),
      })),
    );

    setLoading(false);
    const cached = loadCachedPlan(userId, today);
    if (cached) setPlan(cached);
  }

  async function generatePlan(force = false) {
    if (!profile || !user || planLoading) return;
    const cached = loadCachedPlan(user.id, today);
    if (cached && !force) {
      setPlan(cached);
      return;
    }

    setPlanLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_plan", data: { profile } }),
      });
      const { data: planData } = await res.json();
      if (planData) {
        setPlan(planData);
        savePlanCache(user.id, today, planData);
      }
    } catch (e) {
      console.error("AI plan failed", e);
    }
    setPlanLoading(false);

    if (foodLogs.length > 0) {
      try {
        const fbRes = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "daily_feedback",
            data: {
              logs: foodLogs,
              targets: {
                calories: profile.daily_calorie_target,
                protein_g: profile.daily_protein_target,
              },
              date: today,
            },
          }),
        });
        const { data: fbData } = await fbRes.json();
        if (fbData?.feedback) setFeedback(fbData.feedback);
      } catch (e) {
        console.error("AI feedback failed", e);
      }
    }
  }

  const totalCals = foodLogs.reduce((s, l) => s + l.calories, 0);
  const totalProtein = foodLogs.reduce((s, l) => s + (l.protein_g || 0), 0);
  const calTarget = profile?.daily_calorie_target ?? 2000;
  const protTarget = profile?.daily_protein_target ?? 150;
  const calPct = Math.min(100, Math.round((totalCals / calTarget) * 100));
  const calRemaining = Math.max(0, calTarget - totalCals);

  const R = 52,
    C = 2 * Math.PI * R;
  const calDash = C - (calPct / 100) * C;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-56" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-green-900">
            Good {getGreeting()}, you! 👋
          </h1>
          <p className="text-green-700 text-sm mt-1 font-semibold">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
      </div>

      {/* AI Feedback banner */}
      {feedback && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex gap-3">
          <span className="text-lg flex-shrink-0">✦</span>
          <p className="text-sm text-green-900 leading-relaxed font-semibold">
            {feedback}
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Calorie ring */}
        <div className="card flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke="#dcf2e6"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={calPct >= 100 ? "#16a34a" : "#2e9e5b"}
                strokeWidth="10"
                strokeDasharray={C}
                strokeDashoffset={calDash}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black text-green-900">
                {totalCals}
              </span>
              <span className="text-xs text-green-600 font-bold">kcal</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-green-900">
              Calories today
            </div>
            <div className="text-xs text-green-600 mt-1 font-semibold">
              Goal: {calTarget} kcal
            </div>
            <div className="text-xs text-green-500 mt-1 font-semibold">
              {calRemaining} remaining
            </div>
            <div className="mt-2 h-1.5 bg-green-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${calPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="card space-y-3">
          <div className="text-sm font-bold text-green-900">Macros</div>
          <MacroBar
            label="Protein"
            value={totalProtein}
            target={protTarget}
            unit="g"
            color="bg-green-500"
          />
          <MacroBar
            label="Carbs"
            value={foodLogs.reduce((s, l) => s + (l.carbs_g || 0), 0)}
            target={Math.round((calTarget * 0.45) / 4)}
            unit="g"
            color="bg-amber-400"
          />
          <MacroBar
            label="Fat"
            value={foodLogs.reduce((s, l) => s + (l.fat_g || 0), 0)}
            target={Math.round((calTarget * 0.3) / 9)}
            unit="g"
            color="bg-emerald-400"
          />
        </div>

        {/* Workout summary */}
        <div className="card">
          <div className="text-sm font-bold text-green-900 mb-3">
            Today's activity
          </div>
          {workoutLogs.length === 0 ? (
            <div className="text-sm text-green-400 italic font-semibold">
              No workouts logged yet
            </div>
          ) : (
            <div className="space-y-2">
              {workoutLogs.map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-lg">🏃</span>
                  <div>
                    <div className="text-sm font-bold text-green-900">
                      {w.workout_type}
                    </div>
                    <div className="text-xs text-green-600 font-semibold">
                      {w.duration_minutes} min · {w.calories_burned || "—"} kcal
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <a
            href="/log"
            className="mt-3 block text-xs text-green-600 hover:text-green-800 font-bold"
          >
            + Log workout
          </a>
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span>📊</span>
          <h2 className="section-title">This week at a glance</h2>
        </div>
        {weeklyData.every((d) => d.calories === 0) ? (
          <p className="text-sm text-green-400 italic text-center py-6 font-semibold">
            No data logged this week yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={weeklyData}
              barCategoryGap="30%"
              onClick={(data) => {
                if (data?.activePayload?.[0]?.payload?.date) {
                  router.push(
                    `/log?date=${data.activePayload[0].payload.date}`,
                  );
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#5a8a6a", fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, "auto"]} />
              <Tooltip
                formatter={(v: number) => [`${v} kcal`, "Calories"]}
                labelFormatter={(label) => label}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 12,
                  border: "1.5px solid #86efac",
                  fontFamily: "Nunito",
                  background: "#f0fdf4",
                  color: "#14532d",
                }}
                cursor={{ fill: "#bbf7d0", opacity: 0.6, radius: 6 }}
              />
              <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                {weeklyData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.date === today ? "#2e9e5b" : "#86efac"}
                  />
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
            <h2 className="section-title">AI suggested plan for today</h2>
          </div>
          <div className="flex items-center gap-2">
            {plan ? (
              <button
                onClick={() => generatePlan(true)}
                disabled={planLoading}
                className="text-xs text-green-600 border border-green-200 hover:bg-green-50 px-2.5 py-1.5 rounded-xl transition-colors disabled:opacity-40 font-bold"
              >
                {planLoading ? "…" : "↺ Regenerate"}
              </button>
            ) : (
              <button
                onClick={() => generatePlan(false)}
                disabled={planLoading || !profile}
                className="btn-primary text-sm"
              >
                {planLoading ? (
                  <>
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    Generating…
                  </>
                ) : (
                  "✦ Generate today's plan"
                )}
              </button>
            )}
          </div>
        </div>

        {planLoading && !plan && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
            <div className="skeleton h-14 rounded-xl" />
          </div>
        )}

        {!planLoading && !plan && (
          <div className="text-center py-8 text-green-400">
            <div className="text-4xl mb-3">🥗</div>
            <p className="text-sm font-semibold">
              {profile ? (
                "Click the button above to get a personalized meal & workout plan."
              ) : (
                <>
                  <a
                    href="/profile"
                    className="text-green-600 hover:underline font-bold"
                  >
                    Complete your profile
                  </a>{" "}
                  first.
                </>
              )}
            </p>
          </div>
        )}

        {plan && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {(["breakfast", "lunch", "dinner", "snack"] as const).map(
                (meal) => (
                  <div
                    key={meal}
                    className={`rounded-2xl border p-3 ${MEAL_COLORS[meal]}`}
                  >
                    <div className="text-lg mb-1">{MEAL_ICONS[meal]}</div>
                    <div className="text-xs font-black text-green-800 capitalize">
                      {meal}
                    </div>
                    <div className="text-sm font-bold text-green-900 mt-1 leading-tight">
                      {plan.meals[meal]?.name}
                    </div>
                    <div className="text-xs text-green-600 mt-1 font-semibold">
                      {plan.meals[meal]?.calories} kcal
                    </div>
                  </div>
                ),
              )}
            </div>
            {plan.workout && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-start gap-3 mb-3">
                <span className="text-xl">🏋️</span>
                <div>
                  <div className="text-sm font-black text-green-900">
                    {plan.workout.name} · {plan.workout.duration_minutes} min
                  </div>
                  <div className="text-xs text-green-700 mt-0.5 font-semibold">
                    {plan.workout.description}
                  </div>
                </div>
              </div>
            )}
            {plan.tip && (
              <div className="text-sm text-green-700 italic border-t border-green-100 pt-3 font-semibold">
                💡 {plan.tip}
              </div>
            )}
            <p className="text-xs text-green-300 mt-3 text-right font-bold">
              Cached for today · regenerate to refresh
            </p>
          </>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <a
          href="/log"
          className="card hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer text-center py-5 block"
        >
          <div className="text-3xl mb-2">📋</div>
          <div className="text-sm font-bold text-green-900">
            Log today's meals
          </div>
          <div className="text-xs text-green-500 mt-1 font-semibold">
            {foodLogs.length} items logged
          </div>
        </a>
        <a
          href="/calendar"
          className="card hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer text-center py-5 block"
        >
          <div className="text-3xl mb-2">📅</div>
          <div className="text-sm font-bold text-green-900">View calendar</div>
          <div className="text-xs text-green-500 mt-1 font-semibold">
            See your progress
          </div>
        </a>
      </div>
    </div>
  );
}

function MacroBar({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-green-800 font-bold">{label}</span>
        <span className="text-green-600 font-semibold">
          {Math.round(value)}
          {unit} / {target}
          {unit}
        </span>
      </div>
      <div className="h-1.5 bg-green-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
