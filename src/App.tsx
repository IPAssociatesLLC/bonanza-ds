import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "@/components/Layout"
import { DashboardPage } from "@/pages/DashboardPage"
import { AnalyticsPage } from "@/pages/AnalyticsPage"
import { ProductScoutPage } from "@/pages/ProductScoutPage"
import { AdminAutomationsPage } from "@/pages/AdminAutomationsPage"
import { ScanResultsPage } from "@/pages/ScanResultsPage"
import { OpportunitiesPage } from "@/pages/OpportunitiesPage"
import { ProfitCalculatorPage } from "@/pages/ProfitCalculatorPage"
import { CashbackPage } from "@/pages/CashbackPage"
import { ProductsPage } from "@/pages/ProductsPage"
import { ListingsPage } from "@/pages/ListingsPage"
import { ListingBuilderPage } from "@/pages/ListingBuilderPage"
import { GoogleFeedPage } from "@/pages/GoogleFeedPage"
import { LogsPage } from "@/pages/LogsPage"
import { ApiConnectionsPage } from "@/pages/ApiConnectionsPage"
import { PricingRulesPage } from "@/pages/PricingRulesPage"
import { AccountPage } from "@/pages/AccountPage"
import { AdminPage } from "@/pages/AdminPage"
import { AdminUsersPage } from "@/pages/AdminUsersPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/product-scout" element={<ProductScoutPage />} />
          <Route path="/admin/automations" element={<AdminAutomationsPage />} />
          <Route path="/scan-results" element={<ScanResultsPage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/profit-calculator" element={<ProfitCalculatorPage />} />
          <Route path="/cashback" element={<CashbackPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/listing-builder" element={<ListingBuilderPage />} />
          <Route path="/google-feed" element={<GoogleFeedPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/settings/api" element={<ApiConnectionsPage />} />
          <Route path="/settings/pricing" element={<PricingRulesPage />} />
          <Route path="/settings/account" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
