export type UserRole = 'admin' | 'requester' | 'procurement_officer';
export type Language = 'az' | 'en' | 'ru';
export type Theme = 'light' | 'dark';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  warehouseId?: string;
  avatar?: string;
  createdAt: string;
}

export type UserStatus = 'active' | 'inactive' | 'banned';

/** Backend (Laravel /api/v1/auth) qaytaran istifadəçi forması. */
export interface AuthUser {
  uid: string;
  name: string;
  username: string;
  status: UserStatus;
  is_super_admin: boolean;
  language: Language;
}

/** Role / icazə sistemi tipləri. */
export interface Operation {
  code: string;
  description: Translatable;
  module: string;
  is_stock?: boolean;
}

export interface Role {
  code: string;
  name: string;
}

export interface RoleAccessRow {
  operation_code: string;
  access: boolean;
}

/** Admin users modulunda idarə olunan istifadəçi. */
export interface ManagedUser {
  uid: string;
  name: string;
  username: string;
  status: UserStatus;
  is_super_admin: boolean;
  created_at: string | null;
  roles: Role[];
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

/** Öyrənmə modulu (Anki flashcards). */
export interface Deck {
  uid: string;
  name: string;
  description: string | null;
  template_uid: string | null;
  cards_total: number;
  due_count: number;
  new_count: number;
}
export type CardState = 'new' | 'learning' | 'review';
export interface Card {
  uid: string;
  front: string | null;
  back: string | null;
  front_image: string | null;
  back_image: string | null;
  fields: Record<string, string> | null;
  state: CardState;
  due: string | null;
  interval: number;
  reps: number;
}
export type Rating = 'again' | 'hard' | 'good' | 'easy';
export interface StudyCard {
  uid: string;
  front: string | null;
  back: string | null;
  front_image: string | null;
  back_image: string | null;
  fields: Record<string, string> | null;
  state: CardState;
  preview: Record<Rating, number>;
}

// Kart şablonu (formul) — deck səviyyəsində
export type FieldType = 'text' | 'textarea' | 'rich' | 'image' | 'heading';
export type FieldSide = 'front' | 'back';
export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';
export type FieldAlign = 'left' | 'center' | 'right';
export interface TemplateField {
  key: string;
  label: string;
  description: string | null;
  type: FieldType;
  side: FieldSide;
  section: string | null;
  list?: boolean; // kart siyahısında göstərilsin
  tgFront?: boolean; // Telegram bot ön mesajında göstər (qalanı "Göstər" ilə)
  // Kətan layout (grid vahidləri) — opsional (köhnə şablonlar üçün)
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  // Yalnız type='heading' üçün: statik başlıq (kart datası deyil, AI-a getmir)
  level?: HeadingLevel;
  color?: string | null;
  align?: FieldAlign;
}
export interface CardTemplate {
  uid: string;
  name: string;
  description: string | null;
  ai_instruction: string | null;
  fields: TemplateField[];
}

/** Maşın modulu. Bütün məsafə dəyərləri KM (kanonik); unit göstəriş/giriş vahididir. */
export type VehicleUnit = 'km' | 'mi';
export type ServiceStatus = 'ok' | 'soon' | 'overdue';

export interface VehicleReadingRow {
  uid: string;
  reading_date: string;
  km: number | string;
}
export interface VehicleServiceRow {
  uid: string;
  item_code: string | null;
  item_name: Translatable | null;
  category_name: Translatable | null;
  can_undo: boolean;
  closed_at: string | null;
  installed_date: string;
  installed_km: number;
  life_km: number | null;
  life_months: number | null;
  note: string | null;
  active: boolean;
  used_pct: number;
  remaining_km: number | null;
  days_to_due_km: number | null;
  remaining_days_time: number | null;
  days_left: number | null;
  status: ServiceStatus;
}
export interface Vehicle {
  uid: string;
  name: string;
  plate: string | null;
  unit: VehicleUnit;
  avg_km_per_day: string | null;
  note: string | null;
  current_km: number | null;
  projected_km: number | null;
  pace: number | null;
  readings_count: number;
  last_reading_date: string | null;
  worst_status: ServiceStatus;
  cost_month?: number;
  cost_year?: number;
  avg_consumption?: number | null;
  readings?: VehicleReadingRow[];
  services?: VehicleServiceRow[];
}

export interface VehicleExpenseRow {
  uid: string;
  date: string;
  title: string;
  amount: string | number;
  note: string | null;
}
export interface VehicleFuelRow {
  uid: string;
  date: string;
  odometer_km: string | number;
  liters: string | number;
  amount: string | number | null;
  note: string | null;
  consumption: number | null;
}

/** Trading satış formulası — pilləli (from<=x<to, x=manat). */
export interface FormulaTier {
  from: number | null;
  to: number | null;
  expr: string;
}
export interface TradingFormula {
  uid: string;
  name: string;
  tiers: FormulaTier[];
  is_active: boolean;
  created_at: string | null;
}

export type TradingEntryType = 'buy' | 'sell';
export type TradingJournalStatus = 'draft' | 'posted';

export interface TradingJournalEntry {
  uid: string;
  journal_code?: string;
  entry_type: TradingEntryType;
  manat_amount: string;
  usd_qty: string;
  descr: string | null;
}

export interface TradingJournal {
  code: string;
  cash_desk_code: string | null;
  cash_desk_name: Translatable | null;
  descr: string | null;
  posting_date: string | null;
  status: TradingJournalStatus;
  posted_at: string | null;
  resp_person: string | null;
  entries_count: number;
  buy_manat: number;
  sell_manat: number;
  usd_bought: number;
  usd_sold: number;
  net_cash: number;
  cogs: number;
  profit: number;
  entries?: TradingJournalEntry[];
}

/** Data-tərcümə dili (app.languages reyestri). */
export interface ContentLanguage {
  code: string;
  name: string;
  is_default: boolean;
}

/** Çoxdilli mətn sahəsi: { az: "...", en: "...", ... } */
export type Translatable = Record<string, string>;

/** Ölçü vahidi (app.measurements). */
export interface Measurement {
  code: string;
  name: Translatable;
  in_use: boolean;
}

export type CategoryStatus = 'ACTIVE' | 'BLOCKED';

/** Yarımfabrikat (app.semi_finished). code avtomatik (SF_0001). */
export interface SemiFinished {
  code: string;
  name: Translatable;
  is_sellable: boolean;
  keep_stock: boolean;
  sale_price: string | null;
  base_measure_code: string;
  image: string | null;
  status: CategoryStatus;
  in_use: boolean;
}

/** Resept sətri (app.semi_finished_components). */
export interface SemiComponent {
  uid: string;
  parent_code: string;
  component_type: 'ITEM' | 'SEMI' | 'CATEGORY';
  component_code: string;
  quantity: string;
  measure_code: string;
}

/** Anbar (app.stocks). code avtomatik (ST_0001). */
export interface Stock {
  code: string;
  name: Translatable;
  address: string | null;
  resp_person: string | null;
  negative_remain: boolean;
  in_use: boolean;
}

/** Təchizatçı (app.vendors). code avtomatik (VE_0001). */
export interface Vendor {
  code: string;
  name: Translatable;
  description: Translatable;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  status: CategoryStatus;
  in_use: boolean;
}

/** Alış jurnalı (app.purchase_journal) — draft batch. */
export interface PurchaseJournal {
  code: string;
  descr: Translatable;
  resp_person: string | null;
  in_use: boolean;
  entries_count: number;
  total_lcy: string;
}

export type PurchaseEntryType =
  | 'purchase' | 'purchase_return' | 'sales' | 'sales_return'
  | 'disposal' | 'positive_adj' | 'negative_adj';

/** Səbəb (app.reasons) — disposal/adj üçün. */
export interface Reason {
  code: string;
  name: Translatable;
  in_use: boolean;
}

/** Post-dan əvvəl yoxlama problemi (to-do list). */
export interface PurchaseIssue {
  uid?: string;
  doc_no?: string | null;
  item_code?: string;
  item_name?: Translatable | null;
  reason: string;
  context?: Record<string, string | number>;
}

/** Alış jurnalı sətri (app.purchase_jnl_entry). Adlar JSONB snapshot. */
export interface PurchaseEntry {
  uid: string;
  jnl_code: string;
  entry_type: PurchaseEntryType;
  posting_date: string;
  doc_no: string | null;
  descr: string | null;
  item_code: string;
  item_name: Translatable | null;
  vend_code: string | null;
  vend_name: Translatable | null;
  measur_code: string | null;
  measur_name: Translatable | null;
  stock_code: string | null;
  stock_name: Translatable | null;
  qty: string;
  unit_amount_lcy: string;
  amount_lcy: string;
  reason_code: string | null;
  resp_person: string | null;
}

export type VendorEntryType = 'purchase' | 'purchase_return' | 'payment' | 'payment_return';

/** Təchizatçı kitabçası (app.vendor_ledger_entry). */
export interface VendorLedger {
  uid: string;
  transaction_number: number;
  entry_type: VendorEntryType;
  vend_code: string;
  vend_name: Translatable | null;
  doc_no: string | null;
  descr: string | null;
  purch_amount_lcy: string;
  posting_date: string;
  resp_person: string | null;
}

export type ItemEntryType = 'Inventory' | 'Receipt' | 'Disposal' | 'Sales';

/** Məhsul kitabçası (app.item_ledger_entry). Həmişə base measure. */
export interface ItemLedger {
  uid: string;
  transaction_number: number;
  posting_date: string;
  doc_no: string | null;
  entry_type: ItemEntryType;
  item_code: string;
  item_name: Translatable | null;
  stock_code: string | null;
  initial_qty: string;
  remain_qty: string;
  measure_code: string | null;
  positive: boolean;
  open: boolean;
  unit_amount_lcy: string;
  amount_lcy: string;
  reason_code: string | null;
  resp_person: string | null;
}

/** Satış menyusu (satılan yarımfabrikat). */
export interface SaleMenuItem {
  code: string;
  name: Translatable;
  image: string | null;
  sale_price: string | null;
  base_measure_code: string;
}
export interface SalePlanFixed {
  item_code: string;
  item_name: Translatable | null;
  qty: number;
  measure: string;
}
export interface SalePlanCategory {
  category_code: string;
  category_name: Translatable | null;
  qty: number;
  measure: string;
}
export interface SalePlan {
  fixed: SalePlanFixed[];
  categories: SalePlanCategory[];
}

export type SaleStatus = 'active' | 'returned' | 'replaced';

/** İş günü (app.business_days) — anbar üzrə aç/bağla. */
export interface BusinessDay {
  code: string;
  stock_code: string;
  business_date: string | null;
  status: 'open' | 'closed';
  opened_by: string | null;
  opened_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
}

/** Satış başlığı (app.sales) — tarixçə sətri. */
export interface SaleRow {
  code: string;
  transaction_number: number;
  posting_date: string | null;
  created_at: string | null;
  semi_code: string;
  semi_name: Translatable | null;
  qty: string;
  stock_code: string;
  stock_name: Translatable | null;
  business_day_code: string | null;
  locked: boolean;
  resolutions?: {
    category_code: string;
    category_name: Translatable | null;
    picks: { item_code: string; item_name: Translatable | null; percent: number }[];
  }[];
  amount_lcy: string;
  status: SaleStatus;
  replaces: string | null;
  reversed_by: string | null;
  resp_person: string | null;
}

export type CashOrderType = 'cash_in' | 'cash_out';
export type CashAccType = 'vend' | 'cust';
export type CashOrderStatus = 'draft' | 'posted';

/** Kassa orderi (app.cash_desk_order) — draft → post. */
export interface CashOrder {
  uid: string;
  cash_desk_code: string;
  cash_desk_name: Translatable | null;
  type: CashOrderType;
  posting_date: string;
  doc_no: string | null;
  descr: Translatable | null;
  acc_type: CashAccType;
  acc_no: string | null;
  acc_name: Translatable | null;
  amount_lcy: string;
  status: CashOrderStatus;
  resp_person: string | null;
  in_use: boolean;
}

/** Kassa kitabçası sətri (app.cash_ledger_entry). */
export interface CashLedger {
  uid: string;
  transaction_number: number;
  posting_date: string;
  doc_no: string | null;
  cash_desk_code: string;
  entry_type: CashOrderType;
  amount_lcy: string;
  descr: string | null;
  resp_person: string | null;
}

/** Kassa (app.cash_desk). code manual. balance_lcy keşlənmiş qalıq (ledger idarə edir). */
export interface CashDesk {
  code: string;
  description: Translatable;
  address: string | null;
  resp_person: string | null;
  balance_lcy: string;
  status: CategoryStatus;
  in_use: boolean;
}

/** Məhsul kateqoriyası (app.item_categories) — sonsuz alt-kateqoriya. */
export interface ItemCategory {
  code: string;
  parent_code: string | null;
  name: Translatable;
  status: CategoryStatus;
  sort_order: number;
  in_use: boolean;
}

/** Maliyyə kateqoriyası (gəlir/xərc ağacı) — item kateqoriyasından ayrı. */
export type FinanceCategoryType = 'income' | 'expense';
export interface FinanceCategory {
  code: string;
  parent_code: string | null;
  name: Translatable;
  type: FinanceCategoryType;
  sort_order: number;
  in_use: boolean;
}

/** Maliyyə jurnalı (gündəlik) → post → finance_ledger + cash_ledger. */
export type FinanceEntryType = 'income' | 'expense' | 'transfer';
export interface FinanceJournal {
  code: string;
  journal_date: string;
  descr: string | null;
  resp_person: string | null;
  entries_count: number;
  created_at?: string;
}
export interface FinanceLine {
  uid: string;
  item_code: string;
  item_name: Translatable | null;
  measure_code: string | null;
  meas_weight: string | null; // NULL = baza vahidi (×1); əks halda variant çəkisi (5L "ədəd" vs 8L)
  qty: string;
  unit_price: string;
  amount_lcy: string;
}
export interface FinanceJournalEntry {
  uid: string;
  posting_date: string | null;
  entry_type: FinanceEntryType;
  cash_desk_code: string;
  to_cash_desk_code: string | null;
  category_code: string | null;
  amount_lcy: string;
  descr: string | null;
  lines: FinanceLine[];
}
export interface FinanceJournalShow {
  journal: FinanceJournal;
  entries: FinanceJournalEntry[];
}

/** Item üzrə vahid çevirməsi (app.items_measurement): 1 measure_code = meas_weight × base. */
export interface ItemMeasurement {
  uid: string;
  item_code: string;
  base_measure_code: string;
  measure_code: string;
  meas_weight: string;
  in_use: boolean;
}

/** Məhsulun bir variantı üçün son qiymət (finance_ledger_line-dən). */
export interface ItemLastPrice {
  measure_code: string | null;
  meas_weight: string | null;
  unit_price: string;
  posting_date: string | null;
}

/** Məhsulun qiymət tarixçəsi — variant üzrə qiymət dəyişmələri (ən yeni yuxarıda). */
export interface ItemPriceHistory {
  measure_code: string | null;
  meas_weight: string | null;
  changes: { posting_date: string | null; unit_price: string }[];
}

/** Xammal / məhsul (app.items). status ACTIVE|BLOCKED — CategoryStatus ilə eyni. */
export interface Item {
  code: string;
  name: Translatable;
  category_code: string | null;
  base_measure_code: string;
  status: CategoryStatus;
  image: string | null;
  in_use: boolean;
  barcodes?: string[];
}

export type PurchaseStatus =
  | 'draft'
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'ordered'
  | 'delivered';

export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  measureUnitId: string;
  measureUnitName: string;
  estimatedPrice?: number;
  agreedPrice?: number;
  note?: string;
}

export interface PurchaseRequest {
  id: string;
  code: string;
  title: string;
  status: PurchaseStatus;
  requesterId: string;
  requesterName: string;
  warehouseId: string;
  warehouseName: string;
  items: PurchaseItem[];
  supplierId?: string;
  supplierName?: string;
  totalEstimated?: number;
  totalAgreed?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

export interface MeasureUnit {
  id: string;
  name: string;
  shortCode: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  measureUnitId: string;
  measureUnitName: string;
  image?: string;
  price?: number;
  minStock?: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  managerId?: string;
  managerName?: string;
  type: 'warehouse' | 'restaurant' | 'store';
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Document {
  id: string;
  code: string;
  type: 'purchase_order' | 'delivery_note' | 'invoice';
  purchaseRequestId: string;
  purchaseRequestCode: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalPurchases: number;
  pendingApproval: number;
  totalSpent: number;
  activeSuppliers: number;
  monthlyData: { month: string; amount: number }[];
  statusBreakdown: { status: string; count: number }[];
}
