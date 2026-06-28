import { useState } from "react"
import { useFetch, formatCurrency, formatDate } from "@/hooks/useFetch"
import { PageHeader, StatCard, LoadingSpinner, ErrorState, EmptyState } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { DollarSign, TrendingUp, Percent, Package } from "lucide-react"
import type { Listing } from "@/types"

// ─── Mock chart data (no sales endpoint yet) ─────────────────────────────────

const revenueData7d = [
  { date: "Jun 20", revenue: 1240, profit: 380 },
  { date: "Jun 21", revenue: 980, profit: 290 },
  { date: "Jun 22", revenue: 1560, profit: 470 },
  { date: "Jun 23", revenue: 2100, profit: 640 },
  { date: "Jun 24", revenue: 1750, profit: 520 },
  { date: "Jun 25", revenue: 2300, profit: 710 },
  { date: "Jun 26", revenue: 2680, profit: 820 },
]

const revenueData30d = [
  { date: "Jun 1", revenue: 8200, profit: 2400 },
  { date: "Jun 5", revenue: 9100, profit: 2750 },
  { date: "Jun 10", revenue: 10500, profit: 3200 },
  { date: "Jun 15", revenue: 12800, profit: 3900 },
  { date: "Jun 20", revenue: 14200, profit: 4350 },
  { date: "Jun 25", revenue: 16500, profit: 5100 },
  { date: "Jun 26", revenue: 17800, profit: 5500 },
]

const revenueData90d = [
  { date: "Apr 1", revenue: 22000, profit: 6500 },
  { date: "Apr 15", revenue: 28000, profit: 8400 },
  { date: "May 1", revenue: 35000, profit: 10700 },
  { date: "May 15", revenue: 42000, profit: 13000 },
  { date: "Jun 1", revenue: 51000, profit: 16000 },
  { date: "Jun 15", revenue: 58000, profit: 18200 },
  { date: "Jun 26", revenue: 64000, profit: 20100 },
]

const revenueDataAll = [
  { date: "Jan", revenue: 45000, profit: 13000 },
  { date: "Feb", revenue: 62000, profit: 18500 },
  { date: "Mar", revenue: 78000, profit: 24000 },
  { date: "Apr", revenue: 95000, profit: 29500 },
  { date: "May", revenue: 112000, profit: 35200 },
  { date: "Jun", revenue: 128000, profit: 40800 },
]

const marginTrend7d = [
  { date: "Jun 20", margin: 28.5 },
  { date: "Jun 21", margin: 27.2 },
  { date: "Jun 22", margin: 29.8 },
  { date: "Jun 23", margin: 31.2 },
  { date: "Jun 24", margin: 30.1 },
  { date: "Jun 25", margin: 32.5 },
  { date: "Jun 26", margin: 33.8 },
]

const marginTrend30d = [
  { date: "Jun 1", margin: 26.0 },
  { date: "Jun 5", margin: 27.5 },
  { date: "Jun 10", margin: 28.8 },
  { date: "Jun 15", margin: 29.5 },
  { date: "Jun 20", margin: 30.8 },
  { date: "Jun 25", margin: 32.0 },
  { date: "Jun 26", margin: 33.8 },
]

const marginTrend90d = [
  { date: "Apr 1", margin: 24.0 },
  { date: "Apr 15", margin: 25.5 },
  { date: "May 1", margin: 27.0 },
  { date: "May 15", margin: 28.5 },
  { date: "Jun 1", margin: 30.0 },
  { date: "Jun 15", margin: 31.8 },
  { date: "Jun 26", margin: 33.8 },
]

const marginTrendAll = [
  { date: "Jan", margin: 22.0 },
  { date: "Feb", margin: 24.5 },
  { date: "Mar", margin: 26.0 },
  { date: "Apr", margin: 27.5 },
  { date: "May", margin: 30.0 },
  { date: "Jun", margin: 33.8 },
]

const categoryPerformance = [
  { category: "Electronics", revenue: 28400, profit: 8900 },
  { category: "Home & Garden", revenue: 19200, profit: 6100 },
  { category: "Fashion", revenue: 15600, profit: 4800 },
  { category: "Toys & Hobbies", revenue: 11200, profit: 3700 },
  { category: "Sports & Outdoors", revenue: 8900, profit: 2900 },
  { category: "Beauty", revenue: 6700, profit: 2200 },
]

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
}

function getStatusBadge(status: string) {
  const variant = status === "active" ? "default" : status === "draft" ? "secondary" : "outline"
  return <Badge variant={variant as "default" | "secondary" | "outline"}>{status}</Badge>
}

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("7")
  const { data: listings, loading, error, refetch } = useFetch<Listing[]>("/api/listings?limit=10")

  const revenueData =
    dateRange === "7" ? revenueData7d :
    dateRange === "30" ? revenueData30d :
    dateRange === "90" ? revenueData90d :
    revenueDataAll

  const marginTrend =
    dateRange === "7" ? marginTrend7d :
    dateRange === "30" ? marginTrend30d :
    dateRange === "90" ? marginTrend90d :
    marginTrendAll

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0)
  const totalProfit = revenueData.reduce((sum, d) => sum + d.profit, 0)
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0"
  const activeListings = listings?.filter((l) => l.status === "active").length ?? 0

  return (
    <div>
      <PageHeader
        title="Sales Analytics"
        description="Track revenue, profit margins, and listing performance"
        actions={
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} trend="Gross sales" color="primary" />
        <StatCard label="Total Profit" value={formatCurrency(totalProfit)} icon={TrendingUp} trend="After costs & fees" color="green" />
        <StatCard label="Avg Margin" value={`${avgMargin}%`} icon={Percent} trend="Profit / revenue" color="blue" />
        <StatCard label="Active Listings" value={activeListings} icon={Package} trend="Currently live" color="orange" />
      </div>

      {/* Revenue & Profit Chart */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Revenue & Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v as number)} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke="hsl(var(--secondary-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Margin Trend + Category Performance */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Margin Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={marginTrend}>
                <defs>
                  <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Area type="monotone" dataKey="margin" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#marginGradient)" name="Margin %" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="category" type="category" width={110} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v as number)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Listings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Top Performing Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <LoadingSpinner text="Loading listings..." />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && listings && listings.length === 0 && (
            <EmptyState title="No listings yet" description="Create listings to see performance data here." />
          )}
          {!loading && !error && listings && listings.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium max-w-[300px] truncate">{listing.title}</TableCell>
                    <TableCell className="text-right">{formatCurrency(listing.price)}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-500 font-medium">
                        {listing.price > 0 ? `${(((listing.price - listing.shipping_cost) / listing.price) * 100).toFixed(1)}%` : "—"}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(listing.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(listing.created_at)}</TableCell>
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
