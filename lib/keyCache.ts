const SLOT = "monad_pk";

export const cacheKey = (hex: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SLOT, hex);
  }
};

export const loadKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(SLOT);
  }
  return null;
};

export const clearKey = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SLOT);
  }
};
