import { Progress } from "@/ui/progress.jsx";
import { useEffect, useRef, useState } from "react";

export const IndefiniteProgress = ({ active }) => {
  const [value, setValue] = useState(0);
  const prevActive = useRef(false);

  useEffect(() => {
    if (active && !prevActive.current) {
      const interval = setInterval(() => {
        setValue((prev) => {
          if (prev >= 99.8) return prev; // Safeguard to avoid reaching 100

          // Calculate a smaller increment as the value gets closer to 100
          const progressIncrease = (100 - prev) / 30; // Smaller divisor means faster slowing as it approaches 100
          return prev + progressIncrease;
        });
      }, 100);

      return () => clearInterval(interval);
    }

    if (!active && prevActive.current) {
      setValue(100);
    }

    prevActive.current = active;
  }, [active]);

  return <Progress value={value} />;
};
