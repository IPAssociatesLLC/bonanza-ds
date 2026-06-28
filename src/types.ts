export type ApiStatus = "checking" | "connected" | "error";

export interface HealthResponse {
  ok: boolean;
}

// ─── Scan Profile ────────────────────────────────────────────────────────────

export interface ScanProfile {
  id: number;
  name: string;
  source: string;
  categories: string;
  min_price: number;
  max_price: number;
  min_monthly_sales: number;
  min_rating: number;
  min_orders: number;
  min_stock: number;
  detect_out_of_stock: boolean;
  min_margin_pct: number;
  bonanza_fee_pct: number;
  ship_to_country: string;
  max_delivery_days: number;
  keywords: string;
  is_active: boolean;
  created_at: string | null;
  last_scan_at: string | null;
}

// ─── Opportunity ──────────────────────────────────────────────────────────────

export interface Opportunity {
  id: number;
  scan_profile_id: number | null;
  source: string;
  source_url: string;
  source_product_id: string;
  title: string;
  description: string;
  image_urls: string[];
  category: string;
  source_price: number;
  shipping_cost: number;
  target_price: number;
  monthly_sales: number;
  rating: number;
  review_count: number;
  stock: number;
  seller_name: string;
  seller_rating: number;
  seller_years: number;
  margin_pct: number;
  cashback_rate: number;
  cashback_amount: number;
  final_profit: number;
  final_margin_pct: number;
  best_cashback_site: string;
  status: string;
  ai_title: string;
  ai_description: string;
  created_at: string | null;
  updated_at: string | null;
  vendor_analysis?: VendorAnalysis;
}

export interface VendorAnalysis {
  risk_level: string;
  summary: string;
  recommendation: string;
}

// ─── Listing ──────────────────────────────────────────────────────────────────

export interface Listing {
  id: number;
  opportunity_id: number | null;
  bonanza_item_id: string | null;
  title: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  shipping_cost: number;
  image_urls: string[];
  external_url: string;
  brand: string;
  upc: string;
  mpn: string;
  identifier_exists: boolean;
  google_product_category: string;
  condition: string;
  status: string;
  bonanza_response: string;
  created_at: string | null;
  updated_at: string | null;
}

// ─── Cashback ─────────────────────────────────────────────────────────────────

export interface CashbackSite {
  id: number;
  name: string;
  url: string;
  default_rate: number;
  upfront_discount: number;
  supported_stores: string;
  is_active: boolean;
  notes: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_opportunities: number;
  opportunities_today: number;
  avg_margin: number;
  total_listed: number;
  active_profiles: number;
  top_categories: { category: string; count: number }[];
  margin_distribution: Record<string, number>;
  recent_imports: Listing[];
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  [key: string]: {
    value: string;
    category: string;
    description: string;
  };
}

// ─── Scan Log ─────────────────────────────────────────────────────────────────

export interface ScanLog {
  id: number;
  scan_profile_id: number | null;
  status: string;
  products_found: number;
  opportunities_created: number;
  error_message: string;
  started_at: string | null;
  completed_at: string | null;
}

// ─── Admin Stats ──────────────────────────────────────────────────────────────

export interface AdminStats {
  total_scan_profiles: number;
  total_opportunities: number;
  total_listings: number;
  total_scans: number;
  successful_scans: number;
  scan_success_rate: number;
  recent_scans: ScanLog[];
  listings_by_status: Record<string, number>;
  opportunities_by_status: Record<string, number>;
}
