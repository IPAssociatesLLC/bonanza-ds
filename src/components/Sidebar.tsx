import { cn } from "@/lib/utils"
import { Link } from "react-router-dom"
import {
  LayoutDashboard, ScanSearch, Radar, Target, Calculator,
  DollarSign, Package, Store, FileEdit, Rss, BarChart3, ScrollText,
  Plug, Percent, UserCog, Shield, Users, TrendingUp, ChevronDown, Bot
} from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"

interface NavGroup {
  label: string
  items: { label: string; path: string; icon: typeof LayoutDashboard }[]
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Sales Analytics", path: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Product Sourcing",
    items: [
      { label: "Product Scout", path: "/product-scout", icon: ScanSearch },
      { label: "Scan Results", path: "/scan-results", icon: ScrollText },
    ],
  },
  {
    label: "Profitability",
    items: [
      { label: "Opportunities", path: "/opportunities", icon: Target },
      { label: "Profit Calculator", path: "/profit-calculator", icon: Calculator },
      { label: "Cashback Optimizer", path: "/cashback", icon: DollarSign },
    ],
  },
  {
    label: "Inventory & Listings",
    items: [
      { label: "My Products", path: "/products", icon: Package },
      { label: "Bonanza Listings", path: "/listings", icon: Store },
      { label: "Listing Builder", path: "/listing-builder", icon: FileEdit },
      { label: "Google Shopping Feed", path: "/google-feed", icon: Rss },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Activity Logs", path: "/logs", icon: ScrollText },
      { label: "API Connections", path: "/settings/api", icon: Plug },
      { label: "Pricing Rules", path: "/settings/pricing", icon: Percent },
      { label: "Account", path: "/settings/account", icon: UserCog },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Admin Dashboard", path: "/admin", icon: Shield },
      { label: "AI Scout Swarm", path: "/admin/ai-scout", icon: Bot },
      { label: "Automations", path: "/admin/automations", icon: Radar },
      { label: "User Management", path: "/admin/users", icon: Users },
    ],
  },
]

export function Sidebar({ currentPath, isOpen, setIsOpen }: { currentPath: string, isOpen?: boolean, setIsOpen?: (o: boolean) => void }) {
  const { user } = useAuth()
  
  // Filter nav groups based on user role
  const visibleNavGroups = navGroups.filter(group => {
    if (group.label === "Administration" && user?.role !== "admin") return false;
    if (group.label === "System" && user?.role !== "admin") return false;
    return true;
  });

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && setIsOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card/95 backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <TrendingUp className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Bonanza DS</h1>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Drop Shipping Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {visibleNavGroups.map((group) => (
          <NavGroup 
            key={group.label} 
            group={group} 
            currentPath={currentPath} 
            onLinkClick={() => setIsOpen?.(false)} 
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-sm font-medium text-foreground">Pro Trial</p>
            </div>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">14d left</span>
          </div>
        </div>
      </div>
    </aside>
    </>
  )
}

function NavGroup({ group, currentPath, onLinkClick }: { group: NavGroup; currentPath: string; onLinkClick?: () => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const hasActive = group.items.some(
    (item) => currentPath === item.path || (item.path !== "/" && currentPath.startsWith(item.path))
  )

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {group.label}
        <ChevronDown className={cn("h-3 w-3 transition-transform", collapsed && "rotate-180")} />
      </button>
      {!collapsed && (
        <div className="mt-1 space-y-0.5">
          {group.items.map((item) => {
            const isActive =
              currentPath === item.path ||
              (item.path !== "/" && currentPath.startsWith(item.path))
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
                {hasActive && isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
