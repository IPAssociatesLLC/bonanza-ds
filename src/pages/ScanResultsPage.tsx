import { useState, useMemo, useCallback } from "react"
import { useFetch, apiPost, apiPut, formatCurrency, formatNumber, formatDate } from "@/hooks/useFetch"
import { PageHeader, LoadingSpinner, ErrorState, EmptyState } from "@/components/PageParts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Package, Eye, Upload, Ban, Sparkles, MoreVertical, Loader2, TrendingUp,
  DollarSign, Star, Store, ShieldCheck, AlertTriangle, ExternalLink, Play
} from "lucide-react"
import type { Opportunity } from "@/types"

interface OpportunitiesResponse {
  items: Opportunity[]
  total: number
}

const SOURCES = ["aliexpress", "walmart", "amazon", "ebay"]
const STATUSES = ["new", "approved", "imported", "ignored"]

function getStatusBadge(status: string) {
  switch (status) {
    case "new":
      return <Badge className="bg-blue-500/15 text-blue-500 hover:bg-blue-500/20">New</Badge>
    case "approved":
      return <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20">Approved</Badge>
    case "imported":
      return <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Imported</Badge>
    case "ignored":
      return <Badge variant="secondary">Ignored</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getMarginBadge(margin: number) {
  if (margin >= 30) return <span className="font-medium text-green-500">{margin.toFixed(1)}%</span>
  if (margin >= 15) return <span className="font-medium text-blue-500">{margin.toFixed(1)}%</span>
  return <span className="font-medium text-muted-foreground">{margin.toFixed(1)}%</span>
}

function getRiskBadge(risk: string) {
  switch (risk.toLowerCase()) {
    case "low":
      return <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20"><ShieldCheck className="mr-1 h-3 w-3" />Low Risk</Badge>
    case "medium":
      return <Badge className="bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/20"><AlertTriangle className="mr-1 h-3 w-3" />Medium Risk</Badge>
    case "high":
      return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20"><AlertTriangle className="mr-1 h-3 w-3" />High Risk</Badge>
    default:
      return <Badge variant="outline">{risk}</Badge>
  }
}

export function ScanResultsPage() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [minMargin, setMinMargin] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [detailId, setDetailId] = useState<number | null>(null)
  const [selectedDialogImageIndex, setSelectedDialogImageIndex] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [triggerSuccess, setTriggerSuccess] = useState<string | null>(null)

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (statusFilter !== "all") params.set("status", statusFilter)
    if (sourceFilter !== "all") params.set("source", sourceFilter)
    if (minMargin > 0) params.set("min_margin", String(minMargin))
    if (categoryFilter.trim()) params.set("category", categoryFilter.trim())
    params.set("limit", "100")
    return params.toString()
  }, [statusFilter, sourceFilter, minMargin, categoryFilter])

  const { data, loading, error, refetch } = useFetch<OpportunitiesResponse>(`/api/scan-results?${queryParams}`)
  const opportunities = data?.items ?? []

  const { data: detailOpp, loading: detailLoading } = useFetch<Opportunity>(
    detailId !== null ? `/api/opportunities/${detailId}` : ""
  )

  const allSelected = opportunities.length > 0 && opportunities.every((o) => selected.has(o.id))
  const _someSelected = selected.size > 0 && !allSelected

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(opportunities.map((o) => o.id)))
    }
  }, [allSelected, opportunities])

  const toggleOne = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  async function handleStatusChange(id: number, status: string) {
    setActionLoading(`status-${id}`)
    setActionError(null)
    try {
      await apiPut(`/api/opportunities/${id}/status?status=${status}`, {})
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to update status")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleGenerateAI(id: number) {
    setActionLoading(`ai-${id}`)
    setActionError(null)
    try {
      await apiPost(`/api/opportunities/${id}/generate-ai`, {})
      refetch()
      if (detailId === id) {
        // Detail will refetch via useFetch
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "AI generation failed")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSuggestPrice(id: number) {
    setActionLoading(`price-${id}`)
    setActionError(null)
    try {
      await apiPost(`/api/opportunities/${id}/suggest-price`, {})
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Price suggestion failed")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleImportSelected() {
    if (selected.size === 0) return
    setImportLoading(true)
    setActionError(null)
    try {
      await apiPost("/api/import-to-bonanza", {
        opportunity_ids: Array.from(selected),
        auto_generate: true,
      })
      setSelected(new Set())
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Import failed")
    } finally {
      setImportLoading(false)
    }
  }

  async function handleImportOne(id: number) {
    setActionLoading(`import-${id}`)
    setActionError(null)
    try {
      await apiPost("/api/import-to-bonanza", {
        opportunity_ids: [id],
        auto_generate: true,
      })
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Import failed")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleTriggerScraper() {
    setTriggerLoading(true)
    setTriggerSuccess(null)
    setActionError(null)
    try {
      const res = await apiPost<{status: string; message: string}>("/api/scraper/trigger", {})
      setTriggerSuccess(res.message)
      setTimeout(() => setTriggerSuccess(null), 8000)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to trigger cloud scraper")
    } finally {
      setTriggerLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Manual Scan Results"
        description={`Found ${data?.total || 0} potential items from the Product Scout scanner.`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTriggerScraper}
              disabled={triggerLoading}
            >
              {triggerLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4 text-green-500" />
              )}
              Run Cloud Scraper
            </Button>
            <Button
              onClick={handleImportSelected}
              disabled={selected.size === 0 || importLoading}
            >
              {importLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Import Selected{selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
          </div>
        }
      />

      {triggerSuccess && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-500">
          {triggerSuccess}
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Filters Bar */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Input
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="e.g. Electronics"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Min Margin: {minMargin}%</Label>
              <Slider
                value={[minMargin]}
                onValueChange={(v) => setMinMargin(v[0])}
                min={0}
                max={60}
                step={5}
                className="pt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading && <LoadingSpinner text="Loading opportunities..." />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && opportunities.length === 0 && (
        <EmptyState
          title="No opportunities found"
          description="Try adjusting your filters or run a scan to find new profitable products."
        />
      )}

      {!loading && !error && opportunities.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Source Price</TableHead>
                    <TableHead className="text-right">Target Price</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    <TableHead className="text-right">Cashback</TableHead>
                    <TableHead className="text-right">Final Profit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp) => (
                    <TableRow key={opp.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(opp.id)}
                          onCheckedChange={() => toggleOne(opp.id)}
                          aria-label={`Select ${opp.title}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
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
                              <Package className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-[240px]">
                            <p className="truncate text-sm font-medium text-foreground">{opp.title}</p>
                            {opp.category && (
                              <p className="truncate text-xs text-muted-foreground">{opp.category}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{opp.source}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(opp.source_price)}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">{formatCurrency(opp.target_price)}</TableCell>
                      <TableCell className="text-right">{getMarginBadge(opp.margin_pct)}</TableCell>
                      <TableCell className="text-right">
                        {opp.cashback_amount > 0 ? (
                          <span className="text-sm text-green-500">{formatCurrency(opp.cashback_amount)}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-sm font-medium ${opp.final_profit >= 0 ? "text-green-500" : "text-destructive"}`}>
                          {formatCurrency(opp.final_profit)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(opp.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailId(opp.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleImportOne(opp.id)}
                              disabled={actionLoading === `import-${opp.id}`}
                            >
                              {actionLoading === `import-${opp.id}` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="mr-2 h-4 w-4" />
                              )}
                              Import to Bonanza
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGenerateAI(opp.id)}>
                              {actionLoading === `ai-${opp.id}` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="mr-2 h-4 w-4" />
                              )}
                              Generate AI Content
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleStatusChange(opp.id, "ignored")}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Ignore
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="w-full overflow-y-auto sm:max-w-[800px] max-h-[90vh] bg-white dark:bg-zinc-950 border border-border text-card-foreground shadow-xl sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
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
                  {getStatusBadge(detailOpp.status)}
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
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => handleSuggestPrice(detailOpp.id)}
                  disabled={actionLoading === `price-${detailOpp.id}`}
                >
                  {actionLoading === `price-${detailOpp.id}` ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                  )}
                  Suggest Optimal Price
                </Button>
              </div>

              {/* Product Metrics */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">Product Details & Metrics</h4>
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
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      Brand
                    </span>
                    <span className="font-medium text-foreground">{detailOpp.brand || "Unbranded"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      UPC / Barcode
                    </span>
                    <span className="font-medium text-foreground">{detailOpp.upc || "brand not available"}</span>
                  </div>
                  {detailOpp.discount_info && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <DollarSign className="h-3.5 w-3.5" />
                        Savings Info
                      </span>
                      <span className="font-medium text-green-500">{detailOpp.discount_info}</span>
                    </div>
                  )}
                  {detailOpp.monthly_search_volume > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Google Search Volume
                      </span>
                      <span className="font-medium text-foreground">{formatNumber(detailOpp.monthly_search_volume)} searches/mo</span>
                    </div>
                  )}
                  {detailOpp.google_low_price > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <DollarSign className="h-3.5 w-3.5" />
                        Google Shopping Range
                      </span>
                      <span className="font-medium text-foreground">{formatCurrency(detailOpp.google_low_price)} - {formatCurrency(detailOpp.google_high_price)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor Info */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">Vendor Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Store className="h-3.5 w-3.5" />
                      Seller
                    </span>
                    <span className="font-medium text-foreground">{detailOpp.seller_name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Star className="h-3.5 w-3.5" />
                      Seller Rating
                    </span>
                    <span className="font-medium text-foreground">{detailOpp.seller_rating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      Seller Years
                    </span>
                    <span className="font-medium text-foreground">{detailOpp.seller_years} years</span>
                  </div>
                </div>
              </div>

              {/* Vendor Analysis */}
              {detailOpp.vendor_analysis && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-foreground">Vendor Analysis</h4>
                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Risk Level</span>
                      {getRiskBadge(detailOpp.vendor_analysis.risk_level)}
                    </div>
                    {detailOpp.vendor_analysis.summary && (
                      <p className="text-sm text-muted-foreground">{detailOpp.vendor_analysis.summary}</p>
                    )}
                    {detailOpp.vendor_analysis.recommendation && (
                      <div className="flex items-start gap-2 border-t border-border pt-3">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <p className="text-sm text-foreground">{detailOpp.vendor_analysis.recommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Content */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">AI-Generated Content</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateAI(detailOpp.id)}
                    disabled={actionLoading === `ai-${detailOpp.id}`}
                  >
                    {actionLoading === `ai-${detailOpp.id}` ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {detailOpp.ai_title ? "Regenerate" : "Generate"}
                  </Button>
                </div>
                {detailOpp.ai_title || detailOpp.ai_description ? (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                    {detailOpp.ai_title && (
                      <div>
                        <p className="text-xs text-muted-foreground">AI Title</p>
                        <p className="text-sm font-medium text-foreground">{detailOpp.ai_title}</p>
                      </div>
                    )}
                    {detailOpp.ai_description && (
                      <div>
                        <p className="text-xs text-muted-foreground">AI Description</p>
                        <p className="text-sm text-muted-foreground">{detailOpp.ai_description}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No AI content generated yet. Click "Generate" to create an optimized title and description.</p>
                )}
              </div>

              {/* Source Link */}
              {detailOpp.source_url && (
                <a
                  href={detailOpp.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on {detailOpp.source}
                </a>
              )}

              <Separator />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => handleImportOne(detailOpp.id)}
                  disabled={actionLoading === `import-${detailOpp.id}`}
                >
                  {actionLoading === `import-${detailOpp.id}` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Import to Bonanza
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(detailOpp.id, "approved")}
                >
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleStatusChange(detailOpp.id, "ignored")}
                >
                  <Ban className="mr-1.5 h-3.5 w-3.5" />
                  Ignore
                </Button>
              </div>

              {/* Timestamps */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Created: {formatDate(detailOpp.created_at)}</span>
                <span>Updated: {formatDate(detailOpp.updated_at)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
