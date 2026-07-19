import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { api } from "../api";
import type { DeckCard } from "../types";
import { SwipeCard } from "../components/SwipeCard";
import { DetailSheet } from "../components/DetailSheet";

export function DeckPage() {
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<DeckCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetching = useRef(false);

  const loadMore = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const data = await api<{ cards: DeckCard[] }>("/api/deck/next");
      setCards((prev) => {
        const known = new Set(prev.map((c) => c.id));
        return [...prev, ...data.cards.filter((c) => !known.has(c.id))];
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load deck");
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  const handleSwipe = useCallback(
    (card: DeckCard, direction: "left" | "right") => {
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      if (direction === "right") setSaved(card);
      api("/api/swipes", {
        method: "POST",
        body: JSON.stringify({
          destinationId: card.id,
          direction,
          ...(direction === "right"
            ? { dateRangeStart: card.dateRange.start, dateRangeEnd: card.dateRange.end }
            : {}),
        }),
      }).catch(() => {
        /* non-fatal: swipe is lost but the deck keeps flowing */
      });
    },
    []
  );

  useEffect(() => {
    if (!loading && cards.length > 0 && cards.length <= 3) void loadMore();
  }, [cards.length, loading, loadMore]);

  const top = cards[0];

  return (
    <div className="flex h-full flex-col p-4">
      <header className="pb-3 text-center">
        <h1 className="text-xl font-extrabold text-white">
          Trip<span className="text-violet-400">Swipe</span>
        </h1>
        <p className="text-xs text-white/50">Swipe right to save · left to skip</p>
      </header>

      <div className="relative flex-1">
        {loading && (
          <div className="flex h-full items-center justify-center text-white/60">
            Shuffling destinations…
          </div>
        )}
        {!loading && !top && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/70">
            <p className="text-4xl">🌍</p>
            <p className="font-semibold">{error ?? "You've seen the whole deck!"}</p>
            <button
              onClick={() => {
                setLoading(true);
                void loadMore();
              }}
              className="rounded-full bg-violet-600 px-5 py-2 font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}
        <AnimatePresence>
          {cards.slice(0, 2).reverse().map((card) => (
            <SwipeCard
              key={card.id}
              card={card}
              interactive={card.id === top?.id}
              onSwipe={(dir) => handleSwipe(card, dir)}
            />
          ))}
        </AnimatePresence>
      </div>

      {top && (
        <div className="flex justify-center gap-6 pt-4">
          <button
            aria-label="Pass"
            onClick={() => handleSwipe(top, "left")}
            className="h-14 w-14 rounded-full bg-white/10 text-2xl text-rose-400 shadow-lg active:scale-90"
          >
            ✕
          </button>
          <button
            aria-label="Save"
            onClick={() => handleSwipe(top, "right")}
            className="h-14 w-14 rounded-full bg-white/10 text-2xl text-emerald-400 shadow-lg active:scale-90"
          >
            ♥
          </button>
        </div>
      )}

      <DetailSheet card={saved} onClose={() => setSaved(null)} />
    </div>
  );
}
