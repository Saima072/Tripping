import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { ShortlistItem } from "../types";
import { SEASON_LABEL, formatDateRange } from "../format";
import { DestImage } from "../components/DestImage";

type SortKey = "recent" | "price" | "season";
const SEASON_ORDER = { spring: 0, summer: 1, fall: 2, winter: 3 } as const;

export function ShortlistPage() {
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("recent");

  useEffect(() => {
    api<{ items: ShortlistItem[] }>("/api/shortlist")
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const copy = [...items];
    if (sort === "price") copy.sort((a, b) => (a.price?.avg ?? Infinity) - (b.price?.avg ?? Infinity));
    if (sort === "season")
      copy.sort(
        (a, b) => (a.season ? SEASON_ORDER[a.season] : 9) - (b.season ? SEASON_ORDER[b.season] : 9)
      );
    return copy;
  }, [items, sort]);

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await api(`/api/shortlist/${id}`, { method: "DELETE" }).catch(() => undefined);
  }

  return (
    <div className="h-full overflow-y-auto p-4 pb-6 text-white">
      <header className="flex items-center justify-between pb-4">
        <h1 className="text-xl font-extrabold">Your shortlist</h1>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-full bg-white/10 px-3 py-1.5 text-sm"
        >
          <option value="recent">Newest</option>
          <option value="price">Price</option>
          <option value="season">Season</option>
        </select>
      </header>

      {loading && <p className="text-white/60">Loading…</p>}
      {!loading && items.length === 0 && (
        <div className="pt-16 text-center text-white/60">
          <p className="text-4xl">🧳</p>
          <p className="mt-2 font-semibold">Nothing saved yet</p>
          <p className="text-sm">Swipe right on a destination to shortlist it.</p>
        </div>
      )}

      <ul className="space-y-3">
        {sorted.map((item) => (
          <li key={item.id} className="overflow-hidden rounded-2xl bg-white/5">
            <div className="flex gap-3">
              <DestImage
                src={item.heroImageUrl}
                city={item.city}
                className="h-24 w-24 shrink-0 overflow-hidden"
              />
              <div className="flex min-w-0 flex-1 flex-col justify-center py-2 pr-2">
                <p className="truncate font-bold">
                  {item.city}, {item.country}
                </p>
                <p className="text-xs text-white/60">
                  {item.season ? `${SEASON_LABEL[item.season]} · ` : ""}
                  {formatDateRange(item.dateRange)}
                  {item.price ? ` · ~$${item.price.avg}/night est.` : ""}
                </p>
                <div className="mt-1.5 flex gap-2 text-xs font-semibold">
                  <a
                    href={item.links.airbnb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-rose-500/80 px-2.5 py-1"
                  >
                    Airbnb ↗
                  </a>
                  <a
                    href={item.links.booking}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-blue-600/80 px-2.5 py-1"
                  >
                    Booking ↗
                  </a>
                  <button
                    onClick={() => void remove(item.id)}
                    className="ml-auto rounded-full bg-white/10 px-2.5 py-1 text-white/70"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
