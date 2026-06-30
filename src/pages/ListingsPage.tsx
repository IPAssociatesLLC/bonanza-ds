import { useState, useMemo } from "react"
import { useFetch, apiPut, apiDelete, formatCurrency, formatDate } from "@/hooks/useFetch"
import { PageHeader, LoadingSpinner, ErrorState, EmptyState } from "@/components/PageParts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  MoreVertical, Pencil, Trash2, RefreshCw, Plug, ExternalLink, Loader2,
} from "lucide-react"
import type { Listing } from "@/types"

const TAB_VALUES = ["all", "pending", "listed", "failed", "updated"] as const

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

interface EditForm {
  title: string
  description: string
  price: string
  quantity: string
  shipping_cost: string
}

export function ListingsPage() {
  const [activeTab, setActiveTab] = useState<string>("all")
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    title: "", description: "", price: "", quantity: "", shipping_cost: "",
  })
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testingConn, setTestingConn] = useState(false)
  const [connResult, setConnResult] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, loading, error, refetch } = useFetch<Listing[]>("/api/listings?limit=100")

  const listings = data ?? []

  const filtered = useMemo(() => {
    if (activeTab === "all") return listings
    return listings.filter((l) => l.status === activeTab)
  }, [listings, activeTab])

  function openEdit(listing: Listing) {
    setEditId(listing.id)
    setEditForm({
      title: listing.title,
      description: listing.description,
      price: String(listing.price),
      quantity: String(listing.quantity),
      shipping_cost: String(listing.shipping_cost),
    })
    setEditOpen(true)
  }

  async function handleSave() {
    if (editId === null) return
    setSaving(true)
    setActionError(null)
    try {
      await apiPut(`/api/listings/${editId}`, {
        title: editForm.title,
        description: editForm.description,
        price: parseFloat(editForm.price) || 0,
        quantity: parseInt(editForm.quantity) || 0,
        shipping_cost: parseFloat(editForm.shipping_cost) || 0,
      })
      setEditOpen(false)
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    setActionError(null)
    try {
      await apiDelete(`/api/listings/${id}`)
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete")
    }
  }

  async function handleSyncFromBonanza() {
    setSyncing(true)
    setActionError(null)
    try {
      await fetch("/api/bonanza/booth-items")
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  async function handleTestConnection() {
    setTestingConn(true)
    setConnResult(null)
    try {
      const resp = await fetch("/api/bonanza/test-connection", { method: "POST" })
      const data = await resp.json()
      if (data.status === "connected") {
        setConnResult("Connection successful — Bonanza API is reachable.")
      } else {
        setConnResult(`Connection failed: ${data.message || "Unknown error"}`)
      }
    } catch (e) {
      setConnResult(e instanceof Error ? e.message : "Connection test failed")
    } finally {
      setTestingConn(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading listings..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div>
      <PageHeader
        title="Bonanza Listings"
        description="Manage your Bonanza marketplace listings"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleTestConnection} disabled={testingConn}>
              {testingConn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
              Test Connection
            </Button>
            <Button variant="outline" onClick={handleSyncFromBonanza} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync from Bonanza
            </Button>
          </div>
        }
      />

      {connResult && (
        <div className={`mb-4 rounded-lg border p-3 text-sm ${
          connResult.startsWith("Connection successful")
            ? "border-green-500/30 bg-green-500/10 text-green-500"
            : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}>
          {connResult}
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {TAB_VALUES.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      <Card className="mt-4">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              title="No listings found"
              description="Import opportunities or adjust your filters to see listings here."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bonanza Item ID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell className="max-w-[200px]">
                        <p className="line-clamp-1 font-medium text-foreground">{listing.title}</p>
                      </TableCell>
                      <TableCell>{formatCurrency(listing.price)}</TableCell>
                      <TableCell>
                        <span className={listing.quantity === 0 ? "text-destructive" : ""}>
                          {listing.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{listing.category || "—"}</TableCell>
                      <TableCell>{getStatusBadge(listing.status)}</TableCell>
                      <TableCell>
                        {listing.bonanza_item_id ? (
                          <a
                            href={`https://www.bonanza.com/listings/${listing.bonanza_item_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {listing.bonanza_item_id}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(listing.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(listing)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleSyncFromBonanza}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Sync with Bonanza
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(listing.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={4}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-shipping">Shipping Cost</Label>
                <Input
                  id="edit-shipping"
                  type="number"
                  step="0.01"
                  value={editForm.shipping_cost}
                  onChange={(e) => setEditForm({ ...editForm, shipping_cost: e.target.value })}
                />
              </div>
            </div>
            {actionError && (
              <p className="text-sm text-destructive">{actionError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
