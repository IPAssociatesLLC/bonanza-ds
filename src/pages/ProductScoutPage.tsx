import { useState } from "react"
import { Link } from "react-router-dom"
import { useFetch, apiPost, formatCurrency, formatNumber } from "@/hooks/useFetch"
import { PageHeader, LoadingSpinner, ErrorState, EmptyState } from "@/components/PageParts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Zap, Star, TrendingUp, Package, AlertCircle, Loader2 } from "lucide-react"
import type { Opportunity } from "@/types"

interface OpportunitiesResponse {
  items: Opportunity[]
  total: number
}

export function ProductScoutPage() {
  const [keyword, setKeyword] = useState("")
  const [source, setSource] = useState("aliexpress")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [minRating, setMinRating] = useState("")
  const [minOrders, setMinOrders] = useState("")
  const [category, setCategory] = useState("")
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const { data, loading, error, refetch } = useFetch<OpportunitiesResponse>(
    "/api/opportunities?limit=12"
  )

  const opportunities = data?.items ?? []

  async function handleStartScouting() {
    setScanning(true)
    setScanError(null)
    try {
      await apiPost("/api/run-scan", { profile_id: 1 })
      refetch()
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scan failed to start")
    } finally {
      setScanning(false)
    }
  }

  function getMarginBadge(margin: number) {
    if (margin >= 30) return <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20">+{margin.toFixed(1)}%</Badge>
    if (margin >= 15) return <Badge className="bg-blue-500/15 text-blue-500 hover:bg-blue-500/20">+{margin.toFixed(1)}%</Badge>
    return <Badge variant="secondary">{margin.toFixed(1)}%</Badge>
  }

  return (
    <div>
      <PageHeader
        title="Product Scout"
        description="Search AliExpress for profitable drop shipping products"
      />

      {/* Search & Source */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="keyword">Search Keywords</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="keyword"
                    placeholder="e.g. wireless earbuds, phone case, LED strip..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-full sm:w-[180px] space-y-1.5">
                <Label>Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aliexpress">AliExpress</SelectItem>
                    <SelectItem value="walmart">Walmart</SelectItem>
                    <SelectItem value="amazon">Amazon</SelectItem>
                    <SelectItem value="ebay">eBay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Min Price ($)</Label>
                <Input type="number" placeholder="0.00" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Price ($)</Label>
                <Input type="number" placeholder="100.00" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Min Rating</Label>
                <Input type="number" step="0.1" min="0" max="5" placeholder="4.0" value={minRating} onChange={(e) => setMinRating(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Min Orders</Label>
                <Input type="number" placeholder="100" value={minOrders} onChange={(e) => setMinOrders(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Input placeholder="Electronics" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleStartScouting} disabled={scanning}>
                {scanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Start Scouting
                  </>
                )}
              </Button>
              {scanError && (
                <p className="text-sm text-destructive">{scanError}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <div>
          <p className="text-sm font-medium text-foreground">Products are discovered via Scan Profiles</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bonanza DS uses automated scan profiles to find profitable products. Configure a scan profile with your criteria,
            then run a scan to discover new opportunities. The products below were found by recent scans.
          </p>
        </div>
      </div>

      {/* Recently Found Products */}
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recently Found Products</h2>
          <Link to="/opportunities">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>

        {loading && <LoadingSpinner text="Loading products..." />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && opportunities.length === 0 && (
          <EmptyState
            title="No products found yet"
            description="Run a scan to discover profitable products from AliExpress and other sources."
            action={
              <Link to="/scan-profiles">
                <Button>Configure Scan Profiles</Button>
              </Link>
            }
          />
        )}

        {!loading && !error && opportunities.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((opp) => (
              <Card key={opp.id} className="overflow-hidden transition-colors hover:border-primary">
                <div className="flex h-40 items-center justify-center bg-muted">
                  {opp.image_urls && opp.image_urls.length > 0 ? (
                    <img
                      src={opp.image_urls[0]}
                      alt={opp.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none"
                      }}
                    />
                  ) : (
                    <Package className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-medium text-foreground">{opp.title}</p>
                    {getMarginBadge(opp.margin_pct)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{opp.category || "Uncategorized"}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(opp.target_price)}</p>
                      <p className="text-xs text-muted-foreground">Source: {formatCurrency(opp.source_price)}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-foreground">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                        {opp.rating.toFixed(1)}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatNumber(opp.monthly_sales)} sold</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{opp.source}</Badge>
                    <div className="flex items-center gap-1 text-xs text-green-500">
                      <TrendingUp className="h-3 w-3" />
                      {opp.final_profit > 0 ? formatCurrency(opp.final_profit) : "—"} profit
                    </div>
                  </div>

                  <Link to="/opportunities" className="mt-3 block">
                    <Button variant="outline" size="sm" className="w-full">View Details</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
