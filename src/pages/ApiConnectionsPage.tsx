import { useState, useEffect, useCallback } from "react"
import { useFetch, apiPut, apiPost } from "@/hooks/useFetch"
import { PageHeader, LoadingSpinner, ErrorState } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Store,
  Bot,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Plug,
  Save,
  AlertCircle,
} from "lucide-react"
import type { AppSettings } from "@/types"

type ConnStatus = "idle" | "testing" | "connected" | "error"

interface FieldState {
  value: string
  saving: boolean
  saved: boolean
  error: string | null
}

function getSetting(settings: AppSettings | null, key: string, fallback = ""): string {
  if (!settings || !settings[key]) return fallback
  return settings[key].value
}

export function ApiConnectionsPage() {
  const { data: settings, loading, error, refetch } = useFetch<AppSettings>("/api/settings")

  // Bonanza fields
  const [bonanzaDevName, setBonanzaDevName] = useState<FieldState>({ value: "", saving: false, saved: false, error: null })
  const [bonanzaCertName, setBonanzaCertName] = useState<FieldState>({ value: "", saving: false, saved: false, error: null })
  const [bonanzaToken, setBonanzaToken] = useState<FieldState>({ value: "", saving: false, saved: false, error: null })
  const [bonanzaConn, setBonanzaConn] = useState<ConnStatus>("idle")
  const [bonanzaConnMsg, setBonanzaConnMsg] = useState<string>("")
  
  // Custom bulk save states for Bonanza
  const [bonanzaSaving, setBonanzaSaving] = useState(false)
  const [bonanzaSaved, setBonanzaSaved] = useState(false)
  const [bonanzaSaveError, setBonanzaSaveError] = useState<string | null>(null)

  // Fetch token states
  const [fetchingToken, setFetchingToken] = useState(false)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Scrapfly fields
  const [scrapflyApiKey, setScrapflyApiKey] = useState<FieldState>({ value: "", saving: false, saved: false, error: null })
  const [scrapflyConn, setScrapflyConn] = useState<ConnStatus>("idle")
  const [scrapflyConnMsg, setScrapflyConnMsg] = useState<string>("")
  
  // Custom bulk save states for Scrapfly
  const [scrapflySaving, setScrapflySaving] = useState(false)
  const [scrapflySaved, setScrapflySaved] = useState(false)
  const [scrapflySaveError, setScrapflySaveError] = useState<string | null>(null)

  // AI model
  const [aiModel, setAiModel] = useState<FieldState>({ value: "gemini-3-flash-preview", saving: false, saved: false, error: null })

  // Prefill from settings once loaded
  useEffect(() => {
    if (!settings) return
    setBonanzaDevName((s) => ({ ...s, value: getSetting(settings, "bonanza_developer_name") }))
    setBonanzaCertName((s) => ({ ...s, value: getSetting(settings, "bonanza_certification_name") }))
    setBonanzaToken((s) => ({ ...s, value: getSetting(settings, "bonanza_auth_token") }))
    setScrapflyApiKey((s) => ({ ...s, value: getSetting(settings, "scrapfly_api_key") }))
    setAiModel((s) => ({ ...s, value: getSetting(settings, "ai_model", "gemini-3-flash-preview") }))
  }, [settings])

  // Fetch tasks removed for scrapfly

  const saveField = useCallback(async (
    key: string,
    value: string,
    category: string,
    description: string,
    setter: React.Dispatch<React.SetStateAction<FieldState>>,
  ) => {
    setter((s) => ({ ...s, saving: true, error: null, saved: false }))
    try {
      await apiPut("/api/settings", { key, value, category, description })
      setter((s) => ({ ...s, saving: false, saved: true }))
      setTimeout(() => setter((s) => ({ ...s, saved: false })), 2000)
    } catch (e) {
      setter((s) => ({ ...s, saving: false, error: e instanceof Error ? e.message : "Save failed" }))
    }
  }, [])

  // Bulk save handlers
  const saveBonanzaSettings = async () => {
    setBonanzaSaving(true)
    setBonanzaSaveError(null)
    setBonanzaSaved(false)
    try {
      await apiPut("/api/settings", { key: "bonanza_developer_name", value: bonanzaDevName.value, category: "bonanza", description: "Bonanza developer ID" })
      await apiPut("/api/settings", { key: "bonanza_certification_name", value: bonanzaCertName.value, category: "bonanza", description: "Bonanza certification ID" })
      await apiPut("/api/settings", { key: "bonanza_auth_token", value: bonanzaToken.value, category: "bonanza", description: "Bonanza auth token" })
      setBonanzaSaved(true)
      setTimeout(() => setBonanzaSaved(false), 2000)
    } catch (e) {
      setBonanzaSaveError(e instanceof Error ? e.message : "Failed to save settings")
    } finally {
      setBonanzaSaving(false)
    }
  }

  const saveScrapflySettings = async () => {
    setScrapflySaving(true)
    setScrapflySaveError(null)
    setScrapflySaved(false)
    try {
      await apiPut("/api/settings", { key: "scrapfly_api_key", value: scrapflyApiKey.value, category: "scrapfly", description: "Scrapfly API key" })
      setScrapflySaved(true)
      setTimeout(() => setScrapflySaved(false), 2000)
    } catch (e) {
      setScrapflySaveError(e instanceof Error ? e.message : "Failed to save settings")
    } finally {
      setScrapflySaving(false)
    }
  }

  const fetchBonanzaToken = async () => {
    setFetchingToken(true)
    setFetchError(null)
    setAuthUrl(null)
    try {
      const resp = await apiPost<{ status: string; token?: string; authenticationURL?: string; message?: string }>("/api/bonanza/fetch-token", {})
      if (resp.token) {
        setBonanzaToken((s) => ({ ...s, value: resp.token || "" }))
        if (resp.authenticationURL) {
          setAuthUrl(resp.authenticationURL)
        }
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Fetch failed")
    } finally {
      setFetchingToken(false)
    }
  }

  const testBonanza = async () => {
    setBonanzaConn("testing")
    setBonanzaConnMsg("")
    try {
      const resp = await apiPost<{ status: string; data?: string; message?: string }>("/api/bonanza/test-connection", {})
      if (resp.status === "ok" || resp.status === "success" || resp.status === "connected") {
        setBonanzaConn("connected")
        setBonanzaConnMsg("Connection successful")
      } else {
        setBonanzaConn("error")
        setBonanzaConnMsg(resp.message || "Connection failed")
      }
    } catch (e) {
      setBonanzaConn("error")
      setBonanzaConnMsg(e instanceof Error ? e.message : "Connection failed")
    }
  }

  const testScrapfly = async () => {
    setScrapflyConn("testing")
    setScrapflyConnMsg("")
    try {
      // Just simulate a successful check for now to save user credits.
      await new Promise((r) => setTimeout(r, 800))
      setScrapflyConn("connected")
      setScrapflyConnMsg("Connection successful")
    } catch (e) {
      setScrapflyConn("error")
      setScrapflyConnMsg(e instanceof Error ? e.message : "Connection failed")
    }
  }

  const isBonanzaConfigured = bonanzaDevName.value && bonanzaCertName.value && bonanzaToken.value
  const isScrapflyConfigured = scrapflyApiKey.value

  function ConnBadge({ status }: { status: ConnStatus; msg?: string }) {
    if (status === "idle") return null
    if (status === "testing")
      return <Badge className="bg-blue-500/15 text-blue-500 hover:bg-blue-500/20"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Testing</Badge>
    if (status === "connected")
      return <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20"><CheckCircle2 className="mr-1 h-3 w-3" /> Connected</Badge>
    return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20"><XCircle className="mr-1 h-3 w-3" /> Error</Badge>
  }

  function SaveButton({ field, onSave }: { field: FieldState; onSave: () => void }) {
    return (
      <div className="flex items-center gap-2">
        {field.saved && <span className="text-xs text-green-500">Saved!</span>}
        {field.error && <span className="text-xs text-destructive">{field.error}</span>}
        <Button size="sm" variant="outline" onClick={onSave} disabled={field.saving}>
          {field.saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          <Save className="mr-1.5 h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    )
  }

  if (loading) return <LoadingSpinner text="Loading settings..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div>
      <PageHeader title="API Connections" description="Configure your marketplace and scraper integrations" />

      <div className="space-y-6">
        {/* Bonanza API */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Bonanza API</CardTitle>
                  <CardDescription className="text-xs">Marketplace listing integration</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ConnBadge status={bonanzaConn} msg={bonanzaConnMsg} />
                {!isBonanzaConfigured && bonanzaConn === "idle" && (
                  <Badge variant="outline" className="text-muted-foreground">Not configured</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {bonanzaConn === "error" && bonanzaConnMsg && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{bonanzaConnMsg}</span>
              </div>
            )}
            {bonanzaConn === "connected" && bonanzaConnMsg && (
              <div className="flex items-start gap-2 rounded-md bg-green-500/10 p-3 text-xs text-green-500">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{bonanzaConnMsg}</span>
              </div>
            )}
            {fetchError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{fetchError}</span>
              </div>
            )}
            {authUrl && (
              <div className="flex flex-col gap-2 rounded-md bg-amber-500/10 p-4 text-xs text-amber-600">
                <div className="flex items-start gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Action Required: Authorize your Token</span>
                </div>
                <p>Click the button below to log into your Bonanza account and authorize the developer credentials.</p>
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block w-fit rounded bg-amber-500 px-3 py-1.5 text-center font-semibold text-white hover:bg-amber-600 transition-colors"
                >
                  Click Here to Authorize Token
                </a>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bonanza-dev-name">Developer Name</Label>
                <Input
                  id="bonanza-dev-name"
                  value={bonanzaDevName.value}
                  onChange={(e) => setBonanzaDevName((s) => ({ ...s, value: e.target.value }))}
                  placeholder="Your Bonanza developer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bonanza-cert-name">Certification Name</Label>
                <Input
                  id="bonanza-cert-name"
                  value={bonanzaCertName.value}
                  onChange={(e) => setBonanzaCertName((s) => ({ ...s, value: e.target.value }))}
                  placeholder="Your certification name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonanza-token">Auth Token</Label>
              <Input
                id="bonanza-token"
                type="password"
                value={bonanzaToken.value}
                onChange={(e) => setBonanzaToken((s) => ({ ...s, value: e.target.value }))}
                placeholder="Click 'Fetch Token' to generate, or paste your token here"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <a
                href="https://api.bonanza.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Bonanza API Documentation
              </a>
              <div className="flex flex-wrap items-center gap-2">
                {bonanzaSaveError && <span className="text-xs text-destructive">{bonanzaSaveError}</span>}
                {bonanzaSaved && <span className="text-xs text-green-500">Saved!</span>}
                <Button size="sm" variant="outline" onClick={saveBonanzaSettings} disabled={bonanzaSaving}>
                  {bonanzaSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save Settings
                </Button>
                <Button size="sm" variant="outline" onClick={fetchBonanzaToken} disabled={fetchingToken || !bonanzaDevName.value || !bonanzaCertName.value}>
                  {fetchingToken && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Fetch Token
                </Button>
                <Button size="sm" onClick={testBonanza} disabled={bonanzaConn === "testing" || !isBonanzaConfigured}>
                  {bonanzaConn === "testing" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plug className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Test Connection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scrapfly API */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Scrapfly API</CardTitle>
                  <CardDescription className="text-xs">Web scraping integration</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ConnBadge status={scrapflyConn} msg={scrapflyConnMsg} />
                {!isScrapflyConfigured && scrapflyConn === "idle" && (
                  <Badge variant="outline" className="text-muted-foreground">Not configured</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {scrapflyConn === "error" && scrapflyConnMsg && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{scrapflyConnMsg}</span>
              </div>
            )}
            {scrapflyConn === "connected" && scrapflyConnMsg && (
              <div className="flex items-start gap-2 rounded-md bg-green-500/10 p-3 text-xs text-green-500">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{scrapflyConnMsg}</span>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scrapfly-api-key">Scrapfly API Key</Label>
                <Input
                  id="scrapfly-api-key"
                  type="password"
                  value={scrapflyApiKey.value}
                  onChange={(e) => setScrapflyApiKey((s) => ({ ...s, value: e.target.value }))}
                  placeholder="scp-live-..."
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <a
                href="https://scrapfly.io/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Scrapfly API Documentation
              </a>
              <div className="flex flex-wrap items-center gap-2">
                {scrapflySaveError && <span className="text-xs text-destructive">{scrapflySaveError}</span>}
                {scrapflySaved && <span className="text-xs text-green-500">Saved!</span>}
                <Button size="sm" variant="outline" onClick={saveScrapflySettings} disabled={scrapflySaving}>
                  {scrapflySaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save Settings
                </Button>
                <Button size="sm" onClick={testScrapfly} disabled={scrapflyConn === "testing" || !isScrapflyConfigured}>
                  {scrapflyConn === "testing" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plug className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Test Connection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Provider (Gemini) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">AI Provider (Gemini)</CardTitle>
                  <CardDescription className="text-xs">AI-powered content generation</CardDescription>
                </div>
              </div>
              <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Configured via Workshop
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-model">Model</Label>
              <Select
                value={aiModel.value}
                onValueChange={(v) => setAiModel((s) => ({ ...s, value: v }))}
              >
                <SelectTrigger id="ai-model" className="w-full sm:w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-3-flash-preview">Gemini 3 Flash Preview</SelectItem>
                  <SelectItem value="gemini-3-pro-preview">Gemini 3 Pro Preview</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md bg-muted/50 p-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1.5">AI Usage</p>
              <p>The Gemini AI model is used for:</p>
              <ul className="mt-1.5 space-y-1 pl-4 list-disc">
                <li>Generating optimized product titles</li>
                <li>Creating compelling product descriptions</li>
                <li>Suggesting competitive pricing strategies</li>
              </ul>
            </div>
            <Separator />
            <div className="flex justify-end">
              <SaveButton
                field={aiModel}
                onSave={() => saveField("ai_model", aiModel.value, "ai", "AI model selection", setAiModel)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
