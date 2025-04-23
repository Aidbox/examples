import { useCallback, useEffect, useState } from "react";

export function useJsonFetch<T>(url: string): {
  loading: boolean;
  data: T | undefined;
  error: string | undefined;
} {
  const [state, setState] = useState<{
    loading: boolean;
    data: T | undefined;
    error: string | undefined;
  }>({
    data: undefined,
    loading: false,
    error: undefined,
  });

  useEffect(() => {
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
  const [storedValue, setStoredValue] = useState(() => {
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

export function useSearchParams() {
  const parseSearchParams = (search: string) => {
    return Object.fromEntries(new URLSearchParams(search.slice(1)).entries());
  };

  const [searchParams, setSearchParams] = useState(
    parseSearchParams(window.location.search),
  );

  // subscribe to search params
  useEffect(() => {
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
