export const ls = {
  get: (k, fallback) => {
    try {
      const v = localStorage.getItem(k)
      return v ? JSON.parse(v) : fallback
    } catch {
      return fallback
    }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k),
}
