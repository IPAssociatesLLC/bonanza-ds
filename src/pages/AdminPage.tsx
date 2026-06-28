import { useFetch, formatDate } from "@/hooks/useFetch"
import { PageHeader, StatCard, LoadingSpinner, ErrorState, EmptyState } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  ScanLine,
  Target,
  Store,
  Percent,
  Activity,
  Server,
  Database,
  CheckCircle2,
  Settings,
} from "lucide-react"
import type { AdminStats } from "@/types"

const PIE_COLORS = [
  "hsl(217 91% 60%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 72% 51%)",
  "hsl(280 65% 60%)",
  "hsl(199 89% 48%)",
]

const tooltipStyle = {
  backgroundColor: "hsl(222 40% 10%)",
  border: "1px solid hsl(217 33% 18%)",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "hsl(210 40% 96%)",
}

function statusToBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20">Completed</Badge>
    case "running":
      return <Badge className="bg-blue-500/15 text-blue-500 hover:bg-blue-500/20">Running</Badge>
    case "failed":
      return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20">Failed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function recordToChartData(record: Record<string, number>) {
  return Object.entries(record).map(([name, value]) => ({ name, value }))
}

export function AdminPage() {
  const { data: stats, loading, error, refetch } = useFetch<AdminStats>("/api/admin/stats")

  if (loading) return <LoadingSpinner text="Loading admin dashboard..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!stats) return <EmptyState title="No data available" />

  const oppChartData = recordToChartData(stats.opportunities_by_status)
  const listingChartData = recordToChartData(stats.listings_by_status)

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="Platform-wide statistics and management" />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Scan Profiles" value={stats.total_scan_profiles} icon={ScanLine} color="primary" />
        <StatCard label="Total Opportunities" value={stats.total_opportunities} icon={Target} color="blue" />
        <StatCard label="Total Listings" value={stats.total_listings} icon={Store} color="green" />
        <StatCard label="Scan Success Rate" value={`${stats.scan_success_rate.toFixed(1)}%`} icon={Percent} color="orange" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opportunities by Status</CardTitle>
            <CardDescription className="text-xs">Distribution across all opportunity states</CardDescription>
          </CardHeader>
          <CardContent>
            {oppChartData.length === 0 ? (
              <EmptyState title="No data" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={oppChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={2}
                  >
                    {oppChartData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", color: "hsl(215 20% 65%)" }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listings by Status</CardTitle>
            <CardDescription className="text-xs">Distribution across all listing states</CardDescription>
          </CardHeader>
          <CardContent>
            {listingChartData.length === 0 ? (
              <EmptyState title="No data" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={listingChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={2}
                  >
                    {listingChartData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", color: "hsl(215 20% 65%)" }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Scans + System Health */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent Scans */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Recent Scans</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recent_scans.length === 0 ? (
              <EmptyState title="No recent scans" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Products</TableHead>
                    <TableHead className="text-right">Opps</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recent_scans.slice(0, 10).map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{scan.id}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {scan.scan_profile_id !== null ? `#${scan.scan_profile_id}` : "—"}
                      </TableCell>
                      <TableCell>{statusToBadge(scan.status)}</TableCell>
                      <TableCell className="text-right tabular-nums">{scan.products_found}</TableCell>
                      <TableCell className="text-right tabular-nums">{scan.opportunities_created}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(scan.started_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">System Health</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Bonanza API</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Connected</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Octoparse API</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Connected</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Database</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Healthy</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Last Scan</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {stats.recent_scans[0]?.started_at
                  ? formatDate(stats.recent_scans[0].started_at)
                  : "Never"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Configuration Summary */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Platform Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Default Fee</p>
              <p className="mt-1 text-xl font-bold text-foreground">3.5%</p>
              <p className="text-xs text-muted-foreground">Bonanza transaction fee</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Min Margin</p>
              <p className="mt-1 text-xl font-bold text-foreground">30%</p>
              <p className="text-xs text-muted-foreground">Default minimum</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Active Scan Profiles</p>
              <p className="mt-1 text-xl font-bold text-foreground">{stats.total_scan_profiles}</p>
              <p className="text-xs text-muted-foreground">Profiles configured</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
