import { useState } from "react"
import { useFetch, apiPost, apiPut, apiDelete } from "@/hooks/useFetch"
import { PageHeader, LoadingSpinner, ErrorState, EmptyState } from "@/components/PageParts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Loader2, ExternalLink, Award, Store, Percent } from "lucide-react"
import type { CashbackSite } from "@/types"

const ALL_STORES = ["aliexpress", "walmart", "amazon", "ebay"]

interface SiteFormData {
  name: string
  url: string
  default_rate: string
  upfront_discount: string
  supported_stores: string
  is_active: boolean
  notes: string
}

const EMPTY_FORM: SiteFormData = {
  name: "",
  url: "",
  default_rate: "0",
  upfront_discount: "0",
  supported_stores: "",
  is_active: true,
  notes: "",
}

function siteToForm(s: CashbackSite): SiteFormData {
  return {
    name: s.name,
    url: s.url,
    default_rate: String(s.default_rate),
    upfront_discount: String(s.upfront_discount),
    supported_stores: s.supported_stores,
    is_active: s.is_active,
    notes: s.notes,
  }
}

function formToPayload(f: SiteFormData) {
  return {
    name: f.name,
    url: f.url,
    default_rate: parseFloat(f.default_rate) || 0,
    upfront_discount: parseFloat(f.upfront_discount) || 0,
    supported_stores: f.supported_stores,
    is_active: f.is_active,
    notes: f.notes,
  }
}

function parseStores(s: string): string[] {
  if (!s) return []
  return s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)
}

export function CashbackPage() {
  const { data: sites, loading, error, refetch } = useFetch<CashbackSite[]>("/api/cashback")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<SiteFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function openNew() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setDialogOpen(true)
  }

  function openEdit(s: CashbackSite) {
    setForm(siteToForm(s))
    setEditingId(s.id)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setActionError("Name is required")
      return
    }
    setSaving(true)
    setActionError(null)
    try {
      const payload = formToPayload(form)
      if (editingId !== null) {
        await apiPut(`/api/cashback/${editingId}`, payload)
      } else {
        await apiPost("/api/cashback", payload)
      }
      setDialogOpen(false)
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to save cashback site")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (deleteId === null) return
    try {
      await apiDelete(`/api/cashback/${deleteId}`)
      setDeleteId(null)
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete cashback site")
    }
  }

  // Compute best site per store
  const bestByStore = ALL_STORES.map((store) => {
    const matching = (sites ?? []).filter((s) => {
      const stores = parseStores(s.supported_stores)
      return stores.length === 0 || stores.includes(store)
    })
    if (matching.length === 0) return { store, site: null, rate: 0 }
    const best = matching.reduce((best, s) => {
      const score = s.default_rate + s.upfront_discount
      const bestScore = best.default_rate + best.upfront_discount
      return score > bestScore ? s : best
    })
    return { store, site: best, rate: best.default_rate + best.upfront_discount }
  })

  // Track which site is best for each store for badge highlighting
  const bestSiteNames = new Set(
    bestByStore.filter((b) => b.site).map((b) => b.site!.name)
  )

  return (
    <div>
      <PageHeader
        title="Cashback Optimizer"
        description="Maximize profit with the best cashback rates"
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Site
          </Button>
        }
      />

      {actionError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {loading && <LoadingSpinner text="Loading cashback sites..." />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && sites && sites.length === 0 && (
        <EmptyState
          title="No cashback sites yet"
          description="Add cashback sites to track and compare the best rates across marketplaces."
          action={
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add Site
            </Button>
          }
        />
      )}

      {/* Cards Grid */}
      {!loading && !error && sites && sites.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((s) => {
            const stores = parseStores(s.supported_stores)
            const isBest = bestSiteNames.has(s.name)
            return (
              <Card key={s.id} className={isBest ? "border-primary/50" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-foreground">{s.name}</h3>
                        {isBest && (
                          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                            <Award className="mr-1 h-3 w-3" />
                            Best Rate
                          </Badge>
                        )}
                      </div>
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        >
                          {s.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteId(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Rates */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Percent className="h-3 w-3" />
                        Cashback Rate
                      </div>
                      <p className="mt-1 text-xl font-bold text-foreground">{s.default_rate}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Percent className="h-3 w-3" />
                        Upfront Discount
                      </div>
                      <p className="mt-1 text-xl font-bold text-foreground">{s.upfront_discount}%</p>
                    </div>
                  </div>

                  {/* Supported Stores */}
                  {stores.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Store className="h-3 w-3" />
                        Supported Stores
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {stores.map((store) => (
                          <Badge key={store} variant="outline" className="capitalize">{store}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {s.notes && (
                    <p className="mt-3 text-sm text-muted-foreground">{s.notes}</p>
                  )}

                  {/* Active status */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${s.is_active ? "bg-green-500" : "bg-muted-foreground"}`} />
                    <span className="text-xs text-muted-foreground">{s.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Comparison Table */}
      {!loading && !error && sites && sites.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-5">
            <h3 className="mb-4 text-base font-semibold text-foreground">Best Rate by Store</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Best Cashback Site</TableHead>
                  <TableHead className="text-right">Cashback Rate</TableHead>
                  <TableHead className="text-right">Upfront Discount</TableHead>
                  <TableHead className="text-right">Total Benefit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bestByStore.map(({ store, site, rate }) => (
                  <TableRow key={store}>
                    <TableCell className="font-medium capitalize">{store}</TableCell>
                    <TableCell>
                      {site ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{site.name}</span>
                          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                            <Award className="mr-1 h-3 w-3" />
                            Best
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No site available</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {site ? `${site.default_rate}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {site ? `${site.upfront_discount}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {site ? (
                        <span className="font-bold text-green-500">{rate.toFixed(1)}%</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Cashback Site" : "Add Cashback Site"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cb-name">Name</Label>
              <Input
                id="cb-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rakuten"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cb-url">URL</Label>
              <Input
                id="cb-url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://www.rakuten.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cb-rate">Default Rate (%)</Label>
                <Input
                  id="cb-rate"
                  type="number"
                  step="0.1"
                  value={form.default_rate}
                  onChange={(e) => setForm({ ...form, default_rate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cb-discount">Upfront Discount (%)</Label>
                <Input
                  id="cb-discount"
                  type="number"
                  step="0.1"
                  value={form.upfront_discount}
                  onChange={(e) => setForm({ ...form, upfront_discount: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cb-stores">Supported Stores</Label>
              <Input
                id="cb-stores"
                value={form.supported_stores}
                onChange={(e) => setForm({ ...form, supported_stores: e.target.value })}
                placeholder="aliexpress, walmart, amazon, ebay"
              />
              <p className="text-xs text-muted-foreground">Comma-separated. Leave empty to support all stores.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cb-notes">Notes</Label>
              <Textarea
                id="cb-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional details about this cashback site"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="cb-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="cb-active" className="cursor-pointer text-sm">
                Site is active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId !== null ? "Save Changes" : "Add Site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Cashback Site</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this cashback site? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
