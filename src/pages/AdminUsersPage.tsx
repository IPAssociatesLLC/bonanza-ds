import { useState, useEffect } from "react"
import { PageHeader, StatCard } from "@/components/PageParts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  UserCheck,
  Crown,
  Clock,
  MoreVertical,
  UserX,
  ArrowUpCircle,
  UserPlus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

interface MockUser {
  id: number
  name: string
  email: string
  plan: "pro" | "trial" | "free"
  status: "active" | "suspended"
  scansToday: number
  listings: number
  joinedDate: string
}

function planBadge(plan: string) {
  switch (plan) {
    case "pro":
      return <Badge className="bg-primary/15 text-primary hover:bg-primary/20"><Crown className="mr-1 h-3 w-3" /> Pro</Badge>
    case "trial":
      return <Badge className="bg-orange-500/15 text-orange-500 hover:bg-orange-500/20"><Clock className="mr-1 h-3 w-3" /> Trial</Badge>
    default:
      return <Badge variant="outline">Free</Badge>
  }
}

function statusBadge(status: string) {
  if (status === "active")
    return <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/20">Active</Badge>
  return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20">Suspended</Badge>
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<MockUser[]>(() => {
    const saved = localStorage.getItem("bonanza_ds_users")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // fallback
      }
    }
    return [
      { id: 1, name: "Kelly Anderson", email: "kelly@bonanzads.com", plan: "pro", status: "active", scansToday: 12, listings: 38, joinedDate: "2026-06-15" }
    ]
  })

  const [inviteOpen, setInviteOpen] = useState(false)
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPlan, setNewUserPlan] = useState<"pro" | "trial" | "free">("trial")

  useEffect(() => {
    localStorage.setItem("bonanza_ds_users", JSON.stringify(users))
  }, [users])

  const handleAddUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim()) return
    const newUser: MockUser = {
      id: Date.now(),
      name: newUserName,
      email: newUserEmail,
      plan: newUserPlan,
      status: "active",
      scansToday: 0,
      listings: 0,
      joinedDate: new Date().toISOString().split("T")[0],
    }
    setUsers([...users, newUser])
    setNewUserName("")
    setNewUserEmail("")
    setNewUserPlan("trial")
    setInviteOpen(false)
  }

  const toggleSuspend = (id: number) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: u.status === "active" ? "suspended" : "active" } : u))
  }

  const changePlan = (id: number, plan: "pro" | "trial" | "free") => {
    setUsers(users.map(u => u.id === id ? { ...u, plan } : u))
  }

  const deleteUser = (id: number) => {
    setUsers(users.filter(u => u.id !== id))
  }

  const totalUsers = users.length
  const activeSubs = users.filter((u) => u.plan !== "free" && u.status === "active").length
  const proPlans = users.filter((u) => u.plan === "pro").length
  const trialUsers = users.filter((u) => u.plan === "trial").length

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage platform users and subscriptions"
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={totalUsers} icon={Users} color="primary" />
        <StatCard label="Active Subscriptions" value={activeSubs} icon={UserCheck} color="green" />
        <StatCard label="Pro Plans" value={proPlans} icon={Crown} color="blue" />
        <StatCard label="Trial Users" value={trialUsers} icon={Clock} color="orange" />
      </div>

      {/* User Table */}
      <Card className="mt-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Scans Today</TableHead>
                <TableHead className="text-right">Listings</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>{planBadge(user.plan)}</TableCell>
                  <TableCell>{statusBadge(user.status)}</TableCell>
                  <TableCell className="text-right tabular-nums">{user.scansToday}</TableCell>
                  <TableCell className="text-right tabular-nums">{user.listings}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(user.joinedDate).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleSuspend(user.id)}>
                          <UserX className="mr-2 h-4 w-4" />
                          {user.status === "active" ? "Suspend" : "Activate"}
                        </DropdownMenuItem>
                        {user.plan !== "pro" && (
                          <DropdownMenuItem onClick={() => changePlan(user.id, "pro")}>
                            <ArrowUpCircle className="mr-2 h-4 w-4" />
                            Upgrade to Pro
                          </DropdownMenuItem>
                        )}
                        {user.plan === "pro" && (
                          <DropdownMenuItem onClick={() => changePlan(user.id, "trial")}>
                            <ArrowUpCircle className="mr-2 h-4 w-4" />
                            Downgrade to Trial
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteUser(user.id)}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite/Add Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[425px] bg-background">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Create a new user account on the Bonanza DS platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="e.g. john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Subscription Plan</Label>
              <select
                id="plan"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newUserPlan}
                onChange={(e) => setNewUserPlan(e.target.value as any)}
              >
                <option value="pro">Pro Plan</option>
                <option value="trial">Trial Plan</option>
                <option value="free">Free Plan</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={!newUserName.trim() || !newUserEmail.trim()}>
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
