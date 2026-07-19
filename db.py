"""Database engine, session, and ORM models for Bonanza DS."""
import os
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean, Text,
    DateTime, ForeignKey, JSON, MetaData,
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

# Cloud Postgres (Supabase) or local SQLite fallback
_db_url = (
    os.environ.get("DATABASE_URL")
    or "sqlite:///./bonanza_ds.db"
)

if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql://", 1)

_connect_args = {}
_pool_kwargs: dict = {}
if _db_url.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}
else:
    _pool_kwargs = {"pool_pre_ping": True, "pool_size": 5, "max_overflow": 10}

engine = create_engine(_db_url, connect_args=_connect_args, **_pool_kwargs)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base(metadata=MetaData())


def get_db():
    """FastAPI dependency — yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables (idempotent)."""
    Base.metadata.create_all(bind=engine)


# ─── Models ──────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="user") # 'admin' or 'user'
    api_credit_limit = Column(Integer, default=50)
    credits_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    scan_profiles = relationship("ScanProfile", back_populates="owner")
    opportunities = relationship("Opportunity", back_populates="owner")
    scan_logs = relationship("ScanLog", back_populates="owner")

class ScanProfile(Base):
    __tablename__ = "scan_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(200), nullable=False)
    
    owner = relationship("User", back_populates="scan_profiles")
    source = Column(String(50), nullable=False, default="aliexpress")  # aliexpress, walmart, amazon, ebay
    categories = Column(Text, default="")          # comma-separated
    min_price = Column(Float, default=0.0)
    max_price = Column(Float, default=100.0)
    min_monthly_sales = Column(Integer, default=50)
    min_rating = Column(Float, default=4.0)
    min_orders = Column(Integer, default=10)
    min_stock = Column(Integer, default=1)
    detect_out_of_stock = Column(Boolean, default=True)
    min_margin_pct = Column(Float, default=30.0)   # before cashback
    bonanza_fee_pct = Column(Float, default=20.0)  # Google Products fee
    ship_to_country = Column(String(10), default="US")
    max_delivery_days = Column(Integer, default=30)
    keywords = Column(Text, default="")             # comma-separated search keywords
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_scan_at = Column(DateTime, nullable=True)


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    scan_profile_id = Column(Integer, ForeignKey("scan_profiles.id"), nullable=True)
    origin = Column(String(50), default="manual_scout") # 'manual_scout' or 'automation_engine'
    
    owner = relationship("User", back_populates="opportunities")

    # Source product data
    source = Column(String(50), nullable=False)
    source_url = Column(Text, default="")
    source_product_id = Column(String(200), default="")
    title = Column(Text, nullable=False)
    description = Column(Text, default="")
    image_urls = Column(Text, default="")           # pipe-separated
    category = Column(String(200), default="")
    brand = Column(String(200), default="Unbranded")
    upc = Column(String(200), default="brand not available")

    # Pricing
    source_price = Column(Float, default=0.0)
    shipping_cost = Column(Float, default=0.0)
    target_price = Column(Float, default=0.0)       # Bonanza listing price
    google_high_price = Column(Float, default=0.0)
    google_low_price = Column(Float, default=0.0)
    google_avg_price = Column(Float, default=0.0)
    discount_pct = Column(Float, default=0.0)
    deal_duration_days = Column(Integer, default=1)
    discount_info = Column(Text, default="")

    # Metrics
    monthly_sales = Column(Integer, default=0)
    monthly_search_volume = Column(Integer, default=0) # Google search vol
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    stock = Column(Integer, default=0)
    seller_count = Column(Integer, default=1)       # Google Shopping competitors
    seller_name = Column(String(300), default="")
    seller_rating = Column(Float, default=0.0)
    seller_years = Column(Float, default=0.0)

    # Profitability
    margin_pct = Column(Float, default=0.0)         # before cashback
    cashback_rate = Column(Float, default=0.0)
    cashback_amount = Column(Float, default=0.0)
    final_profit = Column(Float, default=0.0)       # Net Profit Dollar
    final_margin_pct = Column(Float, default=0.0)   # Net Profit Margin (True Margin)
    actual_markup_pct = Column(Float, default=0.0)
    est_monthly_sales = Column(Float, default=0.0)
    est_sales_for_window = Column(Float, default=0.0)
    est_income = Column(Float, default=0.0)

    # Cashback
    best_cashback_site = Column(String(200), default="")

    # Status
    status = Column(String(30), default="new")      # new, approved, imported, ignored
    ai_title = Column(Text, default="")
    ai_description = Column(Text, default="")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class ScanResult(Base):
    """Products received from the webhook scraper — shown on the Scan Results page."""
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String(50), default="walmart")          # walmart, aliexpress, etc.
    source_product_id = Column(String(200), default="")
    source_url = Column(Text, default="")
    title = Column(Text, nullable=False)
    image_urls = Column(Text, default="")
    category = Column(String(200), default="General")
    brand = Column(String(200), default="Unbranded")
    source_price = Column(Float, default=0.0)
    shipping_cost = Column(Float, default=0.0)
    target_price = Column(Float, default=0.0)
    margin_pct = Column(Float, default=0.0)
    final_profit = Column(Float, default=0.0)
    cashback_rate = Column(Float, default=0.0)
    cashback_amount = Column(Float, default=0.0)
    best_cashback_site = Column(String(200), default="")
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    stock = Column(Integer, default=10)
    status = Column(String(30), default="new")              # new, approved, ignored, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class WalmartProduct(Base):
    """Walmart products received from the scraper webhook — shown on Scan Results page."""
    __tablename__ = "walmart_products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(Text, nullable=False)
    source_price = Column(Float, default=0.0)
    target_price = Column(Float, default=0.0)
    source_url = Column(Text, default="")
    source_product_id = Column(String(200), default="")
    image_urls = Column(Text, default="")
    category = Column(String(200), default="General")
    brand = Column(String(200), default="Unbranded")
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    stock = Column(Integer, default=10)
    margin_pct = Column(Float, default=0.0)
    final_profit = Column(Float, default=0.0)
    cashback_rate = Column(Float, default=0.0)
    cashback_amount = Column(Float, default=0.0)
    best_cashback_site = Column(String(200), default="")
    status = Column(String(30), default="new")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=True)
    opportunity = relationship("Opportunity")

    bonanza_item_id = Column(String(100), nullable=True)
    title = Column(Text, nullable=False)
    description = Column(Text, default="")
    price = Column(Float, default=0.0)
    quantity = Column(Integer, default=1)
    category = Column(String(200), default="")
    shipping_cost = Column(Float, default=0.0)
    image_urls = Column(Text, default="")
    external_url = Column(Text, default="")

    # Google Shopping compliance
    brand = Column(String(200), default="brand not available")
    upc = Column(String(200), default="brand not available")
    mpn = Column(String(200), default="")
    identifier_exists = Column(Boolean, default=False)
    google_product_category = Column(String(500), default="")
    condition = Column(String(50), default="new")

    status = Column(String(30), default="pending")  # pending, listed, failed, updated
    bonanza_response = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=True)
    
    bonanza_order_id = Column(String(100), nullable=False, unique=True)
    customer_name = Column(String(200), default="")
    shipping_address = Column(Text, default="")
    status = Column(String(50), default="new") # new, ordered_from_source, shipped, delivered, cancelled
    
    sale_price = Column(Float, default=0.0)
    source_buy_price = Column(Float, default=0.0)
    net_profit = Column(Float, default=0.0)
    
    source_order_id = Column(String(100), default="") # Order ID from AliExpress/Source
    tracking_number = Column(String(100), default="")
    carrier = Column(String(50), default="")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class CashbackSite(Base):
    __tablename__ = "cashback_sites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    url = Column(Text, default="")
    default_rate = Column(Float, default=0.0)       # percentage
    upfront_discount = Column(Float, default=0.0)   # percentage
    supported_stores = Column(Text, default="")      # comma-separated (aliexpress, walmart, etc.)
    is_active = Column(Boolean, default=True)
    notes = Column(Text, default="")


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, default="")
    category = Column(String(50), default="general")
    description = Column(Text, default="")
    updated_at = Column(DateTime, default=datetime.utcnow)


