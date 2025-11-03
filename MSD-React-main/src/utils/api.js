const BASE_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

export async function api(path, opts = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText} — ${text}`)
  }
  // some endpoints might return plain text
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

export { BASE_URL }
