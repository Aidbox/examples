import React from "react";

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

const contextTypeContext = React.createContext(null);

export const ContextTypeProvider = contextTypeContext.Provider;

export const useContextType = () => {
  const contextType = React.useContext(contextTypeContext);
  if (!contextType) {
    throw new Error("useContextType must be used within a ContextTypeProvider");
  }
  return contextType;
};
