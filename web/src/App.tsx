import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { AuthPage } from "./pages/AuthPage";
import { DeckPage } from "./pages/DeckPage";
import { ShortlistPage } from "./pages/ShortlistPage";
import { FiltersPage } from "./pages/FiltersPage";

function Shell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center text-white/60">Loading…</div>
    );
  }

  if (!user) return <AuthPage />;

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${
      isActive ? "text-violet-400" : "text-white/50"
    }`;

  return (
    <div className="flex h-dvh flex-col">
      <main className="min-h-0 flex-1">
        <Routes>
          <Route path="/" element={<DeckPage />} />
          <Route path="/shortlist" element={<ShortlistPage />} />
          <Route path="/profile" element={<FiltersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="flex border-t border-white/10 bg-black/40 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <NavLink to="/" end className={tabClass}>
          <span className="text-lg">🃏</span>Deck
        </NavLink>
        <NavLink to="/shortlist" className={tabClass}>
          <span className="text-lg">💜</span>Shortlist
        </NavLink>
        <NavLink to="/profile" className={tabClass}>
          <span className="text-lg">⚙️</span>Profile
        </NavLink>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="mx-auto h-dvh max-w-md bg-gradient-to-b from-[#151132] to-[#0c0a1d]">
          <Shell />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
