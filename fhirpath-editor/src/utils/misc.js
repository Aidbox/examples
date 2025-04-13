export const distinct = (array) => Array.from(new Set(array));
export const delay = (f) => setTimeout(f, 0);
export const upperFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);
