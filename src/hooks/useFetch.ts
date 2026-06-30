import { useState, useEffect, useCallback } from "react"

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useFetch<T>(url: string, options?: RequestInit): FetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchCount, setRefetchCount] = useState(0)

  const refetch = useCallback(() => setRefetchCount((c) => c + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const token = localStorage.getItem("token")
    const headers = new Headers(options?.headers)
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }
    
    fetch(url, { ...options, headers })
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.text()
          throw new Error(err || `HTTP ${r.status}`)
        }
        return r.json()
      })
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, refetchCount])

  return { data, loading, error, refetch }
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const token = localStorage.getItem("token")
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  
  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(err || `HTTP ${resp.status}`)
  }
  return resp.json()
}

export async function apiPut<T>(url: string, body: unknown): Promise<T> {
  const token = localStorage.getItem("token")
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const resp = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(err || `HTTP ${resp.status}`)
  }
  return resp.json()
}

export async function apiDelete<T>(url: string): Promise<T> {
  const token = localStorage.getItem("token")
  const headers: Record<string, string> = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const resp = await fetch(url, {
    method: "DELETE",
    headers,
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(err || `HTTP ${resp.status}`)
  }
  return resp.json()
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n)
}

export function formatDate(s: string | null): string {
  if (!s) return "—"
  return new Date(s).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  })
}
