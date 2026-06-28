import { useState, useEffect, useCallback } from "react"
import { PageHeader, StatCard, LoadingSpinner, ErrorState, EmptyState } from "@/components/PageParts"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Activity,
  CheckCircle2,
  XCircle,
  Percent,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react"
import type { ScanLog } from "@/types"

function getStatusBadge(status: string) {
  switch (status) {
    case "running":
      return (
        <Badge className="bg-blue-500/15 text-blue-500 hover:bg-blue-500/20">
          <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Running
        </Badge>
      )
    case "completed":
      return <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20">Completed</Badge>
    case "failed":
      return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20">Failed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—"
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 0) return "—"
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m ${rem}s`
}

export function LogsPage() {
  const [logs, setLogs] = useState<ScanLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const fetchLogs = useCallback(async () => {
    try {
      const resp = await fetch("/api/scan-logs?limit=50")
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data: ScanLog[] = await resp.json()
      setLogs(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchLogs, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchLogs])

  const filtered = statusFilter === "all"
    ? logs
    : logs.filter((l) => l.status === statusFilter)

  const totalScans = logs.length
  const completed = logs.filter((l) => l.status === "completed").length
  const failed = logs.filter((l) => l.status === "failed").length
  const successRate = totalScans > 0 ? ((completed / totalScans) * 100).toFixed(1) : "0.0"

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <PageHeader
        title="Activity Logs"
        description="Track all scans, imports, and system activity"
        actions={
          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="cursor-pointer text-sm text-muted-foreground whitespace-nowrap">
              Auto-refresh
            </Label>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Scans" value={totalScans} icon={Activity} color="primary" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} color="green" />
        <StatCard label="Failed" value={failed} icon={XCircle} color="orange" />
        <StatCard label="Success Rate" value={`${successRate}%`} icon={Percent} color="blue" />
      </div>

      {/* Filter bar */}
      <div className="mt-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {autoRefresh && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Refreshing every 10s
          </span>
        )}
      </div>

      {/* Log table */}
      <Card className="mt-4">
        <CardContent className="p-0">
          {loading && <LoadingSpinner text="Loading logs..." />}
          {error && <ErrorState message={error} onRetry={fetchLogs} />}
          {!loading && !error && filtered.length === 0 && (
            <EmptyState
              title="No logs found"
              description={statusFilter !== "all" ? `No ${statusFilter} scans in recent activity.` : "No scan activity yet."}
            />
          )}
          {!loading && !error && filtered.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Opportunities</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => {
                  const expanded = expandedRows.has(log.id)
                  const hasError = !!log.error_message
                  return (
                    <>
                      <TableRow
                        key={log.id}
                        className={hasError ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/50"}
                        onClick={hasError ? () => toggleRow(log.id) : undefined}
                      >
                        <TableCell className="p-2">
                          {hasError ? (
                            expanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{log.id}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.scan_profile_id !== null ? `#${log.scan_profile_id}` : "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-right tabular-nums">{log.products_found}</TableCell>
                        <TableCell className="text-right tabular-nums">{log.opportunities_created}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {log.error_message || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {log.started_at ? new Date(log.started_at).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                          }) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {log.completed_at ? new Date(log.completed_at).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                          }) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                          {formatDuration(log.started_at, log.completed_at)}
                        </TableCell>
                      </TableRow>
                      {expanded && hasError && (
                        <TableRow key={`${log.id}-detail`} className="bg-muted/30">
                          <TableCell colSpan={10} className="py-3">
                            <div className="ml-6 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Full Error Message:</p>
                              <pre className="whitespace-pre-wrap break-words rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                                {log.error_message}
                              </pre>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
