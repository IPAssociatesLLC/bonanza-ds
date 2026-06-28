import { useState } from "react"
import { useFetch, apiPost, apiPut, apiDelete, formatCurrency, formatDate } from "@/hooks/useFetch"
import { PageHeader, LoadingSpinner, ErrorState, EmptyState } from "@/components/PageParts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
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
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Pencil, Play, MoreVertical, Trash2, Loader2, Package, Tag, DollarSign, Settings, Truck } from "lucide-react"
import type { ScanProfile } from "@/types"

const SOURCES = ["aliexpress", "walmart", "amazon", "ebay"]

interface ProfileFormData {
  name: string
  source: string
  categories: string
  keywords: string
  min_price: string
  max_price: string
  min_monthly_sales: string
  min_rating: string
  min_orders: string
  min_stock: string
  detect_out_of_stock: boolean
  min_margin_pct: string
  bonanza_fee_pct: string
  ship_to_country: string
  max_delivery_days: string
  is_active: boolean
}

const EMPTY_FORM: ProfileFormData = {
  name: "",
  source: "aliexpress",
  categories: "",
  keywords: "",
  min_price: "0",
  max_price: "100",
  min_monthly_sales: "50",
  min_rating: "4.0",
  min_orders: "10",
  min_stock: "1",
  detect_out_of_stock: true,
  min_margin_pct: "30",
  bonanza_fee_pct: "20",
  ship_to_country: "US",
  max_delivery_days: "30",
  is_active: true,
}

function profileToForm(p: ScanProfile): ProfileFormData {
  return {
    name: p.name,
    source: p.source,
    categories: p.categories,
    keywords: p.keywords,
    min_price: String(p.min_price),
    max_price: String(p.max_price),
    min_monthly_sales: String(p.min_monthly_sales),
    min_rating: String(p.min_rating),
    min_orders: String(p.min_orders),
    min_stock: String(p.min_stock),
    detect_out_of_stock: p.detect_out_of_stock,
    min_margin_pct: String(p.min_margin_pct),
    bonanza_fee_pct: String(p.bonanza_fee_pct),
    ship_to_country: p.ship_to_country,
    max_delivery_days: String(p.max_delivery_days),
    is_active: p.is_active,
  }
}

function formToPayload(f: ProfileFormData) {
  return {
    name: f.name,
    source: f.source,
    categories: f.categories,
    keywords: f.keywords,
    min_price: parseFloat(f.min_price) || 0,
    max_price: parseFloat(f.max_price) || 0,
    min_monthly_sales: parseInt(f.min_monthly_sales) || 0,
    min_rating: parseFloat(f.min_rating) || 0,
    min_orders: parseInt(f.min_orders) || 0,
    min_stock: parseInt(f.min_stock) || 0,
    detect_out_of_stock: f.detect_out_of_stock,
    min_margin_pct: parseFloat(f.min_margin_pct) || 0,
    bonanza_fee_pct: parseFloat(f.bonanza_fee_pct) || 0,
    ship_to_country: f.ship_to_country,
    max_delivery_days: parseInt(f.max_delivery_days) || 0,
    is_active: f.is_active,
  }
}

