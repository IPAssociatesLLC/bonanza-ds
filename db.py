"""Database engine, session, and ORM models for Bonanza DS."""
import os
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean, Text,
    DateTime, ForeignKey, JSON, MetaData,
)
from sqlalchemy.orm import sessionmaker, declarative_base

# Neon DB (cloud) or local SQLite fallback
_db_url = (
    os.environ.get("DBC7673568_DATABASE_URL")
    or os.environ.get("DB0160F1E6_DATABASE_URL")
    or os.environ.get("DATABASE_URL")
    or "sqlite:///./bonanza_ds.db"
)

_connect_args = {}
_pool_kwargs: dict = {}
if _db_url.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}
else:
    _pool_kwargs = {"pool_pre_ping": True, "pool_size": 5, "max_overflow": 10}

engine = create_engine(_db_url, connect_args=_connect_args, **_pool_kwargs)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
_schema = None if _db_url.startswith("sqlite") else "bonanza_ds"
Base = declarative_base(metadata=MetaData(schema=_schema))


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

class ScanProfile(Base):
    __tablename__ = "scan_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
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
    scan_profile_id = Column(Integer, ForeignKey("scan_profiles.id"), nullable=True)

    # Source product data
    source = Column(String(50), nullable=False)
    source_url = Column(Text, default="")
    source_product_id = Column(String(200), default="")
    title = Column(Text, nullable=False)
    description = Column(Text, default="")
    image_urls = Column(Text, default="")           # pipe-separated
    category = Column(String(200), default="")

    # Pricing
    source_price = Column(Float, default=0.0)
    shipping_cost = Column(Float, default=0.0)
    target_price = Column(Float, default=0.0)       # Bonanza listing price

    # Metrics
    monthly_sales = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    stock = Column(Integer, default=0)
    seller_name = Column(String(300), default="")
    seller_rating = Column(Float, default=0.0)
    seller_years = Column(Float, default=0.0)

    # Profitability
    margin_pct = Column(Float, default=0.0)         # before cashback
    cashback_rate = Column(Float, default=0.0)
    cashback_amount = Column(Float, default=0.0)
    final_profit = Column(Float, default=0.0)       # after cashback
    final_margin_pct = Column(Float, default=0.0)

    # Cashback
    best_cashback_site = Column(String(200), default="")

    # Status
    status = Column(String(30), default="new")      # new, approved, imported, ignored
    ai_title = Column(Text, default="")
    ai_description = Column(Text, default="")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=True)

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
    scan_profile_id = Column(Integer, ForeignKey("scan_profiles.id"), nullable=True)
    status = Column(String(30), default="running")  # running, completed, failed
    products_found = Column(Integer, default=0)
    opportunities_created = Column(Integer, default=0)
    error_message = Column(Text, default="")
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
