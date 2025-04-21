import React, { useCallback, Ref, RefCallback } from "react";

export function useFlashState<T>(initialValue: T, delay = 300) {
  const [value, setValue] = React.useState(initialValue);
  const timer = React.useRef<ReturnType<typeof setTimeout>>();

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

  const invoke = React.useCallback(() => {
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
  const [value, setValue] = React.useState(original);
  const timer = React.useRef<ReturnType<typeof setTimeout>>();
  const originalRef = React.useRef(original);

  React.useEffect(() => {
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
        (inputRef as React.MutableRefObject<T | null>).current = ref;
      }
    }
  };
}

export function useOnMount(fn: () => void) {
  React.useEffect(() => {
    fn();
  }, [fn]);
}

export function useSearchParams() {
  const parseSearchParams = (search: string) => {
    return Object.fromEntries(new URLSearchParams(search.slice(1)).entries());
  };

  const [searchParams, setSearchParams] = React.useState(
    parseSearchParams(window.location.search),
  );

  // subscribe to search params
  React.useEffect(() => {
    const listener = () => {
      setSearchParams(parseSearchParams(window.location.search));
    };
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);

  return searchParams;
}

export function useDebug() {
  const { debug } = useSearchParams();
  return !!debug;
}

export function useJsonFetch<T>(url: string): {
  loading: boolean;
  data: T | undefined;
  error: string | undefined;
} {
  const [state, setState] = React.useState<{
    loading: boolean;
    data: T | undefined;
    error: string | undefined;
  }>({
    data: undefined,
    loading: false,
    error: undefined,
  });

  React.useEffect(() => {
    const fetchData = async () => {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setState({ data, loading: false, error: undefined });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: (error as Error)?.message || "Unknown error",
        }));
      }
    };

    fetchData();
  }, [url]);

  return state;
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
): [T, (value: ((value: T) => T) | T) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = React.useState(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = useCallback(
    (value: T | ((value: T) => T)) => {
      try {
        setStoredValue((storedValue) => {
          const valueToStore =
            value instanceof Function ? value(storedValue) : value;

          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }

          return valueToStore;
        });
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key],
  );

  return [storedValue, setValue] as const;
}
