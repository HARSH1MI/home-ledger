import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
  addDoc
} from "firebase/firestore";
import { auth, googleProvider, db } from "../firebase";
import { Home, Users, Sparkles, ArrowRight, LogIn } from "lucide-react";

export default function FamilyOnboarding({ user, onComplete }) {
  const [familyName, setFamilyName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("50000");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1. One-tap Google Sign In
  const handleGoogleLogin = async () => {
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError("Login failed: " + err.message);
    }
  };

  // Helper to generate a 6-character code like "A7X9K2"
  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // 2. Create a brand-new Family Space
  const handleCreateFamily = async (e) => {
    e.preventDefault();
    if (!familyName.trim()) return;
    setLoading(true);
    setError("");

    try {
      const inviteCode = generateInviteCode();
      const memberObj = {
        uid: user.uid,
        name: user.displayName || "Family Admin",
        email: user.email,
        photo: user.photoURL || ""
      };

      const familyRef = await addDoc(collection(db, "families"), {
        name: familyName.trim(),
        inviteCode,
        monthlyBudget: Number(monthlyBudget) || 0,
        createdBy: user.uid,
        members: [memberObj],
        createdAt: new Date().toISOString()
      });

      // Save familyId to user's profile
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName || "Family Admin",
        email: user.email,
        photo: user.photoURL || "",
        familyId: familyRef.id
      });

      onComplete(familyRef.id);
    } catch (err) {
      setError("Could not create family: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Join an existing Family using an Invite Code
  const handleJoinFamily = async (e) => {
    e.preventDefault();
    const cleanCode = inviteCodeInput.trim().toUpperCase();
    if (!cleanCode) return;
    setLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "families"),
        where("inviteCode", "==", cleanCode)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Invalid invite code. Double-check with your family!");
        setLoading(false);
        return;
      }

      const familyDoc = snapshot.docs[0];
      const memberObj = {
        uid: user.uid,
        name: user.displayName || "Family Member",
        email: user.email,
        photo: user.photoURL || ""
      };

      await updateDoc(doc(db, "families", familyDoc.id), {
        members: arrayUnion(memberObj)
      });

      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName || "Family Member",
        email: user.email,
        photo: user.photoURL || "",
        familyId: familyDoc.id
      });

      onComplete(familyDoc.id);
    } catch (err) {
      setError("Could not join family: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-sky-300 text-sm mb-4">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Smart Shared Home Finance & Lists</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Home<span className="text-amber-400">Ledger</span>
          </h1>
          <p className="text-slate-300 mt-2">
            Track income, expenses, grocery lists, and family goals together in real time.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {/* Step A: Not logged in yet */}
        {!user ? (
          <div className="max-w-md mx-auto bg-white/10 backdrop-blur-lg border border-white/15 rounded-2xl p-8 text-center shadow-2xl">
            <Home className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Welcome to your Family Hub</h2>
            <p className="text-slate-300 text-sm mb-6">
              Sign in with Google to create a new home space or join your family with an invite code.
            </p>
            <button
              onClick={handleGoogleLogin}
              className="w-full py-3 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              Continue with Google
            </button>
          </div>
        ) : (
          /* Step B: Logged in -> Create or Join Family */
          <div className="grid md:grid-cols-2 gap-6">
            {/* Create Home Card */}
            <form
              onSubmit={handleCreateFamily}
              className="bg-white/10 backdrop-blur-lg border border-white/15 rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center mb-4">
                  <Home className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold mb-1">Create a New Home</h2>
                <p className="text-slate-300 text-sm mb-5">
                  Start a fresh space and get an invite code for your family members.
                </p>

                <label className="block text-xs uppercase tracking-wider text-slate-300 mb-1">
                  Family / Home Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Sweet Home"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/15 text-white mb-4 focus:outline-none focus:border-amber-400"
                />

                <label className="block text-xs uppercase tracking-wider text-slate-300 mb-1">
                  Monthly Home Budget (₹)
                </label>
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/15 text-white mb-6 focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                Create Home Space <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Join Home Card */}
            <form
              onSubmit={handleJoinFamily}
              className="bg-white/10 backdrop-blur-lg border border-white/15 rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-400/20 text-sky-300 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold mb-1">Join Existing Home</h2>
                <p className="text-slate-300 text-sm mb-5">
                  Already have a 6-character code from a family member? Enter it below.
                </p>

                <label className="block text-xs uppercase tracking-wider text-slate-300 mb-1">
                  Family Invite Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g., A7X9K2"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/15 text-white tracking-widest font-mono uppercase mb-6 focus:outline-none focus:border-sky-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                Join Family <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}