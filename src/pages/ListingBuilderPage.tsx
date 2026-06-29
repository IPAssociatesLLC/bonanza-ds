import { useState } from "react"
import { useFetch, apiPost, formatCurrency } from "@/hooks/useFetch"
import { PageHeader, LoadingSpinner, ErrorState } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sparkles, DollarSign, Upload, Loader2, CheckCircle2, XCircle,
  Image as ImageIcon,
} from "lucide-react"
import type { Opportunity } from "@/types"

interface OpportunitiesResponse {
  items: Opportunity[]
  total: number
}

interface FormState {
  title: string
  description: string
  price: string
  quantity: string
  category: string
  shippingCost: string
  imageUrls: string
  brand: string
  upc: string
  mpn: string
  googleProductCategory: string
  condition: string
}

const DEFAULT_FORM: FormState = {
  title: "",
  description: "",
  price: "",
  quantity: "1",
  category: "",
  shippingCost: "",
  imageUrls: "",
  brand: "brand not available",
  upc: "brand not available",
  mpn: "does not apply",
  googleProductCategory: "2097",
  condition: "new",
}

const CONDITIONS = ["new", "refurbished", "used", "like new"]

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

export function ListingBuilderPage() {
  const [selectedOppId, setSelectedOppId] = useState<string>("manual")
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [aiLoading, setAiLoading] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  function handleRemoveImage(index: number) {
    const currentImages = form.imageUrls.split("\n").filter(Boolean)
    currentImages.splice(index, 1)
    setForm({ ...form, imageUrls: currentImages.join("\n") })
    if (selectedImageIndex >= currentImages.length) {
      setSelectedImageIndex(Math.max(0, currentImages.length - 1))
    }
  }


  const { data, loading, error: fetchError } = useFetch<OpportunitiesResponse>("/api/opportunities?limit=100")
  const opportunities = data?.items ?? []

  function handleSelectOpportunity(id: string) {
    setSelectedOppId(id)
    if (id === "manual") {
      setForm(DEFAULT_FORM)
      return
    }
    const opp = opportunities.find((o) => o.id === parseInt(id))
    if (opp) {
      setForm({
        title: opp.ai_title || opp.title,
        description: opp.ai_description || opp.description,
        price: String(opp.target_price),
        quantity: String(Math.min(opp.stock, 10) || 1),
        category: opp.category,
        shippingCost: String(opp.shipping_cost),
        imageUrls: opp.image_urls?.join("\n") || "",
        brand: "brand not available",
        upc: "brand not available",
        mpn: opp.source_product_id ? `MPN-${opp.source_product_id}` : "does not apply",
        googleProductCategory: getGoogleProductCategory(opp.category),
        condition: "new",
      })
    }
  }

  async function handleGenerateAI() {
    if (selectedOppId === "manual") {
      setError("Select an opportunity to generate AI content")
      return
    }
    setAiLoading(true)
    setError(null)
    try {
      const resp = await apiPost<{ ai_title: string; ai_description: string }>(
        `/api/opportunities/${selectedOppId}/generate-ai`, {}
      )
      setForm((prev) => ({ ...prev, title: resp.ai_title, description: resp.ai_description }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed")
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSuggestPrice() {
    if (selectedOppId === "manual") {
      setError("Select an opportunity to suggest a price")
      return
    }
    setPriceLoading(true)
    setError(null)
    try {
      const resp = await apiPost<{ suggested_price: number }>(
        `/api/opportunities/${selectedOppId}/suggest-price`, {}
      )
      setForm((prev) => ({ ...prev, price: String(resp.suggested_price) })
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Price suggestion failed")
    } finally {
      setPriceLoading(false)
    }
  }

  async function handleCreateListing() {
    setCreating(true)
    setError(null)
    setResult(null)
    try {
      if (selectedOppId !== "manual") {
        const resp = await apiPost<{ results: Array<{ status: string; listing_id?: number; message?: string }> }>(
          "/api/import-to-bonanza",
          { opportunity_ids: [parseInt(selectedOppId)], auto_generate: false }
        )
        const r = resp.results[0]
        if (r.status === "listed") {
          setResult(`Listing created successfully! Listing ID: ${r.listing_id}`)
        } else {
          setError(r.message || "Listing creation failed")
        }
      } else {
        setError("Manual listing creation requires an opportunity. Please select one from the dropdown.")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create listing")
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading opportunities..." />
  if (fetchError) return <ErrorState message={fetchError} />

  const price = parseFloat(form.price) || 0
  const shippingCost = parseFloat(form.shippingCost) || 0
  const opp = opportunities.find((o) => o.id === parseInt(selectedOppId))
  const sourcePrice = opp ? opp.source_price : (price * 0.70) // fallback to 70% of price if manual
  const bonanzaFee = price * 0.20 // 20% default fee
  const profit = price - sourcePrice - shippingCost - bonanzaFee
  const margin = price > 0 ? (profit / price) * 100 : 0

  const images = form.imageUrls.split("\n").filter(Boolean)
  const complianceChecks = [
    { label: "Brand set", ok: form.brand.trim().length > 0 },
    { label: "UPC set", ok: form.upc.trim().length > 0 },
    { label: "identifier_exists flag", ok: form.brand === "brand not available" || form.upc === "brand not available" },
    { label: "Condition specified", ok: form.condition.trim().length > 0 },
    { label: "At least 1 image", ok: images.length > 0 },
  ]
  const compliantCount = complianceChecks.filter((c) => c.ok).length

  return (
    <div>
      <PageHeader
        title="Listing Builder"
        description="Create Google Shopping-optimized Bonanza listings with AI"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column — Form */}
        <div className="space-y-6">
          {/* Opportunity Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source Opportunity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select an Opportunity</Label>
                <Select value={selectedOppId} onValueChange={handleSelectOpportunity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an opportunity..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                    {opportunities.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={aiLoading || selectedOppId === "manual"}>
                  {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate with AI
                </Button>
                <Button variant="outline" size="sm" onClick={handleSuggestPrice} disabled={priceLoading || selectedOppId === "manual"}>
                  {priceLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                  Suggest Price
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Listing Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Listing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lb-title">Title</Label>
                <Input id="lb-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lb-desc">Description</Label>
                <Textarea id="lb-desc" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lb-price">Price</Label>
                  <Input id="lb-price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lb-qty">Quantity</Label>
                  <Input id="lb-qty" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lb-cat">Category</Label>
                  <Input id="lb-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lb-ship">Shipping Cost</Label>
                  <Input id="lb-ship" type="number" step="0.01" value={form.shippingCost} onChange={(e) => setForm({ ...form, shippingCost: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lb-images">Image URLs (one per line)</Label>
                <Textarea id="lb-images" rows={3} value={form.imageUrls} onChange={(e) => setForm({ ...form, imageUrls: e.target.value })} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>

          {/* Google Shopping Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Google Shopping Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lb-brand">Brand</Label>
                  <Input id="lb-brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lb-upc">UPC</Label>
                  <Input id="lb-upc" value={form.upc} onChange={(e) => setForm({ ...form, upc: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lb-mpn">MPN</Label>
                  <Input id="lb-mpn" value={form.mpn} onChange={(e) => setForm({ ...form, mpn: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lb-gpc">Google Product Category</Label>
                  <Input id="lb-gpc" value={form.googleProductCategory} onChange={(e) => setForm({ ...form, googleProductCategory: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lb-condition">Condition</Label>
                <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                  <SelectTrigger id="lb-condition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {result && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-500">
              {result}
            </div>
          )}

          <Button className="w-full" size="lg" onClick={handleCreateListing} disabled={creating || !form.title}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Create Listing
          </Button>
        </div>

        {/* Right Column — Preview */}
        <div className="space-y-6">
          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex h-64 items-center justify-center rounded-lg bg-muted overflow-hidden">
                  {images.length > 0 ? (
                    <img
                      src={images[selectedImageIndex] || images[0]}
                      alt={form.title}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                </div>
                {images.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                    {images.map((url, idx) => (
                      <div key={idx} className="relative group shrink-0">
                        <img
                          src={url}
                          alt={`Thumbnail ${idx + 1}`}
                          className={`h-16 w-16 cursor-pointer rounded-md object-cover border-2 transition-all ${selectedImageIndex === idx ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}
                          onClick={() => setSelectedImageIndex(idx)}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none"
                          }}
                        />
                        <button
                          type="button"
                          className="absolute -top-1 -right-1 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-90 hover:opacity-100 group-hover:flex"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveImage(idx)
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <h3 className="text-lg font-semibold text-foreground">{form.title || "Untitled Listing"}</h3>
              <p className="mt-1 text-2xl font-bold text-primary">{formatCurrency(price)}</p>
              <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">
                {form.description || "No description yet."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {form.category && <Badge variant="secondary">{form.category}</Badge>}
                <Badge variant="outline">Condition: {form.condition}</Badge>
                {images.length > 0 && <Badge variant="outline">{images.length} image{images.length !== 1 ? "s" : ""}</Badge>}
              </div>
            </CardContent>
          </Card>

          {/* Compliance Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Google Shopping Compliance
                <Badge className="ml-2" variant="secondary">{compliantCount}/{complianceChecks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {complianceChecks.map((check) => (
                <div key={check.label} className="flex items-center gap-2 text-sm">
                  {check.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className={check.ok ? "text-foreground" : "text-muted-foreground"}>{check.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Margin Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Margin Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Source Price</span>
                <span className="font-medium text-foreground">{formatCurrency(sourcePrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Target Price</span>
                <span className="font-medium text-foreground">{formatCurrency(price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bonanza Fee (20%)</span>
                <span className="font-medium text-destructive">-{formatCurrency(bonanzaFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="font-medium text-foreground">Profit</span>
                <span className={`font-bold ${profit > 0 ? "text-green-500" : "text-destructive"}`}>
                  {formatCurrency(profit)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-foreground">Margin</span>
                <span className={`font-bold ${margin >= 15 ? "text-green-500" : "text-muted-foreground"}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
