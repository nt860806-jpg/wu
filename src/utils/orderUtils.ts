import { Order, OrderItem, ShippingBatch } from '../types';

const PAYMENT_CONFIRMED_STATUSES = new Set<Order['orderStatus']>([
  'procuring', 'ordered', 'shipped_kr', 'warehouse', 'flight_transit',
  'taiwan_customs_sorting', 'domestic_shipping', 'completed', 'confirmed',
  'purchased_official', 'international_transit', 'domestic_sorting', 'shipped',
]);

export function isPaymentConfirmedByOrderStatus(status: Order['orderStatus']): boolean {
  return PAYMENT_CONFIRMED_STATUSES.has(status);
}

export function normalizeOrderPaymentStatus(order: Order): Order {
  return isPaymentConfirmedByOrderStatus(order.orderStatus) && order.paymentStatus !== 'paid'
    ? { ...order, paymentStatus: 'paid' }
    : order;
}

export function getCampaignStatusKey(artist: string, campaign: string): string {
  return `${artist.trim().toLowerCase()}::${campaign.trim().toLowerCase()}`;
}

export function getOrderCampaignStatus(order: Order, artist: string, campaign: string, batches: ShippingBatch[] = []): Order['orderStatus'] {
  const savedStatus = order.campaignStatuses?.[getCampaignStatusKey(artist, campaign)];
  if (savedStatus) return savedStatus;
  const matchingBatch = batches.find(batch => batch.campaign === campaign && (batch.artist === artist || batch.artist === 'ALL'));
  return matchingBatch?.statusCode || order.orderStatus;
}

export function withAllCampaignStatuses(order: Order, status: Order['orderStatus']): Order {
  const campaignStatuses = { ...order.campaignStatuses };
  for (const group of groupOrderItemsByCampaign(order.items, order.campaign)) {
    campaignStatuses[getCampaignStatusKey(group.artist, group.campaign)] = status;
  }
  return { ...order, orderStatus: status, campaignStatuses };
}

export function withCampaignStatus(order: Order, artist: string, campaign: string, status: Order['orderStatus']): Order {
  const groups = groupOrderItemsByCampaign(order.items, order.campaign);
  const campaignStatuses = { ...order.campaignStatuses };
  for (const group of groups) {
    const key = getCampaignStatusKey(group.artist, group.campaign);
    campaignStatuses[key] = campaignStatuses[key] || order.orderStatus;
  }
  campaignStatuses[getCampaignStatusKey(artist, campaign)] = status;
  const groupStatuses = groups.map(group => campaignStatuses[getCampaignStatusKey(group.artist, group.campaign)]);
  const sharedStatus = groupStatuses.length && groupStatuses.every(value => value === groupStatuses[0]) ? groupStatuses[0] : order.orderStatus;
  return { ...order, orderStatus: sharedStatus, campaignStatuses };
}

export interface OrderItemCampaignGroup {
  artist: string;
  campaign: string;
  items: OrderItem[];
}

export function groupOrderItemsByCampaign(items: OrderItem[], fallbackCampaign = 'Official_Campaign'): OrderItemCampaignGroup[] {
  const groups = new Map<string, OrderItemCampaignGroup>();
  for (const item of items) {
    const artist = item.artist || '其他團體';
    const campaign = item.campaign || fallbackCampaign;
    const key = JSON.stringify([artist, campaign]);
    const group = groups.get(key) || { artist, campaign, items: [] };
    const existingItem = group.items.find(candidate =>
      candidate.productId === item.productId &&
      candidate.title === item.title &&
      candidate.selectedMember === item.selectedMember &&
      candidate.pobPreference === item.pobPreference &&
      candidate.price === item.price
    );
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      group.items.push({ ...item });
    }
    groups.set(key, group);
  }
  return Array.from(groups.values());
}

/**
 * 團體縮寫對照表
 * TWICE: TW, Stray Kids: SKZ, ITZY: ITZ, NMIXX: NMX, DAY6: D6, Xdinary Heroes: XH
 */
export const ARTIST_ABBREVIATIONS: Record<string, string> = {
  'TWICE': 'TW',
  'Stray Kids': 'SKZ',
  'ITZY': 'ITZ',
  'NMIXX': 'NMX',
  'DAY6': 'D6',
  'Xdinary Heroes': 'XH'
};

/**
 * 訂單編號邏輯：團體縮寫-西元年份-五位數從0000開始遞增 (例: TW-2026-00000, TW-2026-00001)
 */
export function generateOrderId(artist: string, existingOrders: Order[]): string {
  const abbr = ARTIST_ABBREVIATIONS[artist] || 'JYP';
  const year = new Date().getFullYear();
  const prefix = `${abbr}-${year}-`;

  let maxSeq = -1;
  for (const o of existingOrders) {
    if (o.id && o.id.startsWith(prefix)) {
      const seqStr = o.id.slice(prefix.length);
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  const storageKey = `jyp_seq_${abbr}_${year}`;
  let stored = -1;
  try {
    const val = localStorage.getItem(storageKey);
    if (val !== null) stored = parseInt(val, 10);
  } catch {
    // ignore
  }

  const nextSeq = Math.max(maxSeq + 1, stored + 1, 0);
  try {
    localStorage.setItem(storageKey, String(nextSeq));
  } catch {
    // ignore
  }

  // 五位數遞增: 00000, 00001, 00002...
  return `${prefix}${String(nextSeq).padStart(5, '0')}`;
}

/**
 * 團務後台特典小卡排卡順位 / 備註志願不顯示「自訂特典排卡順位 (請在下方備註詳細說明)」只顯示備註內容
 */
export function cleanPobDisplay(pob?: string): string {
  if (!pob) return '';
  let cleaned = pob
    .replace(/自訂特典排卡順位\s*\(請在下方備註詳細說明\)/g, '')
    .replace(/^★\s*自訂排卡志願\s*/, '')
    .replace(/^自訂\s*[:：]?\s*/, '')
    .replace(/^\(\s*/, '')
    .replace(/\s*\)$/, '')
    .trim();
  
  return cleaned || '不挑成員';
}