export function ScanProfilesPage() {
  const { data: profiles, loading, error, refetch } = useFetch<ScanProfile[]>("/api/scan-profiles")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ProfileFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [scanningId, setScanningId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function openNew() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setDialogOpen(true)
  }

  function openEdit(p: ScanProfile) {
    setForm(profileToForm(p))
    setEditingId(p.id)
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
        await apiPut(`/api/scan-profiles/${editingId}`, payload)
      } else {
        await apiPost("/api/scan-profiles", payload)
      }
      setDialogOpen(false)
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  async function handleRunScan(p: ScanProfile) {
    setScanningId(p.id)
    setActionError(null)
    try {
      await apiPost("/api/run-scan", { profile_id: p.id })
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Scan failed to start")
    } finally {
      setScanningId(null)
    }
  }

  async function handleDelete() {
    if (deleteId === null) return
    try {
      await apiDelete(`/api/scan-profiles/${deleteId}`)
      setDeleteId(null)
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete profile")
    }
  }

  async function handleToggleActive(p: ScanProfile) {
    try {
      await apiPut(`/api/scan-profiles/${p.id}`, { is_active: !p.is_active })
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to update profile")
    }
  }

  return (
    <div>
      <PageHeader
        title="Scan Profiles"
        description="Configure automated product scanning rules"
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Profile
          </Button>
        }
      />

      {actionError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {loading && <LoadingSpinner text="Loading scan profiles..." />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && profiles && profiles.length === 0 && (
        <EmptyState
          title="No scan profiles yet"
          description="Create a scan profile to start finding profitable products automatically."
          action={
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Profile
            </Button>
          }
        />
      )}

      {!loading && !error && profiles && profiles.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-foreground">{p.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{p.source}</Badge>
                      {p.is_active ? (
                        <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(p)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRunScan(p)}>
                        <Play className="mr-2 h-4 w-4" />
                        Run Scan
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(p.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Details */}
                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      Price Range
                    </span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(p.min_price)} – {formatCurrency(p.max_price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Tag className="h-3.5 w-3.5" />
                      Min Margin
                    </span>
                    <span className="font-medium text-foreground">{p.min_margin_pct}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      Min Monthly Sales
                    </span>
                    <span className="font-medium text-foreground">{p.min_monthly_sales}</span>
                  </div>
                  {p.keywords && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Settings className="h-3.5 w-3.5" />
                        Keywords
                      </span>
                      <span className="max-w-[160px] truncate font-medium text-foreground">{p.keywords}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Truck className="h-3.5 w-3.5" />
                      Ship To / Max Days
                    </span>
                    <span className="font-medium text-foreground">{p.ship_to_country} / {p.max_delivery_days}d</span>
                  </div>
                  {p.last_scan_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last Scan</span>
                      <span className="font-medium text-foreground">{formatDate(p.last_scan_at)}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={p.is_active}
                      onCheckedChange={() => handleToggleActive(p)}
                    />
                    <span className="text-xs text-muted-foreground">{p.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRunScan(p)}
                      disabled={scanningId === p.id}
                    >
                      {scanningId === p.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Run Scan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Profile" : "New Scan Profile"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Basic Info</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. AliExpress Electronics"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  placeholder="e.g. wireless earbuds, bluetooth speaker"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="categories">Categories</Label>
                <Input
                  id="categories"
                  value={form.categories}
                  onChange={(e) => setForm({ ...form, categories: e.target.value })}
                  placeholder="e.g. Electronics, Home & Garden"
                />
              </div>
            </div>

            <Separator />

            {/* Price & Demand */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Price & Demand</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="min_price">Min Price ($)</Label>
                  <Input
                    id="min_price"
                    type="number"
                    value={form.min_price}
                    onChange={(e) => setForm({ ...form, min_price: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max_price">Max Price ($)</Label>
                  <Input
                    id="max_price"
                    type="number"
                    value={form.max_price}
                    onChange={(e) => setForm({ ...form, max_price: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="min_monthly_sales">Min Monthly Sales</Label>
                  <Input
                    id="min_monthly_sales"
                    type="number"
                    value={form.min_monthly_sales}
                    onChange={(e) => setForm({ ...form, min_monthly_sales: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="min_rating">Min Rating</Label>
                  <Input
                    id="min_rating"
                    type="number"
                    step="0.1"
                    value={form.min_rating}
                    onChange={(e) => setForm({ ...form, min_rating: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="min_orders">Min Orders</Label>
                  <Input
                    id="min_orders"
                    type="number"
                    value={form.min_orders}
                    onChange={(e) => setForm({ ...form, min_orders: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Stock Rules */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Stock Rules</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="min_stock">Min Stock</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    value={form.min_stock}
                    onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-2 pb-1.5">
                  <Switch
                    id="detect_out_of_stock"
                    checked={form.detect_out_of_stock}
                    onCheckedChange={(v) => setForm({ ...form, detect_out_of_stock: v })}
                  />
                  <Label htmlFor="detect_out_of_stock" className="cursor-pointer text-sm">
                    Detect out of stock
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Margin Rules */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Margin Rules</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="min_margin_pct">Min Margin (%)</Label>
                  <Input
                    id="min_margin_pct"
                    type="number"
                    value={form.min_margin_pct}
                    onChange={(e) => setForm({ ...form, min_margin_pct: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bonanza_fee_pct">Bonanza Fee (%)</Label>
                  <Input
                    id="bonanza_fee_pct"
                    type="number"
                    value={form.bonanza_fee_pct}
                    onChange={(e) => setForm({ ...form, bonanza_fee_pct: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Shipping */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Shipping</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ship_to_country">Ship To Country</Label>
                  <Input
                    id="ship_to_country"
                    value={form.ship_to_country}
                    onChange={(e) => setForm({ ...form, ship_to_country: e.target.value })}
                    placeholder="US"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max_delivery_days">Max Delivery Days</Label>
                  <Input
                    id="max_delivery_days"
                    type="number"
                    value={form.max_delivery_days}
                    onChange={(e) => setForm({ ...form, max_delivery_days: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="is_active" className="cursor-pointer text-sm">
                Profile is active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId !== null ? "Save Changes" : "Create Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Profile</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this scan profile? This action cannot be undone.
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
