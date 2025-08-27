import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type Awaiter = {
  promise?: Promise<void> | null;
  resolve?: () => void;
};

export const useAwaiter = (ref: RefObject<HTMLIFrameElement | undefined>) => {
  const [, triggerLoad] = useState(false);
  const awaiter = useRef<Awaiter | null>(null);

  if (awaiter.current?.promise) {
    throw awaiter.current.promise;
  }

  useLayoutEffect(() => {
    if (awaiter.current === null) {
      const current = {} as Awaiter;
      awaiter.current = current;
      awaiter.current.promise = new Promise((resolve) => {
        current.resolve = resolve;
      });

      triggerLoad(true);
    }
  }, [ref]);

  useEffect(() => {
    const current = ref.current;
    if (current) {
      const onReady = () => {
        setTimeout(() => {
          if (awaiter.current) {
            awaiter.current.resolve?.();
            awaiter.current.promise = null;
          }
        }, 300);
      };

      current.addEventListener("ready", onReady);

      return () => {
        current.removeEventListener("ready", onReady);
      };
    }
  }, [ref]);
};
