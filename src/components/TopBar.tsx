import { useState, useEffect } from "react"
import { Search, Bell, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/30 px-4 sm:px-6 backdrop-blur-xl">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search opportunities, listings..."
            className="pl-9 bg-muted/50 border-border"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden md:block text-sm text-muted-foreground tabular-nums">
          {time.toLocaleTimeString()}
        </span>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            K
          </div>
        </div>
      </div>
    </header>
  )
}
