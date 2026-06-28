import { useState, useMemo } from "react"
import { useFetch, apiPut, formatNumber } from "@/hooks/useFetch"
import { PageHeader, StatCard, LoadingSpinner, ErrorState, EmptyState } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  Rss, CheckCircle2, XCircle, AlertTriangle, Package, Wrench, Loader2,
} from "lucide-react"
import type { Listing } from "@/types"

interface ComplianceCheck {
  label: string
  description: string
}

const REQUIREMENTS: ComplianceCheck[] = [
  {
    label: "Brand",
    description: 'Must be "brand not available" if unknown',
  },
  {
    label: "UPC",
    description: 'Must be "brand not available" if unknown',
  },
  {
    label: "MPN",
    description: "Optional but recommended",
  },
  {
    label: "identifier_exists",
    description: "Should be false for items without UPC/MPN",
  },
  {
    label: "Google Product Category",
    description: "Required for Google Shopping feed",
  },
  {
    label: "Condition",
    description: "Must be specified (new, used, refurbished, etc.)",
  },
  {
    label: "Images",
    description: "At least 1 image required",
  },
]

function isListingCompliant(l: Listing): boolean {
  const hasBrand = l.brand && l.brand.trim().length > 0
  const hasUpc = l.upc && l.upc.trim().length > 0
  const hasCondition = l.condition && l.condition.trim().length > 0
  const hasImages = l.image_urls && l.image_urls.length > 0
  const hasGoogleCategory = l.google_product_category && l.google_product_category.trim().length > 0
  return Boolean(hasBrand && hasUpc && hasCondition && hasImages && hasGoogleCategory)
}

function hasMissingData(l: Listing): boolean {
  const hasBrand = l.brand && l.brand.trim().length > 0
  const hasUpc = l.upc && l.upc.trim().length > 0
  const hasCondition = l.condition && l.condition.trim().length > 0
  const hasImages = l.image_urls && l.image_urls.length > 0
  return !hasBrand || !hasUpc || !hasCondition || !hasImages
}

function getGoogleProductCategory(category: string): string {
  const cat = (category || "").toLowerCase();
  if (cat.includes("surfboard") || cat.includes("efoil")) return "3091";
  if (cat.includes("boat") || cat.includes("watercraft")) return "6093";
  if (cat.includes("mower") || cat.includes("lawn")) return "3506";
  if (cat.includes("dive") || cat.includes("scuba") || cat.includes("tank")) return "3080";
  if (cat.includes("sport") || cat.includes("water")) return "3071";
  if (cat.includes("garden") || cat.includes("home")) return "3237";
  return "2097";
}

export function GoogleFeedPage() {
  const [fixing, setFixing] = useState(false)
  const [fixResult, setFixResult] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, loading, error, refetch } = useFetch<Listing[]>("/api/listings?limit=200")

  const listings = data ?? []

  const stats = useMemo(() => {
    const total = listings.length
    const compliant = listings.filter(isListingCompliant).length
    const nonCompliant = listings.filter((l) => !isListingCompliant(l)).length
    const missingData = listings.filter(hasMissingData).length
    return { total, compliant, nonCompliant, missingData }
  }, [listings])

  const nonCompliantListings = useMemo(() => listings.filter((l) => !isListingCompliant(l)), [listings])

  async function handleFixAll() {
    setFixing(true)
    setFixResult(null)
    setActionError(null)
    let fixed = 0
    let failed = 0
    for (const listing of nonCompliantListings) {
      const updates: Record<string, unknown> = {}
      if (!listing.brand?.trim()) updates.brand = "brand not available"
      if (!listing.upc?.trim()) updates.upc = "brand not available"
      if (!listing.condition?.trim()) updates.condition = "new"
      if (!listing.google_product_category?.trim()) {
        updates.google_product_category = getGoogleProductCategory(listing.category)
      }
      if (!listing.mpn?.trim()) {
        updates.mpn = listing.external_url ? `MPN-${listing.external_url.split("/").pop()?.split(".")[0]}` : "does not apply"
      }
      if (Object.keys(updates).length === 0) continue
      try {
        await apiPut(`/api/listings/${listing.id}`, updates)
        fixed++
      } catch {
        failed++
      }
    }
    setFixing(false)
    if (failed > 0) {
      setActionError(`${failed} listing(s) failed to update.`)
    }
    setFixResult(`Fixed ${fixed} listing(s). ${failed} failed.`)
    refetch()
  }

  if (loading) return <LoadingSpinner text="Loading feed data..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div>
      <PageHeader
        title="Google Shopping Feed"
        description="Ensure listings meet Google Products requirements"
        actions={
          <Button onClick={handleFixAll} disabled={fixing || nonCompliantListings.length === 0}>
            {fixing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
            Fix All ({nonCompliantListings.length})
          </Button>
        }
      />

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Listings" value={formatNumber(stats.total)} icon={Package} color="primary" />
        <StatCard label="Compliant" value={formatNumber(stats.compliant)} icon={CheckCircle2} color="green" />
        <StatCard label="Non-Compliant" value={formatNumber(stats.nonCompliant)} icon={XCircle} color="orange" />
        <StatCard label="Missing Data" value={formatNumber(stats.missingData)} icon={AlertTriangle} color="blue" />
      </div>

      {fixResult && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-500">
          {fixResult}
        </div>
      )}
      {actionError && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Requirements Checklist */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Google Shopping Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {REQUIREMENTS.map((req) => (
              <div key={req.label} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Rss className="h-3 w-3 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{req.label}</p>
                  <p className="text-xs text-muted-foreground">{req.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Listings Compliance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {listings.length === 0 ? (
            <EmptyState
              title="No listings to check"
              description="Import products to see Google Shopping compliance status."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>UPC</TableHead>
                    <TableHead>MPN</TableHead>
                    <TableHead>identifier_exists</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Images</TableHead>
                    <TableHead>Compliant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.map((listing) => {
                    const compliant = isListingCompliant(listing)
                    const hasBrand = listing.brand?.trim()
                    const hasUpc = listing.upc?.trim()
                    const hasMpn = listing.mpn?.trim()
                    const hasCond = listing.condition?.trim()
                    const imgCount = listing.image_urls?.length ?? 0
                    return (
                      <TableRow key={listing.id}>
                        <TableCell className="max-w-[200px]">
                          <p className="line-clamp-1 font-medium text-foreground">{listing.title}</p>
                        </TableCell>
                        <TableCell>
                          {hasBrand ? (
                            <Badge variant="outline" className="text-xs">{listing.brand}</Badge>
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>
                          {hasUpc ? (
                            <Badge variant="outline" className="text-xs">{listing.upc}</Badge>
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>
                          {hasMpn ? (
                            <Badge variant="outline" className="text-xs">{listing.mpn}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={listing.identifier_exists ? "secondary" : "outline"} className="text-xs">
                            {String(listing.identifier_exists)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {hasCond ? (
                            <Badge variant="outline" className="text-xs">{listing.condition}</Badge>
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>
                          {imgCount > 0 ? (
                            <span className="flex items-center gap-1 text-sm text-foreground">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              {imgCount}
                            </span>
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>
                          {compliant ? (
                            <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Compliant
                            </Badge>
                          ) : (
                            <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20">
                              <XCircle className="mr-1 h-3 w-3" />
                              Non-Compliant
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
