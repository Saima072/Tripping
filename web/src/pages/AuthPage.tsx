import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";

export function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col justify-center p-6 text-white">
      <div className="pb-8 text-center">
        <p className="text-5xl">✈️</p>
        <h1 className="pt-2 text-3xl font-extrabold">
          Trip<span className="text-violet-400">Swipe</span>
        </h1>
        <p className="pt-1 text-sm text-white/60">Swipe your way to your next trip.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl bg-white/10 px-4 py-3 outline-none placeholder:text-white/30 focus:ring-2 focus:ring-violet-500"
        />
        <input
          type="password"
          required
          minLength={10}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={mode === "signup" ? "Password (10+ characters)" : "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl bg-white/10 px-4 py-3 outline-none placeholder:text-white/30 focus:ring-2 focus:ring-violet-500"
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-violet-600 py-3 font-bold disabled:opacity-60"
        >
          {busy ? "One sec…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode((m) => (m === "login" ? "signup" : "login"));
          setError(null);
        }}
        className="pt-4 text-sm text-white/60"
      >
        {mode === "login" ? (
          <>
            New here? <span className="font-semibold text-violet-400">Create an account</span>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <span className="font-semibold text-violet-400">Log in</span>
          </>
        )}
      </button>
    </div>
  );
}
