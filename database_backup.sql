PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE cashback_sites (
	id INTEGER NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	url TEXT, 
	default_rate FLOAT, 
	upfront_discount FLOAT, 
	supported_stores TEXT, 
	is_active BOOLEAN, 
	notes TEXT, 
	PRIMARY KEY (id)
);
INSERT INTO "cashback_sites" VALUES(1,'Rakuten','https://www.rakuten.com',3.0,0.0,'aliexpress,walmart,amazon,ebay',1,'Popular cashback portal with rotating categories');
INSERT INTO "cashback_sites" VALUES(2,'TopCashback','https://www.topcashback.com',4.0,0.0,'aliexpress,walmart,amazon,ebay',1,'Often has the highest rates');
INSERT INTO "cashback_sites" VALUES(3,'BeFrugal','https://www.befrugal.com',3.5,0.0,'aliexpress,walmart,amazon,ebay',1,'Guaranteed highest cashback');
INSERT INTO "cashback_sites" VALUES(4,'RetailMeNot','https://www.retailmenot.com',2.0,5.0,'walmart,amazon,ebay',1,'Coupon codes + cashback');
INSERT INTO "cashback_sites" VALUES(5,'Honey','https://www.joinhoney.com',1.5,0.0,'aliexpress,walmart,amazon,ebay',1,'Automatic coupon finder + cashback');
INSERT INTO "cashback_sites" VALUES(6,'Mr. Rebates','https://www.mrrebates.com',3.0,0.0,'aliexpress,walmart,amazon,ebay',1,'Straightforward cashback');
CREATE TABLE listings (
	id INTEGER NOT NULL, 
	opportunity_id INTEGER, 
	bonanza_item_id VARCHAR(100), 
	title TEXT NOT NULL, 
	description TEXT, 
	price FLOAT, 
	quantity INTEGER, 
	category VARCHAR(200), 
	shipping_cost FLOAT, 
	image_urls TEXT, 
	external_url TEXT, 
	brand VARCHAR(200), 
	upc VARCHAR(200), 
	mpn VARCHAR(200), 
	identifier_exists BOOLEAN, 
	google_product_category VARCHAR(500), 
	condition VARCHAR(50), 
	status VARCHAR(30), 
	bonanza_response TEXT, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(opportunity_id) REFERENCES opportunities (id)
);
INSERT INTO "listings" VALUES(1,1,NULL,'Premium Carbon Fiber Electric Surfboard - High Speed Jetboard','',5340.38,10,'Sporting Goods > Water Sports > Surfboards',150.0,'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600','https://www.aliexpress.com/item/100500123456789.html','brand not available','brand not available','',0,'','new','failed','Server error ''500 Internal Server Error'' for url ''https://api.bonanza.com/api_requests/secure_request?addFixedPriceItem''
For more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500','2026-06-28 01:55:40.629349','2026-06-28 01:55:41.440198');
INSERT INTO "listings" VALUES(2,2,NULL,'Hydrofoil Electric Surfboard (Efoil) with Remote Control','',6854.4,8,'Sporting Goods > Water Sports > Surfboards',200.0,'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600','https://www.aliexpress.com/item/100500987654321.html','brand not available','brand not available','',0,'','new','failed','Server error ''500 Internal Server Error'' for url ''https://api.bonanza.com/api_requests/secure_request?addFixedPriceItem''
For more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500','2026-06-28 01:55:53.468531','2026-06-28 01:55:53.629979');
CREATE TABLE opportunities (
	id INTEGER NOT NULL, 
	scan_profile_id INTEGER, 
	source VARCHAR(50) NOT NULL, 
	source_url TEXT, 
	source_product_id VARCHAR(200), 
	title TEXT NOT NULL, 
	description TEXT, 
	image_urls TEXT, 
	category VARCHAR(200), 
	source_price FLOAT, 
	shipping_cost FLOAT, 
	target_price FLOAT, 
	monthly_sales INTEGER, 
	rating FLOAT, 
	review_count INTEGER, 
	stock INTEGER, 
	seller_name VARCHAR(300), 
	seller_rating FLOAT, 
	seller_years FLOAT, 
	margin_pct FLOAT, 
	cashback_rate FLOAT, 
	cashback_amount FLOAT, 
	final_profit FLOAT, 
	final_margin_pct FLOAT, 
	best_cashback_site VARCHAR(200), 
	status VARCHAR(30), 
	ai_title TEXT, 
	ai_description TEXT, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(scan_profile_id) REFERENCES scan_profiles (id)
);
CREATE TABLE scan_logs (
	id INTEGER NOT NULL, 
	scan_profile_id INTEGER, 
	status VARCHAR(30), 
	products_found INTEGER, 
	opportunities_created INTEGER, 
	error_message TEXT, 
	started_at DATETIME, 
	completed_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(scan_profile_id) REFERENCES scan_profiles (id)
);
INSERT INTO "scan_logs" VALUES(1,1,'completed',2,2,'','2026-06-28 01:33:53.368441','2026-06-28 01:33:53.417883');
INSERT INTO "scan_logs" VALUES(2,1,'completed',2,2,'','2026-06-28 05:33:34.013745','2026-06-28 05:33:34.066378');
INSERT INTO "scan_logs" VALUES(3,1,'completed',2,2,'','2026-06-28 05:35:48.181105','2026-06-28 05:35:48.211627');
INSERT INTO "scan_logs" VALUES(4,1,'completed',2,2,'','2026-06-28 05:36:11.630980','2026-06-28 05:36:11.656050');
INSERT INTO "scan_logs" VALUES(5,1,'completed',2,2,'','2026-06-28 05:38:31.507218','2026-06-28 05:38:31.574106');
INSERT INTO "scan_logs" VALUES(6,1,'failed',0,0,'HTTPSConnectionPool(host=''api.scrapfly.io'', port=443): Max retries exceeded with url: /scrape?key=scp-live-19458fc009e04877be685a3f5b8ff8ca&url=https%3A%2F%2Fwww.aliexpress.com%2Fw%2Fwholesale-surfboard.html&country=US&headers%5Bcookie%5D=aep_usuc_f%3Dsite%3Dglo%26province%3D%26city%3D%26c_tp%3DUSD%26region%3DUS%26b_locale%3Den_US%26ae_u_p_s%3D2&asp=true (Caused by SSLError(SSLCertVerificationError(1, ''[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1081)'')))','2026-06-28 21:12:20.007730','2026-06-28 21:12:37.503925');
CREATE TABLE scan_profiles (
	id INTEGER NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	source VARCHAR(50) NOT NULL, 
	categories TEXT, 
	min_price FLOAT, 
	max_price FLOAT, 
	min_monthly_sales INTEGER, 
	min_rating FLOAT, 
	min_orders INTEGER, 
	min_stock INTEGER, 
	detect_out_of_stock BOOLEAN, 
	min_margin_pct FLOAT, 
	bonanza_fee_pct FLOAT, 
	ship_to_country VARCHAR(10), 
	max_delivery_days INTEGER, 
	keywords TEXT, 
	is_active BOOLEAN, 
	created_at DATETIME, 
	last_scan_at DATETIME, 
	PRIMARY KEY (id)
);
INSERT INTO "scan_profiles" VALUES(1,'Default AliExpress Profile','aliexpress','Sporting Goods, Home & Garden',10.0,10000.0,1,4.0,1,1,1,30.0,20.0,'US',30,'surfboard, jetboat, lawn mower',1,'2026-06-28 01:13:31.586953','2026-06-28 05:38:31.574033');
CREATE TABLE settings (
	id INTEGER NOT NULL, 
	"key" VARCHAR(100) NOT NULL, 
	value TEXT, 
	category VARCHAR(50), 
	description TEXT, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE ("key")
);
INSERT INTO "settings" VALUES(1,'octoparse_aliexpress_task_id','','integration','Octoparse task ID for AliExpress scraping','2026-06-27 08:27:34.403763');
INSERT INTO "settings" VALUES(2,'bonanza_dev_name','','integration','Bonanza API developer name','2026-06-27 08:27:34.403904');
INSERT INTO "settings" VALUES(3,'bonanza_cert_name','','integration','Bonanza API certification name','2026-06-27 08:27:34.403912');
INSERT INTO "settings" VALUES(4,'bonanza_auth_token','yndgHLLvUC','bonanza','Bonanza auth token','2026-06-28 01:22:52.442326');
INSERT INTO "settings" VALUES(5,'default_bonanza_fee','20','general','Default Bonanza Google Products fee percentage','2026-06-27 08:27:34.403925');
INSERT INTO "settings" VALUES(6,'default_min_margin','30','pricing','Default minimum margin %','2026-06-28 05:19:31.966500');
INSERT INTO "settings" VALUES(7,'octoparse_api_key','op_sk_788dda5ae51b4fa5aa51c655483382c5','octoparse','Octoparse API key','2026-06-28 00:54:22.917152');
INSERT INTO "settings" VALUES(8,'octoparse_task_id','','octoparse','Octoparse task ID','2026-06-28 00:54:23.273654');
INSERT INTO "settings" VALUES(9,'bonanza_developer_name','P6zZ0rSAw5RBTO9','bonanza','Bonanza developer ID','2026-06-28 00:51:47.199024');
INSERT INTO "settings" VALUES(10,'bonanza_certification_name','Bm6pFS4cuxv08kR','bonanza','Bonanza certification ID','2026-06-28 00:51:47.299220');
INSERT INTO "settings" VALUES(11,'bonanza_google_fee','20','pricing','Bonanza Google Products fee %','2026-06-28 05:19:32.338122');
INSERT INTO "settings" VALUES(12,'additional_cost_buffer','0','pricing','Additional cost buffer %','2026-06-28 05:19:32.595135');
INSERT INTO "settings" VALUES(13,'default_cashback_rate','0','pricing','Default cashback rate %','2026-06-28 05:19:32.672995');
INSERT INTO "settings" VALUES(14,'cashback_apply_to','source_cost','pricing','Apply cashback to','2026-06-28 05:19:32.938520');
INSERT INTO "settings" VALUES(15,'min_cashback_consider','1','pricing','Min cashback to consider %','2026-06-28 05:19:33.017644');
INSERT INTO "settings" VALUES(16,'price_rounding','none','pricing','Price rounding strategy','2026-06-28 05:19:33.279921');
INSERT INTO "settings" VALUES(17,'max_price_markup','300','pricing','Max price markup %','2026-06-28 05:19:33.358238');
INSERT INTO "settings" VALUES(18,'min_price_above_source','30','pricing','Min price above source %','2026-06-28 05:19:33.624383');
INSERT INTO "settings" VALUES(19,'bonanza_transaction_fee','20','pricing','Bonanza transaction fee %','2026-06-28 05:19:33.703122');
INSERT INTO "settings" VALUES(20,'payment_processing_fee','3','pricing','Payment processing fee %','2026-06-28 05:19:33.968171');
INSERT INTO "settings" VALUES(21,'fixed_fee_per_transaction','0','pricing','Fixed fee per transaction $','2026-06-28 05:19:34.046287');
INSERT INTO "settings" VALUES(22,'scrapfly_api_key','scp-live-19458fc009e04877be685a3f5b8ff8ca','scrapfly','Scrapfly API key','2026-06-28 20:41:55.710064');
COMMIT;
