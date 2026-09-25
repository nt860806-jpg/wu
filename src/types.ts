export type Artist = string;

export type ProductCategory = 
  | 'ALL' 
  | '手燈/應援物' 
  | '演唱會/巡迴周邊' 
  | '回歸專輯與特典' 
  | '年曆與會員禮' 
  | '快閃店限定' 
  | '服飾生活周邊';

export type GroupBuyStatus = 'active' | 'closing_soon' | 'purchased' | 'arrived' | 'sold_out';

export type OfficialPaymentAccount = 
  | '全支付(389)11016053741860'
  | '824 連線 111009346292'
  | '396 街口 901131004';

export const OFFICIAL_PAYMENT_ACCOUNTS: OfficialPaymentAccount[] = [
  '全支付(389)11016053741860',
  '824 連線 111009346292',
  '396 街口 901131004'
];

export interface Product {
  id: string;
  /** Products published together under one group-buy listing share a single storefront card. */
  listingGroupId?: string;
  title: string;
  artist: Artist; // 第一層（根目錄/團體）
  campaign: string; // 第二層（分類主題/批號，例：10th_Anniversary、WorldTour_MD、FanMeeting_3rd）
  category: ProductCategory;
  price: number;
  depositPrice?: number;
  originalPrice?: number;
  krwPrice?: number; // 韓幣原價 ₩
  jpyPrice?: number; // 日圓原價 ¥
  /** Maximum quantity a customer may purchase in one order. */
  purchaseLimit?: number;
  paymentMethod?: OfficialPaymentAccount; // 官方周邊付款方式
  status: GroupBuyStatus;
  deadline: string; // ISO date or display string
  currentUnits: number;
  targetUnits: number;
  imageUrl: string;
  gallery?: string[]; // 多張圖片支援
  pobDetail: string; // 特典說明 (e.g. 送 JYP SHOP 獨家自拍小卡乙張)
  memberOptions?: string[]; // 可選成員
  description: string;
  releaseDateText: string; // 預計韓國發行/到台時間
  features: string[];
  isHot?: boolean;
  isOfficialLicense: boolean;
  /** Date after which the item is automatically hidden from the shop. */
  unpublishAt?: string | null;
  /** Soft delete flag; archived items stay available to restore in admin. */
  archived?: boolean;
}

export interface CartItem {
  cartItemId: string;
  product: Product;
  selectedMember?: string;
  pobPreference?: string; // 特典順序排卡
  quantity: number;
  customNote?: string;
}

export type OrderStatus = 
  | 'order_created'           // 訂單成立
  | 'payment_verifying'        // 匯款核對
  | 'procuring'                // 官方採購中
  | 'ordered'                  // 已下單
  | 'shipped_kr'               // 已出貨 (韓國官方出貨)
  | 'warehouse'                // 集運倉 (抵達韓國/集貨倉)
  | 'flight_transit'           // 國際航班在途中
  | 'taiwan_customs_sorting'   // 抵台品檢理貨
  | 'domestic_shipping'        // 超商寄送
  | 'completed'                // 取件完成
  | 'cancelled'                // 商品未買到，訂單取消
  // Legacy compatibility
  | 'pending_payment'
  | 'paid_verifying'
  | 'confirmed'
  | 'purchased_official'
  | 'international_transit'
  | 'domestic_sorting'
  | 'shipped';

export interface OrderItem {
  productId: string;
  title: string;
  artist: string;
  campaign?: string; // 第二層（分類主題/批號）
  selectedMember?: string;
  pobPreference?: string; // 特典順序
  quantity: number;
  price: number;
  imageUrl: string;
}

export interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  phone: string;
  socialNickname: string; // 訂購人社群暱稱 (IG / Threads / LINE)
  email?: string; // 信箱已取消，選填
  campaign?: string; // 第二層（分類主題/批號）
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  isDepositOnly: boolean;
  depositAmountPaid: number;
  remainingAmount: number;
  paymentMethod: 'pxpay' | 'atm' | 'linepay' | 'credit_card' | 'cash_on_delivery';
  paymentChoice?: 'transfer' | 'cash_on_delivery';
  paymentStatus: 'unpaid' | 'verifying' | 'paid';
  bankLastFive?: string;
  shippingMethod: '7-11' | 'familymart' | 'home_delivery';
  storeName?: string;
  storeCode?: string;
  address?: string;
  orderStatus: OrderStatus;
  /** Separate progress per artist/theme when one checkout contains multiple group-buys. */
  campaignStatuses?: Record<string, OrderStatus>;
  /** Separate second-payment amounts per artist/theme for independently created top-up listings. */
  campaignSecondPaymentAmounts?: Record<string, number>;
  trackingNumber?: string;
  batchCode: string;
  notes?: string;
  pobPreference?: string; // 整筆訂單之特典順序
  secondPaymentAmount?: number; // 二補金額 (NT$)
  paymentAccount?: string; // 實際付款帳號名稱 (如 全支付(389)11016053741860 等)
  cancellationStatus?: 'none' | 'cancelled_unpaid' | 'awaiting_choice' | 'wallet_credited' | 'refund_contact_requested' | 'refund_completed';
  cancellationReason?: string;
  cancelledAt?: string;
  cancellationResolvedAt?: string;
  walletCreditAmount?: number;
  walletCreditApplied?: number;
  restoredWalletAmount?: number;
  refundCompletedAt?: string;
  cancelledBy?: string;
}

export interface WalletTransaction {
  id: string;
  ownerEmail: string;
  orderId?: string;
  amount: number;
  transactionType: 'cancellation_credit' | 'purchase_redemption' | 'refund_wallet_restore';
  description: string;
  createdAt: string;
}

export interface ShippingBatch {
  id: string;
  batchCode: string; // e.g. 2409-TWICE-A
  title: string;
  artist: string;
  campaign?: string; // 對應之主題活動
  statusText: string;
  statusCode: OrderStatus;
  /** Keep completed dispatches out of the active admin controller without deleting their history. */
  isShippingComplete?: boolean;
  flightOrContainer?: string; // 不在前端顯示
  totalParcels: number;
  shippedParcels: number;
  estimatedArrival: string;
  lastUpdated: string;
  events: {
    date: string;
    title: string;
    description: string;
    location: string;
    done: boolean;
  }[];
}

export interface AdminMember {
  id: string;
  name: string;
  role: '主團長 (Super Admin)' | '對帳小幫手' | '出貨品檢小幫手' | '客服小幫手';
  email: string;
  phone: string;
  addedAt: string;
  isActive: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'fan' | 'admin';
  favoriteArtist?: string;
  phone?: string;
  socialNickname?: string;
  password?: string;
  isLoggedIn?: boolean;
  avatarUrl?: string;
  accumulatedOrders: number;
  memberPoints?: number;
}

export type ActivePage = 
  | 'home'
  | 'products'
  | 'order-status'
  | 'shipping'
  | 'admin'
  | 'add-product'
  | 'login'
  | 'contact';
