import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const useAwaiter = (ref) => {
  const [, triggerLoad] = useState(false);
  const awaiter = useRef(null);

  if (awaiter.current?.promise) {
    throw awaiter.current.promise;
  }

  useLayoutEffect(() => {
    if (awaiter.current === null) {
      awaiter.current = {};
      awaiter.current.promise = new Promise((resolve) => {
        awaiter.current.resolve = resolve;
      });

      triggerLoad(true);
    }
  }, []);

  useEffect(() => {
    const current = ref.current;
    if (current) {
      const onReady = () => {
        setTimeout(() => {
          awaiter.current?.resolve();
          awaiter.current.promise = null;
        }, 300); // wait for the next render
      };

      current.addEventListener("ready", onReady);

      return () => {
        current.removeEventListener("ready", onReady);
      };
    }
  }, []);
};
