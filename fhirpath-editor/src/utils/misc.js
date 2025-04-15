export const distinct = (array) => Array.from(new Set(array));
export const delay = (f) => setTimeout(f, 0);
export const upperFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);
export const pick = (obj, keys) =>
  Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key)));
export const hasProperty = (obj, field) =>
  Object.prototype.hasOwnProperty.call(obj, field);
