"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { format, subDays } from "date-fns";

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
  dinner: "bg-blue-50 border-blue-200",
  snack: "bg-pink-50 border-pink-200",
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [weekLoading, setWeekLoading] = useState(true)
  const [plan, setPlan] = useState<Plan | null>(null);
  const [weekStats, setWeekStats] = useState<{ date: string; calories: number; logged: boolean; workouts: number }[]>([])
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [profile, setProfile] = useState<{
    daily_calorie_target: number | null;
    daily_protein_target: number | null;
    goal: string;
    height_cm: number | null;
    weight_kg: number | null;
    age: number | null;
    sex: string;
    activity_level: string;
  } | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading]);
  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    const userId = user!.id;
    const [weekStats, setWeekStats] = useState<
      { date: string; calories: number; logged: boolean; workouts: number }[]
    >([]);
    const [{ data: profileData }, { data: foodData }, { data: workoutData }] =
      await Promise.all([
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
      ]);

    // Get last 7 days of food + workout logs
    setWeekLoading(true)
    const weekStart = format(subDays(new Date(), 6), "yyyy-MM-dd");
    const [{ data: weekFood }, { data: weekWorkouts }] = await Promise.all([
      supabase
        .from("food_logs")
        .select("log_date, calories")
        .eq("user_id", userId)
        .gte("log_date", weekStart)
        .lte("log_date", today),
      supabase
        .from("workout_logs")
        .select("log_date")
        .eq("user_id", userId)
        .gte("log_date", weekStart)
        .lte("log_date", today),
    ]);

    // Build a map of the last 7 days
    const map = new Map<
      string,
      { calories: number; logged: boolean; workouts: number }
    >();
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      map.set(d, { calories: 0, logged: false, workouts: 0 });
    }
    weekFood?.forEach(({ log_date, calories }) => {
      const e = map.get(log_date);
      if (e)
        map.set(log_date, {
          ...e,
          calories: e.calories + calories,
          logged: true,
        });
    });
    weekWorkouts?.forEach(({ log_date }) => {
      const e = map.get(log_date);
      if (e) map.set(log_date, { ...e, workouts: e.workouts + 1 });
    });
    setWeekStats(
      Array.from(map.entries()).map(([date, v]) => ({ date, ...v })),
    );
    setWeekLoading(false) 

    if (profileData && profileData.height_cm) {
      setProfile(profileData);
      setFoodLogs(foodData || []);
      setWorkoutLogs(workoutData || []);

      // Calculate streak
      await calculateStreak(userId);

      // Generate AI plan
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "generate_plan",
            data: { profile: profileData },
          }),
        });
        const { data: planData } = await res.json();
        if (planData?.meals) setPlan(planData);
      } catch {
        // Plan generation failed silently — rest of dashboard still loads fine
      }

      // Get AI feedback if there are logs
      if (foodData && foodData.length > 0) {
        const fbRes = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "daily_feedback",
            data: {
              logs: foodData,
              targets: {
                calories: profileData.daily_calorie_target,
                protein_g: profileData.daily_protein_target,
              },
              date: today,
            },
          }),
        });
        const { data: fbData } = await fbRes.json();
        if (fbData?.feedback) setFeedback(fbData.feedback);
      }
    } else {
      // Profile incomplete — send to profile setup
      router.push("/profile");
    }

    setLoading(false);
  }

  async function calculateStreak(userId: string) {
    const { data } = await supabase
      .from("food_logs")
      .select("log_date")
      .eq("user_id", userId)
      .order("log_date", { ascending: false });

    if (!data || data.length === 0) {
      setStreak(0);
      return;
    }

    const loggedDates = new Set(data.map((r) => r.log_date));

    let count = 0;
    let cursor = new Date();
    while (true) {
      const dateStr = format(cursor, "yyyy-MM-dd");
      if (loggedDates.has(dateStr)) {
        count++;
        cursor = subDays(cursor, 1);
      } else {
        break;
      }
    }

    setStreak(count);
  }

  const totalCals = foodLogs.reduce((s, l) => s + l.calories, 0);
  const totalProtein = foodLogs.reduce((s, l) => s + (l.protein_g || 0), 0);
  // AFTER — add a helper function above the return, then use it:
  function computeTargets(p: typeof profile) {
    if (!p) return { calories: 2000, protein: 150 };
    if (p.daily_calorie_target && p.daily_protein_target)
      return {
        calories: p.daily_calorie_target,
        protein: p.daily_protein_target,
      };
    // Fall back to BMR estimate from profile stats
    const h = (p as any).height_cm || 170;
    const w = (p as any).weight_kg || 70;
    const a = (p as any).age || 25;
    const sex = (p as any).sex || "male";
    const activity = (p as any).activity_level || "lightly_active";
    const goal = p.goal || "lose_weight";
    const bmr =
      sex === "female"
        ? 10 * w + 6.25 * h - 5 * a - 161
        : 10 * w + 6.25 * h - 5 * a + 5;
    const mult: Record<string, number> = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
    };
    const tdee = Math.round(bmr * (mult[activity] || 1.375));
    const adj =
      goal === "lose_weight" ? -500 : goal === "build_muscle" ? 300 : 0;
    return {
      calories: Math.max(1200, tdee + adj),
      protein: Math.round(w * (goal === "build_muscle" ? 2.0 : 1.6)),
    };
  }

  const { calories: calTarget, protein: protTarget } = computeTargets(profile);
  const calPct = Math.min(100, Math.round((totalCals / calTarget) * 100));
  const protPct = Math.min(100, Math.round((totalProtein / protTarget) * 100));
  const calRemaining = Math.max(0, calTarget - totalCals);

  // SVG ring helpers
  const R = 52,
    C = 2 * Math.PI * R;
  const calDash = C - (calPct / 100) * C;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Good {getGreeting()}, you! 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
        {/* Streak badge — only shown when streak > 0 */}
        {streak > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <span className="text-xl">🔥</span>
            <div>
              <div className="text-lg font-semibold text-amber-700">
                {streak}
              </div>
              <div className="text-xs text-amber-600">day streak</div>
            </div>
          </div>
        )}
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
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={calPct >= 100 ? "#16a34a" : "#0284c7"}
                strokeWidth="10"
                strokeDasharray={C}
                strokeDashoffset={calDash}
                strokeLinecap="round"
                className="ring-progress"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold text-gray-900">
                {totalCals}
              </span>
              <span className="text-xs text-gray-500">kcal</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700">
              Calories today
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Goal: {calTarget} kcal
            </div>
            <div className="text-xs text-sky-600 mt-1">
              {calRemaining} remaining
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all"
                style={{ width: `${calPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="card space-y-3">
          <div className="text-sm font-medium text-gray-700">Macros</div>
          <MacroBar
            label="Protein"
            value={totalProtein}
            target={protTarget}
            unit="g"
            color="bg-blue-500"
          />
          <MacroBar
            label="Carbs"
            value={foodLogs.reduce((s, l: any) => s + (l.carbs_g || 0), 0)}
            target={Math.round((calTarget * 0.45) / 4)}
            unit="g"
            color="bg-amber-400"
          />
          <MacroBar
            label="Fat"
            value={foodLogs.reduce((s, l: any) => s + (l.fat_g || 0), 0)}
            target={Math.round((calTarget * 0.3) / 9)}
            unit="g"
            color="bg-purple-400"
          />
        </div>

        {/* Workout summary */}
        <div className="card">
          <div className="text-sm font-medium text-gray-700 mb-3">
            Today's activity
          </div>
          {workoutLogs.length === 0 ? (
            <div className="text-sm text-gray-400 italic">
              No workouts logged yet
            </div>
          ) : (
            <div className="space-y-2">
              {workoutLogs.map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-lg">🏃</span>
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {w.workout_type}
                    </div>
                    <div className="text-xs text-gray-500">
                      {w.duration_minutes} min · {w.calories_burned || "—"} kcal
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <a
            href="/log"
            className="mt-3 block text-xs text-sky-600 hover:underline"
          >
            + Log workout
          </a>
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">📊</span>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            This week at a glance
          </h2>
        </div>

        {weekLoading ? (
          <div className="space-y-3">
            <div className="skeleton h-4 w-48" />
            <div className="skeleton h-16" />
          </div>
        ) : weekStats.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            No data yet — start logging to see your weekly progress.
          </p>
        ) : (
          <>
            {/* Stat pills */}
            {(() => {
              const loggedDays = weekStats.filter((d) => d.logged).length;
              const avgCals =
                loggedDays > 0
                  ? Math.round(
                      weekStats
                        .filter((d) => d.logged)
                        .reduce((s, d) => s + d.calories, 0) / loggedDays,
                    )
                  : 0;
              const totalWorkouts = weekStats.reduce(
                (s, d) => s + d.workouts,
                0,
              );
              const streak = (() => {
                let count = 0;
                for (let i = weekStats.length - 1; i >= 0; i--) {
                  if (weekStats[i].logged) count++;
                  else break;
                }
                return count;
              })();
              return (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-center">
                    <div className="text-xl font-semibold text-sky-700">
                      {loggedDays}
                      <span className="text-sm font-normal">/7</span>
                    </div>
                    <div className="text-xs text-sky-500 mt-0.5">
                      Days logged
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                    <div className="text-xl font-semibold text-amber-700">
                      {avgCals > 0 ? avgCals.toLocaleString() : "—"}
                    </div>
                    <div className="text-xs text-amber-500 mt-0.5">
                      Avg kcal/day
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                    <div className="text-xl font-semibold text-green-700">
                      {totalWorkouts}
                    </div>
                    <div className="text-xs text-green-500 mt-0.5">
                      Workouts
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Day bar strip */}
            <div className="grid grid-cols-7 gap-1">
              {weekStats.map(({ date, calories, logged, workouts }) => {
                const pct =
                  logged && calTarget > 0
                    ? Math.min(100, Math.round((calories / calTarget) * 100))
                    : 0;
                const dayLabel = format(new Date(date + "T00:00:00"), "EEE");
                const isToday = date === today;
                return (
                  <div key={date} className="flex flex-col items-center gap-1">
                    <div className="text-xs text-gray-400">{dayLabel}</div>
                    <div className="w-full h-16 bg-gray-100 rounded-lg relative overflow-hidden">
                      {logged && (
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-sky-400 rounded-lg transition-all"
                          style={{ height: `${pct}%` }}
                        />
                      )}
                    </div>
                    {workouts > 0 && <div className="text-xs">🏃</div>}
                    {isToday && (
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Bar height = % of your daily calorie goal
            </p>
          </>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <a
          href="/log"
          className="card hover:border-sky-300 hover:bg-sky-50 transition-colors cursor-pointer text-center py-5 block"
        >
          <div className="text-3xl mb-2">📋</div>
          <div className="text-sm font-medium text-gray-700">
            Log today's meals
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {foodLogs.length} items logged
          </div>
        </a>
        <a
          href="/calendar"
          className="card hover:border-sky-300 hover:bg-sky-50 transition-colors cursor-pointer text-center py-5 block"
        >
          <div className="text-3xl mb-2">📅</div>
          <div className="text-sm font-medium text-gray-700">View calendar</div>
          <div className="text-xs text-gray-400 mt-1">See your progress</div>
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
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-500">
          {Math.round(value)}
          {unit} / {target}
          {unit}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
