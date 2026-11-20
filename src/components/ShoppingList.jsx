import { useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { ShoppingCart, CheckCircle2, Trash2, Sparkles } from "lucide-react";

export default function ShoppingList({ familyId, user, items }) {
  const [name, setName] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [listType, setListType] = useState("Groceries");
  const [adding, setAdding] = useState(false);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);

    try {
      await addDoc(collection(db, "families", familyId, "shoppingList"), {
        name: name.trim(),
        estimatedCost: Number(estimatedCost) || 0,
        listType,
        bought: false,
        requestedBy: user.displayName || "Family Member",
        createdAt: new Date().toISOString()
      });
      setName("");
      setEstimatedCost("");
    } catch (err) {
      alert("Error adding item: " + err.message);
    } finally {
      setAdding(false);
    }
  };

  // Mark item bought AND automatically record it as a family expense!
  const handleMarkBought = async (item) => {
    await updateDoc(doc(db, "families", familyId, "shoppingList", item.id), {
      bought: true,
      boughtBy: user.displayName || "Family Member"
    });

    if (item.estimatedCost > 0) {
      await addDoc(collection(db, "families", familyId, "transactions"), {
        type: "expense",
        title: `${item.name} (${item.listType})`,
        amount: item.estimatedCost,
        category: item.listType === "Groceries" ? "Groceries" : "Shopping",
        addedByUid: user.uid,
        addedByName: user.displayName || "Family Member",
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "families", familyId, "shoppingList", id));
  };

  const pendingItems = items.filter((i) => !i.bought);
  const boughtItems = items.filter((i) => i.bought);
  const totalPlannedCost = pendingItems.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left: Add Item to Buy Next */}
      <form
        onSubmit={handleAddItem}
        className="bg-white/5 border border-white/10 rounded-2xl p-6 h-fit"
      >
        <h2 className="text-lg font-semibold mb-1">Add Item to Buy</h2>
        <p className="text-xs text-slate-400 mb-4">
          Anyone in the family can add groceries, home needs, or future purchases.
        </p>

        <label className="block text-xs text-slate-400 mb-1">Item Name</label>
        <input
          type="text"
          placeholder="e.g., 5kg Basmati Rice, Wi-Fi Router"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/70 border border-white/15 text-white mb-3 focus:outline-none focus:border-sky-400"
        />

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Est. Cost (₹)</label>
            <input
              type="number"
              min="0"
              placeholder="650"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/70 border border-white/15 text-white focus:outline-none focus:border-sky-400"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">List Type</label>
            <select
              value={listType}
              onChange={(e) => setListType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-sky-400"
            >
              <option value="Groceries">Groceries</option>
              <option value="Home Needs">Home Needs</option>
              <option value="Future Goal">Future Goal</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={adding}
          className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4" />
          {adding ? "Adding..." : "Add to Family List"}
        </button>

        {/* Planned Cost Summary Card */}
        <div className="mt-6 p-4 rounded-xl bg-blue-950/60 border border-sky-400/20">
          <div className="flex items-center gap-2 text-xs text-sky-300 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Upcoming Cost</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">
            ₹{totalPlannedCost.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Across {pendingItems.length} pending item(s)
          </p>
        </div>
      </form>

      {/* Right: Pending & Completed Lists */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            What We Need to Buy ({pendingItems.length})
          </h2>

          {pendingItems.length === 0 ? (
            <p className="text-slate-400 text-sm py-6 text-center">
              Nothing on the list right now! Add groceries or items your family needs next.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-white/10"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{item.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                        {item.listType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Added by <span className="text-slate-200">{item.requestedBy}</span> • Est.{" "}
                      <span className="text-amber-400 font-medium">
                        ₹{item.estimatedCost.toLocaleString("en-IN")}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMarkBought(item)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                      title="Marks item bought and logs its estimated cost as an expense"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Bought
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Bought Section */}
        {boughtItems.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Recently Bought ({boughtItems.length})
            </h3>
            <div className="space-y-2">
              {boughtItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm text-slate-400 px-3 py-2 rounded-lg bg-slate-900/40"
                >
                  <span className="line-through">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span>₹{item.estimatedCost.toLocaleString("en-IN")}</span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-600 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}