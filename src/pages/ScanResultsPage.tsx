import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { useFetch, formatNumber, formatDate } from "@/hooks/useFetch"
import { PageHeader, StatCard, LoadingSpinner, ErrorState, EmptyState } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Package, CalendarClock, Target, TrendingUp, ExternalLink } from "lucide-react"
import type { ScanLog, Opportunity } from "@/types"

interface OpportunitiesResponse {
  items: Opportunity[]
  total: number
}

function getStatusBadge(status: string) {
  if (status === "completed") return <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20">{status}</Badge>
  if (status === "running") return <Badge className="bg-blue-500/15 text-blue-500 hover:bg-blue-500/20">{status}</Badge>
  if (status === "failed") return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20">{status}</Badge>
  return <Badge variant="secondary">{status}</Badge>
}

function getDuration(started: string | null, completed: string | null): string {
  if (!started || !completed) return "—"
  const start = new Date(started).getTime()
  const end = new Date(completed).getTime()
  const seconds = Math.round((end - start) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const today = new Date()
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
}

export function ScanResultsPage() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")

  const { data: scanLogs, loading: logsLoading, error: logsError, refetch: refetchLogs } = useFetch<ScanLog[]>(
    "/api/scan-logs?limit=50"
  )
  const { data: oppData, loading: oppLoading, error: oppError } = useFetch<OpportunitiesResponse>(
    "/api/opportunities?limit=20"
  )

  const filteredLogs = useMemo(() => {
    if (!scanLogs) return []
    return scanLogs.filter((log) => {
      if (statusFilter !== "all" && log.status !== statusFilter) return false
      if (dateFilter === "today" && !isToday(log.started_at)) return false
      return true
    })
  }, [scanLogs, statusFilter, dateFilter])

  const totalProductsFound = scanLogs?.reduce((sum, l) => sum + l.products_found, 0) ?? 0
  const scannedToday = scanLogs?.filter((l) => isToday(l.started_at)).length ?? 0
  const totalOpportunities = scanLogs?.reduce((sum, l) => sum + l.opportunities_created, 0) ?? 0
  const recentOpportunities = oppData?.items ?? []
  const avgMargin = recentOpportunities.length > 0
    ? (recentOpportunities.reduce((sum, o) => sum + o.margin_pct, 0) / recentOpportunities.length).toFixed(1)
    : "0.0"

  return (
    <div>
      <PageHeader
        title="Scan Results"
        description="Products discovered by automated scans"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Products Found" value={formatNumber(totalProductsFound)} icon={Package} trend="Across all scans" color="primary" />
        <StatCard label="Scanned Today" value={scannedToday} icon={CalendarClock} trend="Scans in last 24h" color="blue" />
        <StatCard label="Opportunities Created" value={formatNumber(totalOpportunities)} icon={Target} trend="From all scans" color="green" />
        <StatCard label="Avg Margin" value={`${avgMargin}%`} icon={TrendingUp} trend="Recent opportunities" color="orange" />
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Filter:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Scan Logs Table */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Scan History</CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading && <LoadingSpinner text="Loading scan logs..." />}
          {logsError && <ErrorState message={logsError} onRetry={refetchLogs} />}
          {!logsLoading && !logsError && filteredLogs.length === 0 && (
            <EmptyState
              title="No scan logs found"
              description="Run a scan to see results here."
              action={
                <Link to="/scan-profiles">
                  <Button>Go to Scan Profiles</Button>
                </Link>
              }
            />
          )}
          {!logsLoading && !logsError && filteredLogs.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Products Found</TableHead>
                  <TableHead className="text-right">Opportunities</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">#{log.scan_profile_id ?? "—"}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-right">{formatNumber(log.products_found)}</TableCell>
                    <TableCell className="text-right">{formatNumber(log.opportunities_created)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(log.started_at)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{getDuration(log.started_at, log.completed_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Opportunities from Latest Scan */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Opportunities from Recent Scans</CardTitle>
            <Link to="/opportunities">
              <Button variant="outline" size="sm">
                View All
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {oppLoading && <LoadingSpinner text="Loading opportunities..." />}
          {oppError && <ErrorState message={oppError} />}
          {!oppLoading && !oppError && recentOpportunities.length === 0 && (
            <EmptyState title="No opportunities yet" description="Opportunities will appear here after a successful scan." />
          )}
          {!oppLoading && !oppError && recentOpportunities.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Source Price</TableHead>
                  <TableHead className="text-right">Target Price</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOpportunities.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell className="font-medium max-w-[280px] truncate">{opp.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{opp.source}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">${opp.source_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">${opp.target_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium text-green-500">{opp.margin_pct.toFixed(1)}%</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(opp.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(opp.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
