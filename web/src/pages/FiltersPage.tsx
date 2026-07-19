import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import type { Filters, Season } from "../types";
import { SEASON_LABEL } from "../format";

const SEASONS: Season[] = ["spring", "summer", "fall", "winter"];

export function FiltersPage() {
  const { user, logout, deleteAccount } = useAuth();
  const [filters, setFilters] = useState<Filters>({
    budgetCap: null,
    preferredSeason: null,
    preferredTags: [],
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    api<{ filters: Filters; availableTags: string[] }>("/api/filters").then((data) => {
      setFilters(data.filters);
      setAvailableTags(data.availableTags);
    });
  }, []);

  async function save() {
    setStatus("saving");
    try {
      await api("/api/filters", { method: "PUT", body: JSON.stringify(filters) });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
    }
  }

  function toggleTag(tag: string) {
    setFilters((f) => ({
      ...f,
      preferredTags: f.preferredTags.includes(tag)
        ? f.preferredTags.filter((t) => t !== tag)
        : [...f.preferredTags, tag].slice(0, 10),
    }));
  }

  async function onDeleteAccount() {
    if (
      window.confirm(
        "Delete your account? Your profile, shortlist and filters are permanently erased."
      )
    ) {
      await deleteAccount();
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 pb-6 text-white">
      <h1 className="pb-1 text-xl font-extrabold">Your trip preferences</h1>
      <p className="pb-4 text-sm text-white/50">Signed in as {user?.email}</p>

      <section className="space-y-5">
        <div>
          <label htmlFor="budget" className="mb-1 block text-sm font-semibold text-white/70">
            Nightly budget cap (USD)
          </label>
          <input
            id="budget"
            type="number"
            min={10}
            max={100000}
            placeholder="No cap"
            value={filters.budgetCap ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                budgetCap: e.target.value ? Number(e.target.value) : null,
              }))
            }
            className="w-full rounded-2xl bg-white/10 px-4 py-3 outline-none placeholder:text-white/30 focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-white/70">Preferred season</p>
          <div className="flex gap-2">
            {SEASONS.map((season) => (
              <button
                key={season}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    preferredSeason: f.preferredSeason === season ? null : season,
                  }))
                }
                className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition ${
                  filters.preferredSeason === season
                    ? "bg-violet-600 text-white"
                    : "bg-white/10 text-white/70"
                }`}
              >
                {SEASON_LABEL[season]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-white/70">
            Vibes <span className="font-normal text-white/40">(up to 10)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filters.preferredTags.includes(tag)
                    ? "bg-violet-600 text-white"
                    : "bg-white/10 text-white/60"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => void save()}
          disabled={status === "saving"}
          className="w-full rounded-2xl bg-violet-600 py-3 font-bold disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save preferences"}
        </button>
        {status === "error" && (
          <p className="text-center text-sm text-rose-400">Couldn't save — try again.</p>
        )}
      </section>

      <section className="mt-10 space-y-2 border-t border-white/10 pt-6">
        <button
          onClick={() => void logout()}
          className="w-full rounded-2xl bg-white/10 py-3 font-semibold text-white/80"
        >
          Log out
        </button>
        <button
          onClick={() => void onDeleteAccount()}
          className="w-full rounded-2xl bg-rose-600/20 py-3 font-semibold text-rose-400"
        >
          Delete account
        </button>
        <p className="pt-1 text-center text-xs text-white/40">
          Deleting your account permanently erases your data; swipe history is anonymized.
        </p>
      </section>
    </div>
  );
}
