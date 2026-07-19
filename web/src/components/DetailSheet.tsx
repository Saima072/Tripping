import { AnimatePresence, motion } from "framer-motion";
import type { DeckCard } from "../types";
import { SEASON_LABEL, formatDateRange } from "../format";
import { DestImage } from "./DestImage";

interface Props {
  card: DeckCard | null;
  onClose: () => void;
}

/** Bottom sheet shown after a right-swipe: full info + outbound booking links. */
export function DetailSheet({ card, onClose }: Props) {
  return (
    <AnimatePresence>
      {card && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl bg-slate-950 text-white shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            <DestImage
              src={card.heroImageUrl}
              city={card.city}
              className="h-44 overflow-hidden rounded-t-3xl"
            />
            <div className="max-h-[55vh] space-y-4 overflow-y-auto p-5 pb-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Saved to your shortlist 🎉</p>
                  <h2 className="text-2xl font-extrabold">
                    {card.city}, {card.country}
                  </h2>
                  <p className="text-sm text-white/70">
                    {SEASON_LABEL[card.season]} · {formatDateRange(card.dateRange)}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {card.weather && (
                  <div className="rounded-2xl bg-white/5 p-3">
                    <p className="text-white/60">Weather</p>
                    <p className="font-semibold">
                      {Math.round(card.weather.avgTempC)}°C · {card.weather.rainChancePct}% rain
                    </p>
                  </div>
                )}
                {card.price && (
                  <div className="rounded-2xl bg-white/5 p-3">
                    <p className="text-white/60">Stay (estimated)</p>
                    <p className="font-semibold">
                      ${card.price.low}–{card.price.high}/night
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-1 text-sm font-semibold text-white/60">Why this matches you</p>
                <ul className="space-y-1 text-sm">
                  {card.whyMatch.map((reason) => (
                    <li key={reason}>✦ {reason}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <a
                  href={card.links.airbnb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl bg-rose-500 py-3 text-center font-bold"
                >
                  Search stays on Airbnb ↗
                </a>
                <a
                  href={card.links.booking}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl bg-blue-600 py-3 text-center font-bold"
                >
                  Search on Booking.com ↗
                </a>
                <p className="text-center text-xs text-white/40">
                  External sites — prices there are live and may differ from our estimates.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
