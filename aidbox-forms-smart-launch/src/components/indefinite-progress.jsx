import { Progress } from "@/ui/progress.jsx";
import { useEffect, useRef, useState } from "react";

export const IndefiniteProgress = ({ active }) => {
  const [value, setValue] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (active) {
      setVisible(true);
      setValue(0);

      // Start interval to increment value
      intervalRef.current = setInterval(() => {
        setValue((prev) => {
          if (prev >= 99.8) return prev; // Prevent going over 99.8
          const progressIncrease = (100 - prev) / 30; // Slows down as it approaches 100
          return prev + progressIncrease;
        });
      }, 100);
    } else {
      // Stop interval when inactive and finalize progress
      clearInterval(intervalRef.current);
      setValue(100);

      // Hide after animation completes
      const timeout = setTimeout(() => {
        setVisible(false);
      }, 500); // Wait for animations or transitions if any

      return () => clearTimeout(timeout); // Cleanup timeout if `active` changes quickly
    }

    return () => {
      clearInterval(intervalRef.current); // Cleanup interval on component unmount or active change
    };
  }, [active]);

  return visible ? (
    <Progress value={value} className="rounded-none h-[3px]" />
  ) : (
    <div className="h-[3px] w-full"></div>
  );
};