class ScanLog(Base):
    __tablename__ = "scan_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    scan_profile_id = Column(Integer, ForeignKey("scan_profiles.id"), nullable=True)
    
    owner = relationship("User", back_populates="scan_logs")
    
    status = Column(String(30), default="running")  # running, completed, failed
    products_found = Column(Integer, default=0)
    opportunities_created = Column(Integer, default=0)
    error_message = Column(Text, default="")
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

from sqlalchemy import text

# ---- Auto Migration Hack for Vercel/Production ----
try:
    with engine.connect() as conn:
        try:
            # SQLite does not support IF NOT EXISTS for columns, but PostgreSQL does.
            # We will use a safe approach by committing after each try to avoid broken transactions.
            conn.execute(text("ALTER TABLE opportunities ADD COLUMN google_high_price FLOAT DEFAULT 0.0"))
            conn.commit()
        except Exception:
            conn.rollback()
        try:
            conn.execute(text("ALTER TABLE opportunities ADD COLUMN google_low_price FLOAT DEFAULT 0.0"))
            conn.commit()
        except Exception:
            conn.rollback()
        try:
            conn.execute(text("ALTER TABLE opportunities ADD COLUMN discount_info TEXT DEFAULT ''"))
            conn.commit()
        except Exception:
            conn.rollback()

        # Multi-Tenant migrations
        try:
            conn.execute(text("ALTER TABLE scan_profiles ADD COLUMN user_id INTEGER"))
            conn.commit()
        except Exception:
            conn.rollback()
        
        try:
            conn.execute(text("ALTER TABLE opportunities ADD COLUMN user_id INTEGER"))
            conn.commit()
        except Exception:
            conn.rollback()
            
        try:
            conn.execute(text("ALTER TABLE scan_logs ADD COLUMN user_id INTEGER"))
            conn.commit()
        except Exception:
            conn.rollback()
            
        # Migrate users table (Drop and recreate to transition username to email)
        try:
            # Check if email column exists, if not, drop table to recreate it
            result = conn.execute(text("SELECT email FROM users LIMIT 1"))
        except Exception:
            conn.rollback()
            try:
                conn.execute(text("DROP TABLE users CASCADE"))
                conn.commit()
            except Exception:
                conn.rollback()
                try:
                    conn.execute(text("DROP TABLE users"))
                    conn.commit()
                except Exception:
                    pass
except Exception as e:
    print(f"Migration error ignored: {e}")
