import { useState, useMemo } from "react"
import { useFetch, formatCurrency, formatNumber } from "@/hooks/useFetch"
import { PageHeader, StatCard, LoadingSpinner, ErrorState, EmptyState } from "@/components/PageParts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Search,
  ExternalLink,
  Pencil,
  Boxes,
} from "lucide-react"
import { Link } from "react-router-dom"
import type { Listing } from "@/types"

const SOURCES = ["aliexpress", "walmart", "amazon", "ebay"]
const STATUSES = ["pending", "listed", "failed", "updated"]

function getStatusBadge(status: string) {
  switch (status) {
    case "listed":
      return <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20">Listed</Badge>
    case "pending":
      return <Badge className="bg-blue-500/15 text-blue-500 hover:bg-blue-500/20">Pending</Badge>
    case "failed":
      return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20">Failed</Badge>
    case "updated":
      return <Badge className="bg-orange-500/15 text-orange-500 hover:bg-orange-500/20">Updated</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getMarginBadge(margin: number) {
  if (margin >= 30) return <span className="font-medium text-green-500">{margin.toFixed(1)}%</span>
  if (margin >= 15) return <span className="font-medium text-blue-500">{margin.toFixed(1)}%</span>
  return <span className="font-medium text-muted-foreground">{margin.toFixed(1)}%</span>
}

export function ProductsPage() {
  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const { data, loading, error, refetch } = useFetch<Listing[]>("/api/listings?limit=100")

  const listings = data ?? []

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== "all" && l.status !== statusFilter) return false
      // source filter — listings don't have a source field directly, but external_url can hint
      if (sourceFilter !== "all") {
        const url = (l.external_url || "").toLowerCase()
        if (!url.includes(sourceFilter)) return false
      }
      return true
    })
  }, [listings, search, sourceFilter, statusFilter])

  const stats = useMemo(() => {
    const total = listings.length
    const active = listings.filter((l) => l.status === "listed").length
    const outOfStock = listings.filter((l) => l.quantity === 0).length
    const totalValue = listings.reduce((sum, l) => sum + l.price * l.quantity, 0)
    return { total, active, outOfStock, totalValue }
  }, [listings])

  if (loading) return <LoadingSpinner text="Loading products..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div>
      <PageHeader
        title="My Products"
        description="Manage your imported product inventory"
        actions={
          <Link to="/opportunities">
            <Button>
              <Package className="mr-2 h-4 w-4" />
              Find Products
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Products" value={formatNumber(stats.total)} icon={Boxes} color="primary" />
        <StatCard label="Active Listings" value={formatNumber(stats.active)} icon={Package} color="green" />
        <StatCard label="Out of Stock" value={formatNumber(stats.outOfStock)} icon={AlertTriangle} color="orange" />
        <StatCard label="Total Inventory Value" value={formatCurrency(stats.totalValue)} icon={DollarSign} color="blue" />
      </div>

      {/* Filter Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No products found"
            description="Import opportunities to start building your product inventory."
            action={
              <Link to="/opportunities">
                <Button variant="outline">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Browse Opportunities
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((listing) => {
            const margin = listing.price > 0 ? ((listing.price - listing.shipping_cost) / listing.price) * 100 : 0
            const sourcePrice = listing.price - listing.shipping_cost
            return (
              <Card key={listing.id} className="overflow-hidden">
                {/* Image Placeholder */}
                <div className="flex h-40 items-center justify-center bg-muted">
                  {listing.image_urls && listing.image_urls.length > 0 ? (
                    <img
                      src={listing.image_urls[0]}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none"
                      }}
                    />
                  ) : (
                    <Package className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-sm font-medium text-foreground">{listing.title}</h3>
                    {getStatusBadge(listing.status)}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {listing.external_url?.includes("aliexpress") ? "AliExpress" :
                       listing.external_url?.includes("walmart") ? "Walmart" :
                       listing.external_url?.includes("amazon") ? "Amazon" :
                       listing.external_url?.includes("ebay") ? "eBay" : "Imported"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{listing.category || "Uncategorized"}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Source Price</p>
                      <p className="font-medium text-foreground">{formatCurrency(sourcePrice)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bonanza Price</p>
                      <p className="font-medium text-foreground">{formatCurrency(listing.price)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stock</p>
                      <p className={`font-medium ${listing.quantity === 0 ? "text-destructive" : "text-foreground"}`}>
                        {listing.quantity} units
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Margin</p>
                      <p>{getMarginBadge(margin)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link to="/listings" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    </Link>
                    {listing.bonanza_item_id && (
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <a
                          href={`https://www.bonanza.com/listings/${listing.bonanza_item_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          View on Bonanza
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
