import { Order, OrderItem } from '../types';

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
