"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type FoodLog = {
  id: string;
  food_name: string;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  meal_type: MealType;
  quantity_g: number | null;
};
type WorkoutLog = {
  id: string;
  workout_type: string;
  duration_minutes: number;
  calories_burned: number | null;
  notes: string | null;
};

const MEAL_CONFIG: {
  key: MealType;
  icon: string;
  label: string;
  color: string;
}[] = [
  {
    key: "breakfast",
    icon: "🌅",
    label: "Breakfast",
    color: "border-amber-200 bg-amber-50",
  },
  {
    key: "lunch",
    icon: "☀️",
    label: "Lunch",
    color: "border-green-200 bg-green-50",
  },
  {
    key: "dinner",
    icon: "🌙",
    label: "Dinner",
    color: "border-emerald-200 bg-emerald-50",
  },
  {
    key: "snack",
    icon: "🍎",
    label: "Snack",
    color: "border-teal-200 bg-teal-50",
  },
];

export default function LogPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  function getLocalToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const [date, setDate] = useState(getLocalToday());
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [addingMeal, setAddingMeal] = useState<MealType | null>(null);
  const [foodInput, setFoodInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [analyzeError, setAnalyzeError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [workout, setWorkout] = useState({
    type: "",
    duration: "",
    calories: "",
    notes: "",
  });
  const [dailyFeedback, setDailyFeedback] = useState("");
  const [generatingFeedback, setGeneratingFeedback] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading]);
  useEffect(() => {
    if (user) loadLogs();
  }, [date, user]);

  async function loadLogs() {
    const [{ data: food }, { data: workouts }] = await Promise.all([
      supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", user!.id)
        .eq("log_date", date)
        .order("created_at"),
      supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", user!.id)
        .eq("log_date", date)
        .order("created_at"),
    ]);
    setFoodLogs(food || []);
    setWorkoutLogs(workouts || []);
  }

  async function analyzeFood() {
    if (!foodInput.trim()) return;
    setAnalyzing(true);
    setAiResult(null);
    setAnalyzeError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze_food",
          data: { description: foodInput },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setAnalyzeError(json.error ?? "Analysis failed. Please try again.");
      } else {
        setAiResult(json.data);
      }
    } catch (err: any) {
      setAnalyzeError(err?.message ?? "Network error.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveFood() {
    if (!aiResult || !addingMeal) return;
    setSaving(true);
    await supabase.from("food_logs").insert({
      user_id: user!.id,
      log_date: date,
      meal_type: addingMeal,
      food_name: aiResult.food_name,
      calories: aiResult.calories,
      protein_g: aiResult.protein_g,
      carbs_g: aiResult.carbs_g,
      fat_g: aiResult.fat_g,
      quantity_g: aiResult.quantity_g,
    });
    setAddingMeal(null);
    setFoodInput("");
    setAiResult(null);
    setAnalyzeError("");
    setSaving(false);
    loadLogs();
  }

  async function deleteFood(id: string) {
    await supabase.from("food_logs").delete().eq("id", id);
    loadLogs();
  }

  async function saveWorkout() {
    if (!workout.type || !workout.duration) return;
    setSaving(true);
    await supabase.from("workout_logs").insert({
      user_id: user!.id,
      log_date: date,
      workout_type: workout.type,
      duration_minutes: parseInt(workout.duration),
      calories_burned: workout.calories ? parseInt(workout.calories) : null,
      notes: workout.notes || null,
    });
    setWorkout({ type: "", duration: "", calories: "", notes: "" });
    setShowWorkoutForm(false);
    setSaving(false);
    loadLogs();
  }

  async function deleteWorkout(id: string) {
    await supabase.from("workout_logs").delete().eq("id", id);
    loadLogs();
  }

  async function generateFeedback() {
    if (!profile || foodLogs.length === 0) return;
    setGeneratingFeedback(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "daily_feedback",
          data: {
            logs: foodLogs,
            workoutLogs,
            targets: {
              calories: profile.daily_calorie_target,
              protein_g: profile.daily_protein_target,
            },
            date,
          },
        }),
      });
      const { data } = await res.json();
      if (data?.feedback) setDailyFeedback(data.feedback);
    } catch {
      setDailyFeedback("");
    }
    setGeneratingFeedback(false);
  }

  const totalCals = foodLogs.reduce((s, l) => s + l.calories, 0);
  const totalProtein = foodLogs.reduce((s, l) => s + (l.protein_g || 0), 0);
  const totalCarbs = foodLogs.reduce((s, l) => s + (l.carbs_g || 0), 0);
  const totalFat = foodLogs.reduce((s, l) => s + (l.fat_g || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Daily Log</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600"
          >
            ‹
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white"
          />
          <button
            onClick={() => changeDate(1)}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600"
          >
            ›
          </button>

          {/* Generate daily feedback */}
          <button
            onClick={generateFeedback}
            disabled={generatingFeedback || foodLogs.length === 0}
            className="text-xs bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            title={
              foodLogs.length === 0
                ? "Log some food first"
                : "Generate AI feedback for today"
            }
          >
            {generatingFeedback ? "⏳ Thinking..." : "✦ Daily feedback"}
          </button>
        </div>
      </div>

      {/* AI Daily Feedback */}
      {dailyFeedback && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex gap-3">
          <span className="text-lg flex-shrink-0">✦</span>
          <div className="flex-1">
            <p className="text-sm text-sky-800 leading-relaxed">
              {dailyFeedback}
            </p>
            <button
              onClick={() => setDailyFeedback("")}
              className="mt-2 text-xs text-sky-400 hover:text-sky-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Daily totals */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Calories",
            value: totalCals,
            unit: "kcal",
            color: "text-green-600",
          },
          {
            label: "Protein",
            value: Math.round(totalProtein),
            unit: "g",
            color: "text-green-700",
          },
          {
            label: "Carbs",
            value: Math.round(totalCarbs),
            unit: "g",
            color: "text-amber-600",
          },
          {
            label: "Fat",
            value: Math.round(totalFat),
            unit: "g",
            color: "text-emerald-600",
          },
        ].map((s) => (
          <div key={s.label} className="card text-center py-3">
            <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-green-600 font-semibold">
              {s.label} <span className="text-green-400">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Meal sections */}
      {MEAL_CONFIG.map((meal) => {
        const mealLogs = foodLogs.filter((l) => l.meal_type === meal.key);
        const mealCals = mealLogs.reduce((s, l) => s + l.calories, 0);
        return (
          <div key={meal.key} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{meal.icon}</span>
                <span className="font-black text-green-900">{meal.label}</span>
                {mealCals > 0 && (
                  <span className="text-xs text-green-500 font-bold">
                    {mealCals} kcal
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setAddingMeal(meal.key);
                  setAiResult(null);
                  setAnalyzeError("");
                  setFoodInput("");
                }}
                className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-xl transition-colors font-bold"
              >
                + Add food
              </button>
            </div>

            {mealLogs.length === 0 && addingMeal !== meal.key && (
              <p className="text-sm text-green-300 italic font-semibold">
                Nothing logged yet
              </p>
            )}

            {mealLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 py-2 border-t border-green-50 group"
              >
                <div className="flex-1">
                  <div className="text-sm font-bold text-green-900">
                    {log.food_name}
                  </div>
                  <div className="text-xs text-green-500 font-semibold">
                    {log.quantity_g ? `${log.quantity_g}g · ` : ""}
                    {log.protein_g ? `P: ${Math.round(log.protein_g)}g · ` : ""}
                    {log.carbs_g ? `C: ${Math.round(log.carbs_g)}g · ` : ""}
                    {log.fat_g ? `F: ${Math.round(log.fat_g)}g` : ""}
                  </div>
                </div>
                <span className="text-sm font-black text-green-700">
                  {log.calories} kcal
                </span>
                <button
                  onClick={() => deleteFood(log.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-lg transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}

            {/* Add food form */}
            {addingMeal === meal.key && (
              <div className={`mt-3 p-3 rounded-2xl border ${meal.color}`}>
                <div className="flex gap-2 mb-3">
                  <input
                    value={foodInput}
                    onChange={(e) => {
                      setFoodInput(e.target.value);
                      setAnalyzeError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && analyzeFood()}
                    placeholder="e.g. 2 scrambled eggs with toast..."
                    className="flex-1 border border-green-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300 font-semibold"
                    autoFocus
                  />
                  <button
                    onClick={analyzeFood}
                    disabled={analyzing || !foodInput.trim()}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm transition-colors whitespace-nowrap font-bold"
                  >
                    {analyzing ? "⏳ Analyzing..." : "✦ Analyze"}
                  </button>
                </div>

                {analyzeError && (
                  <p className="msg-error mb-3">⚠ {analyzeError}</p>
                )}

                {aiResult && (
                  <div className="bg-white rounded-2xl border border-green-100 p-3 mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-black text-green-900">
                          {aiResult.food_name}
                        </div>
                        {aiResult.quantity_g && (
                          <div className="text-xs text-green-500 font-semibold">
                            ~{aiResult.quantity_g}g serving
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-green-600">
                          {aiResult.calories} kcal
                        </div>
                        <div
                          className={`text-xs font-bold ${aiResult.confidence === "high" ? "text-green-600" : aiResult.confidence === "medium" ? "text-amber-600" : "text-red-500"}`}
                        >
                          {aiResult.confidence} confidence
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-green-600 font-semibold">
                      <span>
                        Protein:{" "}
                        <b className="text-green-900">{aiResult.protein_g}g</b>
                      </span>
                      <span>
                        Carbs:{" "}
                        <b className="text-green-900">{aiResult.carbs_g}g</b>
                      </span>
                      <span>
                        Fat: <b className="text-green-900">{aiResult.fat_g}g</b>
                      </span>
                    </div>
                    {aiResult.notes && (
                      <p className="text-xs text-green-400 mt-2 italic font-semibold">
                        {aiResult.notes}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={saveFood}
                        disabled={saving}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl text-sm font-black transition-colors"
                      >
                        {saving ? "Saving..." : "✓ Save"}
                      </button>
                      <button
                        onClick={() => setAiResult(null)}
                        className="px-4 py-2 border border-green-200 rounded-xl text-sm text-green-700 hover:bg-green-50 font-bold"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    setAddingMeal(null);
                    setAiResult(null);
                    setAnalyzeError("");
                  }}
                  className="text-xs text-green-400 hover:text-green-600 font-bold"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Workout section */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏋️</span>
            <span className="font-black text-green-900">Workouts</span>
          </div>
          <button
            onClick={() => setShowWorkoutForm(true)}
            className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-xl transition-colors font-bold"
          >
            + Add workout
          </button>
        </div>

        {workoutLogs.map((w) => (
          <div
            key={w.id}
            className="flex items-center gap-3 py-2 border-t border-green-50 group"
          >
            <span className="text-xl">🏃</span>
            <div className="flex-1">
              <div className="text-sm font-bold text-green-900">
                {w.workout_type}
              </div>
              <div className="text-xs text-green-500 font-semibold">
                {w.duration_minutes} min
                {w.calories_burned
                  ? ` · ~${w.calories_burned} kcal burned`
                  : ""}
                {w.notes ? ` · ${w.notes}` : ""}
              </div>
            </div>
            <button
              onClick={() => deleteWorkout(w.id)}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-lg transition-opacity"
            >
              ×
            </button>
          </div>
        ))}

        {workoutLogs.length === 0 && !showWorkoutForm && (
          <p className="text-sm text-green-300 italic font-semibold">
            No workouts logged
          </p>
        )}

        {showWorkoutForm && (
          <div className="mt-3 p-3 rounded-2xl border border-green-200 bg-green-50">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                value={workout.type}
                onChange={(e) =>
                  setWorkout((p) => ({ ...p, type: e.target.value }))
                }
                placeholder="e.g. Running, Weights..."
                autoFocus
                className="col-span-2 field-input"
              />
              <input
                value={workout.duration}
                onChange={(e) =>
                  setWorkout((p) => ({ ...p, duration: e.target.value }))
                }
                type="number"
                placeholder="Duration (min)"
                className="field-input"
              />
              <input
                value={workout.calories}
                onChange={(e) =>
                  setWorkout((p) => ({ ...p, calories: e.target.value }))
                }
                type="number"
                placeholder="Kcal burned (optional)"
                className="field-input"
              />
              <input
                value={workout.notes}
                onChange={(e) =>
                  setWorkout((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Notes (optional)"
                className="col-span-2 field-input"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveWorkout}
                disabled={saving}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl text-sm font-black transition-colors"
              >
                {saving ? "Saving..." : "Save workout"}
              </button>
              <button
                onClick={() => setShowWorkoutForm(false)}
                className="px-4 py-2 border border-green-200 rounded-xl text-sm text-green-700 hover:bg-green-50 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function changeDate(delta: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(format(d, "yyyy-MM-dd"));
  }
}
