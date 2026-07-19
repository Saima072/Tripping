import { useState } from "react";
import { cityGradient } from "../format";

interface Props {
  src: string;
  city: string;
  className?: string;
}

/** Hero image with a deterministic gradient fallback if loading fails. */
export function DestImage({ src, city, className }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={className} style={{ background: cityGradient(city) }}>
      {!failed && (
        <img
          src={src}
          alt={city}
          className="h-full w-full object-cover"
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
