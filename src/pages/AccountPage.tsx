import { useState } from "react"
import { useFetch } from "@/hooks/useFetch"
import { PageHeader } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  User,
  Settings,
  Shield,
  CreditCard,
  Mail,
  ScanLine,
  PackageCheck,
  Palette,
  Lock,
  Check,
  Loader2,
} from "lucide-react"

export function AccountPage() {
  const { data: usage } = useFetch<{ scans_run: number; listings_created: number; ai_generations: number }>("/api/account/usage")

  const [profile, setProfile] = useState({
    name: "Kelly Anderson",
    email: "kelly@bonanzads.com",
    company: "Bonanza DS",
  })
  const [prefs, setPrefs] = useState({
    sourceMarketplace: "aliexpress",
    shipToCountry: "US",
    emailNotifications: true,
    scanNotifications: true,
    importConfirmations: false,
    theme: "dark",
  })
  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)

  const handleSaveProfile = () => {
    setSavingProfile(true)
    setTimeout(() => {
      setSavingProfile(false)
      setSavedProfile(true)
      setTimeout(() => setSavedProfile(false), 2000)
    }, 800)
  }

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div>
      <PageHeader title="Account Settings" description="Manage your profile and preferences" />

      <div className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Profile</CardTitle>
                <CardDescription className="text-xs">Your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{profile.name}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
                <Button variant="outline" size="sm" className="mt-2" disabled>
                  Change Avatar
                </Button>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-company">Company</Label>
              <Input
                id="profile-company"
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              {savedProfile && (
                <span className="flex items-center gap-1.5 text-sm text-green-500">
                  <Check className="h-4 w-4" /> Profile saved
                </span>
              )}
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="ml-auto">
                {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Preferences</CardTitle>
                <CardDescription className="text-xs">Default settings and notifications</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Default Source Marketplace</Label>
                <Select
                  value={prefs.sourceMarketplace}
                  onValueChange={(v) => setPrefs({ ...prefs, sourceMarketplace: v })}
                >
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
              <div className="space-y-2">
                <Label>Default Ship-To Country</Label>
                <Select
                  value={prefs.shipToCountry}
                  onValueChange={(v) => setPrefs({ ...prefs, shipToCountry: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="cursor-pointer">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive general email updates</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.emailNotifications}
                  onCheckedChange={(v) => setPrefs({ ...prefs, emailNotifications: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ScanLine className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="cursor-pointer">Scan Notifications</Label>
                    <p className="text-xs text-muted-foreground">Get notified when scans complete</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.scanNotifications}
                  onCheckedChange={(v) => setPrefs({ ...prefs, scanNotifications: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PackageCheck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="cursor-pointer">Import Confirmations</Label>
                    <p className="text-xs text-muted-foreground">Confirm before importing products</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.importConfirmations}
                  onCheckedChange={(v) => setPrefs({ ...prefs, importConfirmations: v })}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <Label>Theme</Label>
              </div>
              <Select
                value={prefs.theme}
                onValueChange={(v) => setPrefs({ ...prefs, theme: v })}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Security</CardTitle>
                <CardDescription className="text-xs">Password and authentication</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="current-pw">Current Password</Label>
                <Input
                  id="current-pw"
                  type="password"
                  value={security.currentPassword}
                  onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pw">New Password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  value={security.newPassword}
                  onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pw">Confirm Password</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={security.confirmPassword}
                  onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button variant="outline" disabled>
              <Lock className="mr-2 h-4 w-4" />
              Update Password
            </Button>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
                <Switch disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Plan & Billing</CardTitle>
                <CardDescription className="text-xs">Your subscription and usage</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">Pro Trial</span>
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/20">14 days left</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Trial ends on July 10, 2026</p>
              </div>
              <Button>Upgrade</Button>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Included Features</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "Unlimited scan profiles",
                  "AI title & description generation",
                  "Automated Bonanza listings",
                  "Cashback optimization",
                  "Google Shopping feed export",
                  "Priority support",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Usage This Month</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Scans Run</p>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {usage?.scans_run ?? 0} <span className="text-sm font-normal text-muted-foreground">/ 500</span>
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Listings Created</p>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {usage?.listings_created ?? 0} <span className="text-sm font-normal text-muted-foreground">/ 200</span>
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">AI Generations</p>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {usage?.ai_generations ?? 0} <span className="text-sm font-normal text-muted-foreground">/ 1000</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
