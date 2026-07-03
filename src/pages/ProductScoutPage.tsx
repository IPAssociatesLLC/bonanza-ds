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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Zap, Star, TrendingUp, Package, AlertCircle, Loader2, ExternalLink, Store } from "lucide-react"
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
  const [detailId, setDetailId] = useState<number | null>(null)
  const [selectedDialogImageIndex, setSelectedDialogImageIndex] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const { data, loading, error, refetch } = useFetch<OpportunitiesResponse>(
    "/api/scan-results?limit=12"
  )

  const opportunities = data?.items ?? []
  
  const detailOpp = opportunities.find(o => o.id === detailId) || null
  const detailLoading = false

  async function handleStartScouting() {
    setScanning(true)
    setScanError(null)
    try {
      await apiPost("/api/run-scan", { 
        profile_id: 1,
        override_keyword: keyword || undefined
      })
      refetch()
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scan failed to start")
    } finally {
      setScanning(false)
    }
  }

  async function handleSave(id: number) {
    setActionLoading(`save-${id}`)
    try {
      await apiPost("/api/import-to-bonanza", {
        opportunity_ids: [id],
        auto_generate: true,
        push_to_bonanza: false
      })
      refetch()
    } catch (e) {
      // Ignore
    } finally {
      setActionLoading(null)
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

                  <div className="mt-3 flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setDetailId(opp.id)
                        setSelectedDialogImageIndex(0)
                      }}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleSave(opp.id)}
                      disabled={actionLoading === `save-${opp.id}`}
                    >
                      {actionLoading === `save-${opp.id}` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="w-full overflow-y-auto sm:max-w-[800px] max-h-[90vh] bg-white dark:bg-zinc-950 border border-border text-card-foreground shadow-xl sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Opportunity Details</DialogTitle>
          </DialogHeader>

          {detailLoading && <LoadingSpinner text="Loading details..." />}

          {!detailLoading && detailOpp && (
            <div className="space-y-5 px-4 pb-6">
              {/* Image Gallery */}
              {detailOpp.image_urls && detailOpp.image_urls.length > 0 && (
                <div className="mb-4 flex flex-col sm:flex-row gap-4 h-[400px]">
                  {/* Left: Thumbnails */}
                  {detailOpp.image_urls.length > 1 && (
                    <div className="flex flex-row sm:flex-col gap-2 overflow-auto sm:w-20 shrink-0">
                      {detailOpp.image_urls.map((url, idx) => (
                        <div key={idx} className="relative group shrink-0">
                          <img
                            src={url}
                            alt={`Thumbnail ${idx + 1}`}
                            className={`h-16 w-16 cursor-pointer rounded-md object-cover border-2 transition-all ${selectedDialogImageIndex === idx ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}
                            onClick={() => setSelectedDialogImageIndex(idx)}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none"
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Right: Main Image */}
                  <div className="flex-1 flex items-center justify-center rounded-lg bg-muted overflow-hidden border">
                    <img
                      src={detailOpp.image_urls[selectedDialogImageIndex] || detailOpp.image_urls[0]}
                      alt={detailOpp.title}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none"
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Title & Status */}
              <div>
                <h3 className="text-lg font-semibold text-foreground">{detailOpp.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">{detailOpp.source}</Badge>
                  {detailOpp.category && (
                    <Badge variant="secondary" className="capitalize">{detailOpp.category}</Badge>
                  )}
                </div>
              </div>

              {/* Description */}
              {detailOpp.description && (
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-foreground">Description</h4>
                  <p className="text-sm text-muted-foreground line-clamp-4">{detailOpp.description}</p>
                </div>
              )}

              {/* Pricing */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">Pricing & Profitability</h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-muted/50 p-3 border border-border">
                    <p className="text-xs text-muted-foreground">Source Price</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(detailOpp.source_price)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 border border-border">
                    <p className="text-xs text-muted-foreground">Shipping Cost</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(detailOpp.shipping_cost)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 border border-border">
                    <p className="text-xs text-muted-foreground">Target Price</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(detailOpp.target_price)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 border border-border">
                    <p className="text-xs text-muted-foreground">Margin</p>
                    <p className="text-lg font-bold text-green-500">{detailOpp.margin_pct.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 border border-border">
                    <p className="text-xs text-muted-foreground">Cashback ({detailOpp.cashback_rate}%)</p>
                    <p className="text-lg font-bold text-green-500">{formatCurrency(detailOpp.cashback_amount)}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
                    <p className="text-xs text-primary/80">Final Profit</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(detailOpp.final_profit)}</p>
                  </div>
                </div>
              </div>

              {/* Product Metrics */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">Product Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Star className="h-3.5 w-3.5" />
                      Rating
                    </span>
                    <span className="font-medium text-foreground">{detailOpp.rating.toFixed(1)} ({formatNumber(detailOpp.review_count)} reviews)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Monthly Sales
                    </span>
                    <span className="font-medium text-foreground">{formatNumber(detailOpp.monthly_sales)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      Stock
                    </span>
                    <span className="font-medium text-foreground">{formatNumber(detailOpp.stock)}</span>
                  </div>
                </div>
              </div>

              {/* Source Link & Save Button */}
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                {detailOpp.source_url ? (
                  <a
                    href={detailOpp.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View on {detailOpp.source}
                  </a>
                ) : (
                  <div />
                )}
                
                <Button 
                  onClick={() => handleSave(detailOpp.id)}
                  disabled={actionLoading === `save-${detailOpp.id}`}
                >
                  {actionLoading === `save-${detailOpp.id}` ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Save to Opportunities"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
