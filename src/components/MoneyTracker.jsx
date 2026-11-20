import { useState } from "react";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { PlusCircle, ArrowUpRight, ArrowDownLeft, Trash2 } from "lucide-react";

const EXPENSE_CATEGORIES = ["Groceries", "Bills & Utilities", "Food & Dining", "Shopping", "Transport", "Health", "Other"];
const INCOME_CATEGORIES = ["Salary", "Business / Freelance", "Allowance", "Bonus", "Other"];

export default function MoneyTracker({ familyId, user, transactions }) {
  const [type, setType] = useState("expense"); // "expense" or "income"
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [saving, setSaving] = useState(false);

  const handleTypeSwitch = (newType) => {
    setType(newType);
    setCategory(newType === "expense" ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) return;
    setSaving(true);

    try {
      await addDoc(collection(db, "families", familyId, "transactions"), {
        type,
        title: title.trim(),
        amount: Number(amount),
        category,
        addedByUid: user.uid,
        addedByName: user.displayName || "Family Member",
        createdAt: new Date().toISOString()
      });
      setTitle("");
      setAmount("");
    } catch (err) {
      alert("Error saving entry: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "families", familyId, "transactions", id));
  };

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left: Add Income / Expense Form */}
      <form
        onSubmit={handleAddTransaction}
        className="bg-white/5 border border-white/10 rounded-2xl p-6 h-fit"
      >
        <h2 className="text-lg font-semibold mb-4">Log Money Entry</h2>

        {/* Toggle Expense vs Income */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900/80 border border-white/10 mb-4">
          <button
            type="button"
            onClick={() => handleTypeSwitch("expense")}
            className={`py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
              type === "expense"
                ? "bg-rose-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            - Expense
          </button>
          <button
            type="button"
            onClick={() => handleTypeSwitch("income")}
            className={`py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
              type === "income"
                ? "bg-emerald-500 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            + Income
          </button>
        </div>

        <label className="block text-xs text-slate-400 mb-1">Description</label>
        <input
          type="text"
          placeholder={type === "expense" ? "e.g., Electricity bill, Milk & Bread" : "e.g., Monthly Salary"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/70 border border-white/15 text-white mb-3 focus:outline-none focus:border-amber-400"
        />

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Amount (₹)</label>
            <input
              type="number"
              min="1"
              placeholder="500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/70 border border-white/15 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-amber-400"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          {saving ? "Saving..." : `Add ${type === "expense" ? "Expense" : "Income"}`}
        </button>
      </form>

      {/* Right: Live Family Ledger */}
      <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Family Activity</h2>

        {transactions.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">
            No income or expenses logged yet. Add your first entry on the left!
          </p>
        ) : (
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {transactions.map((item) => {
              const isIncome = item.type === "income";
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isIncome
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="text-xs text-slate-400">
                        <span className="text-sky-300">{item.addedByName}</span> • {item.category} •{" "}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-semibold ${
                        isIncome ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isIncome ? "+" : "-"}₹{item.amount.toLocaleString("en-IN")}
                    </span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}