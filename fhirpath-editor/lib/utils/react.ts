import {
  MutableRefObject,
  Ref,
  RefCallback,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export function useFlashState<T>(initialValue: T, delay = 300) {
  const [value, setValue] = useState(initialValue);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const setFlashState = (newValue: T) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }

    setValue(newValue);

    if (newValue !== initialValue) {
      timer.current = setTimeout(() => {
        setValue(initialValue);
      }, delay);
    }
  };

  return [value, setFlashState] as const;
}

export function useDoubleInvoke(fn: () => void, delay = 300) {
  const [invoking, setInvoking] = useFlashState(false, delay);

  const invoke = useCallback(() => {
    if (invoking) {
      setInvoking(false);
      fn();
    } else {
      setInvoking(true);
    }
  }, [fn, invoking, setInvoking]);

  return [invoking, invoke] as const;
}

export function useCommitableState<T>(
  original: T,
  onCommit: (value: T) => void,
  onFail: () => void,
) {
  const [value, setValue] = useState(original);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const originalRef = useRef(original);

  useEffect(() => {
    originalRef.current = original;
  }, [original]);

  const commitValue = () => {
    onCommit(value);

    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => {
      if (value !== originalRef.current) {
        setValue(originalRef.current);
        onFail();
      }
    }, 0);
  };

  return [value, setValue, commitValue] as const;
}

export function mergeRefs<T>(
  ...inputRefs: Array<Ref<T> | undefined | null | false>
): RefCallback<T> | Ref<T> | null {
  const filteredInputRefs = inputRefs.filter(Boolean) as Ref<T>[];

  if (filteredInputRefs.length <= 1) {
    const firstRef = filteredInputRefs[0];
    return firstRef || null;
  }

  return function mergedRefs(ref: T | null) {
    for (const inputRef of filteredInputRefs) {
      if (typeof inputRef === "function") {
        inputRef(ref);
      } else if (inputRef && "current" in inputRef) {
        (inputRef as MutableRefObject<T | null>).current = ref;
      }
    }
  };
}
