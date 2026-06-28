import { useFetch, formatCurrency, formatNumber } from "@/hooks/useFetch"
import { PageHeader, StatCard, LoadingSpinner, ErrorState } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Target, Package, DollarSign, Zap, ArrowRight, Activity } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import type { DashboardStats } from "@/types"
import { Link } from "react-router-dom"

const MARGIN_COLORS = ["#f59e0b", "#3b82f6", "#22c55e", "#8b5cf6"]

export function DashboardPage() {
  const { data, loading, error, refetch } = useFetch<DashboardStats>("/api/dashboard/stats")

  if (loading) return <LoadingSpinner text="Loading dashboard..." />
  if (error || !data) return <ErrorState message={error || "No data"} onRetry={refetch} />

  const marginData = Object.entries(data.margin_distribution).map(([name, value]) => ({ name, value }))
  const categoryData = data.top_categories

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your drop shipping automation platform"
        actions={
          <Link to="/product-scout">
            <Button>
              <Zap className="mr-2 h-4 w-4" />
              New Scan
            </Button>
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Opportunities Today" value={data.opportunities_today} icon={Zap} trend="New profitable items" color="green" />
        <StatCard label="Total Opportunities" value={formatNumber(data.total_opportunities)} icon={Target} trend="All time" color="primary" />
        <StatCard label="Avg Margin" value={`${data.avg_margin}%`} icon={TrendingUp} trend="Before cashback" color="blue" />
        <StatCard label="Listed on Bonanza" value={data.total_listed} icon={Package} trend="Active listings" color="orange" />
        <StatCard label="Active Profiles" value={data.active_profiles} icon={Activity} trend="Scan configurations" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Margin Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Margin Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={marginData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {marginData.map((_, i) => (
                    <Cell key={i} fill={MARGIN_COLORS[i % MARGIN_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="category" type="category" width={100} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No category data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Imports */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Imports to Bonanza</CardTitle>
          <Link to="/listings">
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {data.recent_imports.length > 0 ? (
            <div className="space-y-3">
              {data.recent_imports.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.category || "No category"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{formatCurrency(item.price)}</span>
                    <Badge variant={item.status === "listed" ? "default" : item.status === "failed" ? "destructive" : "secondary"}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No imports yet — scan for opportunities to get started
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/product-scout">
          <Card className="cursor-pointer transition-colors hover:border-primary">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Find Products</p>
                <p className="text-xs text-muted-foreground">Scout AliExpress</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/opportunities">
          <Card className="cursor-pointer transition-colors hover:border-primary">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Review Opportunities</p>
                <p className="text-xs text-muted-foreground">Profitable items</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/cashback">
          <Card className="cursor-pointer transition-colors hover:border-primary">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Optimize Cashback</p>
                <p className="text-xs text-muted-foreground">Maximize profit</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/listing-builder">
          <Card className="cursor-pointer transition-colors hover:border-primary">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Build Listing</p>
                <p className="text-xs text-muted-foreground">AI-powered</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
