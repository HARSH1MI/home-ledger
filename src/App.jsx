import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy
} from "firebase/firestore";
import { auth, db } from "./firebase";
import FamilyOnboarding from "./components/FamilyOnboarding";
import MoneyTracker from "./components/MoneyTracker";
import ShoppingList from "./components/ShoppingList";
import FamilyAnalytics from "./components/FamilyAnalytics";
import { Copy, Check, LogOut, Users, Wallet, ShoppingCart, PieChart } from "lucide-react";

export default function App() {
  const [user, setUser] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [familyData, setFamilyData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [activeTab, setActiveTab] = useState("analytics");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (userSnap.exists() && userSnap.data().familyId) {
          setFamilyId(userSnap.data().familyId);
        } else {
          setFamilyId(null);
        }
      } else {
        setFamilyId(null);
        setFamilyData(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!familyId) return;

    const unsubFamily = onSnapshot(doc(db, "families", familyId), (snap) => {
      if (snap.exists()) setFamilyData({ id: snap.id, ...snap.data() });
    });

    const txQuery = query(
      collection(db, "families", familyId, "transactions"),
      orderBy("createdAt", "desc")
    );
    const unsubTx = onSnapshot(txQuery, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const listQuery = query(
      collection(db, "families", familyId, "shoppingList"),
      orderBy("createdAt", "desc")
    );
    const unsubList = onSnapshot(listQuery, (snap) => {
      setShoppingList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubFamily();
      unsubTx();
      unsubList();
    };
  }, [familyId]);

  const copyInviteCode = () => {
    if (!familyData?.inviteCode) return;
    navigator.clipboard.writeText(familyData.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading HomeLedger...
      </div>
    );
  }

  if (!user || !familyId) {
    return (
      <FamilyOnboarding
        user={user}
        onComplete={(newFamilyId) => setFamilyId(newFamilyId)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">
              {familyData?.name || "My Home"}{" "}
              <span className="text-amber-400 text-sm font-normal">Ledger</span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {familyData?.members?.map((m) => m.name.split(" ")[0]).join(", ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={copyInviteCode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs cursor-pointer transition"
              title="Click to copy invite code"
            >
              <span className="text-slate-300">Invite Code:</span>
              <span className="font-mono font-bold text-amber-400">
                {familyData?.inviteCode}
              </span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-300" />
              )}
            </button>

            <button
              onClick={() => signOut(auth)}
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-300 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 flex gap-2 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition cursor-pointer ${
              activeTab === "analytics"
                ? "bg-amber-400 text-slate-950 font-semibold"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <PieChart className="w-4 h-4" /> Whole-Family Analytics
          </button>

          <button
            onClick={() => setActiveTab("money")}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition cursor-pointer ${
              activeTab === "money"
                ? "bg-amber-400 text-slate-950 font-semibold"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <Wallet className="w-4 h-4" /> Income & Expenses
          </button>

          <button
            onClick={() => setActiveTab("shopping")}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition cursor-pointer ${
              activeTab === "shopping"
                ? "bg-sky-500 text-slate-950 font-semibold"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Grocery & Needs List (
            {shoppingList.filter((i) => !i.bought).length})
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === "analytics" && (
          <FamilyAnalytics
            familyId={familyId}
            familyData={familyData}
            transactions={transactions}
            shoppingList={shoppingList}
          />
        )}

        {activeTab === "money" && (
          <MoneyTracker
            familyId={familyId}
            user={user}
            transactions={transactions}
          />
        )}

        {activeTab === "shopping" && (
          <ShoppingList
            familyId={familyId}
            user={user}
            items={shoppingList}
          />
        )}
      </main>
    </div>
  );
}