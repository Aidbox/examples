import React from "react";

export const useFlashState = (initialValue, delay = 300) => {
  const [value, setValue] = React.useState(initialValue);
  const timer = React.useRef(null);

  const setFlashState = (newValue) => {
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

  return [value, setFlashState];
};

export const useDoubleInvoke = (fn, delay = 300) => {
  const [invoking, setInvoking] = useFlashState(false, delay);

  const invoke = React.useCallback(
    (...args) => {
      if (invoking) {
        setInvoking(false);
        fn(...args);
      } else {
        setInvoking(true);
      }
    },
    [fn, invoking, setInvoking],
  );

  return [invoking, invoke];
};

export const useCommitableState = (original, onCommit, onFail) => {
  const [value, setValue] = React.useState(original);
  const timer = React.useRef(null);
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

  return [value, setValue, commitValue];
};

export function mergeRefs(...inputRefs) {
  const filteredInputRefs = inputRefs.filter(Boolean);

  if (filteredInputRefs.length <= 1) {
    const firstRef = filteredInputRefs[0];
    return firstRef || null;
  }

  return function mergedRefs(ref) {
    for (const inputRef of filteredInputRefs) {
      if (typeof inputRef === "function") {
        inputRef(ref);
      } else if (inputRef) {
        inputRef.current = ref;
      }
    }
  };
}

export function useOnMount(fn) {
  React.useEffect(() => {
    fn();
  }, [fn]);
}

export function useSearchParams() {
  const parseSearchParams = (search) => {
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

export function useJsonFetch(url) {
  const [state, setState] = React.useState({
    data: null,
    loading: false,
    error: null,
  });

  React.useEffect(() => {
    const fetchData = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

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
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState((prev) => ({ ...prev, loading: false, error: error.message }));
      }
    };

    fetchData();
  }, [url]);

  return state;
}

export function useLocalStorageState(key, initialValue) {
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
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      // Save state
      setStoredValue(valueToStore);

      // Save to local storage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
