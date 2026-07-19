import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import type { DeckCard } from "../types";
import { SEASON_LABEL, formatDateRange } from "../format";
import { DestImage } from "./DestImage";

interface Props {
  card: DeckCard;
  onSwipe: (direction: "left" | "right") => void;
  interactive: boolean;
}

const SWIPE_THRESHOLD = 110;

export function SwipeCard({ card, onSwipe, interactive }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-14, 14]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) onSwipe("right");
    else if (info.offset.x < -SWIPE_THRESHOLD) onSwipe("left");
  }

  return (
    <motion.div
      className="absolute inset-0 touch-none select-none"
      style={{ x, rotate }}
      drag={interactive ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      exit={{
        x: x.get() >= 0 ? 500 : -500,
        opacity: 0,
        transition: { duration: 0.25 },
      }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl bg-slate-900 shadow-2xl shadow-black/50">
        <DestImage src={card.heroImageUrl} city={card.city} className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute left-5 top-6 rotate-[-12deg] rounded-lg border-4 border-emerald-400 px-3 py-1 text-2xl font-black text-emerald-400"
        >
          SAVE
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute right-5 top-6 rotate-[12deg] rounded-lg border-4 border-rose-500 px-3 py-1 text-2xl font-black text-rose-500"
        >
          PASS
        </motion.div>

        <div className="absolute inset-x-0 top-0 flex justify-between p-4 text-xs font-semibold text-white/90">
          <span className="rounded-full bg-black/40 px-3 py-1 backdrop-blur">
            {SEASON_LABEL[card.season]} · {formatDateRange(card.dateRange)}
          </span>
          {card.weather?.isBestTime && (
            <span className="rounded-full bg-emerald-500/80 px-3 py-1 backdrop-blur">Best time</span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 space-y-3 p-5 text-white">
          <div>
            <h2 className="text-3xl font-extrabold leading-tight">{card.city}</h2>
            <p className="text-sm font-medium text-white/80">
              {card.country} · {card.region}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {card.weather && (
              <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                {Math.round(card.weather.avgTempC)}°C · {card.weather.rainChancePct}% rain
              </span>
            )}
            {card.price && (
              <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                ~${card.price.low}–{card.price.high}/night{" "}
                <span className="text-white/60">est.</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-violet-500/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
