import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingBag,
  Edit3,
  Check
} from "lucide-react";

const COLORS = ["#38bdf8", "#fbbf24", "#34d399", "#f472b6", "#a78bfa", "#fb7185", "#94a3b8"];

export default function FamilyAnalytics({ familyId, familyData, transactions, shoppingList }) {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(familyData?.monthlyBudget || 0);

  // 1. Overall Totals
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netBalance = totalIncome - totalExpense;

  const upcomingCost = shoppingList
    .filter((item) => !item.bought)
    .reduce((sum, item) => sum + Number(item.estimatedCost || 0), 0);

  const monthlyBudget = Number(familyData?.monthlyBudget) || 0;
  const budgetPercent = monthlyBudget > 0 ? Math.min(Math.round((totalExpense / monthlyBudget) * 100), 100) : 0;
  const isOverBudget = monthlyBudget > 0 && totalExpense > monthlyBudget;

  // 2. Category Breakdown (Expenses Only)
  const categoryMap = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + Number(t.amount || 0);
    });

  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 3. Member-by-Member Income vs Spending
  const memberMap = {};
  (familyData?.members || []).forEach((m) => {
    const firstName = m.name.split(" ")[0];
    memberMap[m.uid] = { name: firstName, fullName: m.name, Earned: 0, Spent: 0 };
  });

  transactions.forEach((t) => {
    if (!memberMap[t.addedByUid]) {
      memberMap[t.addedByUid] = {
        name: (t.addedByName || "Member").split(" ")[0],
        fullName: t.addedByName || "Member",
        Earned: 0,
        Spent: 0
      };
    }
    if (t.type === "income") {
      memberMap[t.addedByUid].Earned += Number(t.amount || 0);
    } else {
      memberMap[t.addedByUid].Spent += Number(t.amount || 0);
    }
  });

  const memberData = Object.values(memberMap);

  const handleSaveBudget = async () => {
    await updateDoc(doc(db, "families", familyId), {
      monthlyBudget: Number(budgetInput) || 0
    });
    setEditingBudget(false);
  };

  return (
    <div className="space-y-6">
      {/* Top 4 KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Family Income</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            ₹{totalIncome.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Home Spending</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">
            ₹{totalExpense.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Net Family Balance</span>
            <Wallet className="w-4 h-4 text-sky-400" />
          </div>
          <p className={`text-2xl font-bold ${netBalance >= 0 ? "text-white" : "text-rose-400"}`}>
            ₹{netBalance.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Planned To-Buy Cost</span>
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">
            ₹{upcomingCost.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Monthly Budget Progress Bar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-semibold">Monthly Home Budget Health</h2>
            <p className="text-xs text-slate-400">
              Spent ₹{totalExpense.toLocaleString("en-IN")} of ₹{monthlyBudget.toLocaleString("en-IN")} target
            </p>
          </div>

          {editingBudget ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-32 px-3 py-1.5 rounded-lg bg-slate-900 border border-amber-400 text-sm text-white focus:outline-none"
              />
              <button
                onClick={handleSaveBudget}
                className="p-2 rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer"
                title="Save Budget"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setBudgetInput(monthlyBudget);
                setEditingBudget(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              Edit Budget
            </button>
          )}
        </div>

        <div className="w-full h-3.5 rounded-full bg-slate-900 overflow-hidden border border-white/10">
          <div
            className={`h-full transition-all duration-500 ${
              isOverBudget
                ? "bg-rose-500"
                : budgetPercent > 75
                ? "bg-amber-400"
                : "bg-emerald-400"
            }`}
            style={{ width: `${budgetPercent}%` }}
          />
        </div>
        {isOverBudget && (
          <p className="text-xs text-rose-400 mt-2">
            Heads up! Home spending has exceeded the monthly budget by ₹
            {(totalExpense - monthlyBudget).toLocaleString("en-IN")}.
          </p>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Spending by Category */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-base font-semibold mb-4">Where Home Money Goes (By Category)</h3>
          {categoryData.length === 0 ? (
            <p className="text-slate-400 text-sm py-12 text-center">
              Log some expenses to see your category breakdown chart!
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => `₹${Number(val).toLocaleString("en-IN")}`}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "rgba(255,255,255,0.15)",
                      borderRadius: "12px",
                      color: "#fff"
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right: Member-by-Member Comparison */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-base font-semibold mb-4">Member Earnings vs. Spending</h3>
          {transactions.length === 0 ? (
            <p className="text-slate-400 text-sm py-12 text-center">
              Once members add income or expenses, their comparison will appear here!
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    formatter={(val) => `₹${Number(val).toLocaleString("en-IN")}`}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "rgba(255,255,255,0.15)",
                      borderRadius: "12px",
                      color: "#fff"
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Earned" fill="#34d399" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Spent" fill="#fb7185" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}