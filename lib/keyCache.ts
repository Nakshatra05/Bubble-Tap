const SLOT = "monad_pk";

export const cacheKey = (hex: string) => localStorage.setItem(SLOT, hex);

export const loadKey  = () => localStorage.getItem(SLOT);

export const clearKey = () => localStorage.removeItem(SLOT);
