import React from 'react';

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

export default function mergeRefs(...inputRefs) {
  const filteredInputRefs = inputRefs.filter(Boolean);

  if (filteredInputRefs.length <= 1) {
    const firstRef = filteredInputRefs[0];
    return firstRef || null;
  }

  return function mergedRefs(ref) {
    for (const inputRef of filteredInputRefs) {
      if (typeof inputRef === 'function') {
        inputRef(ref);
      } else if (inputRef) {
        inputRef.current = ref;
      }
    }
  };
}
