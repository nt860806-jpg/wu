import React, { useState, useEffect } from 'react';
import { 
  Package, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Search, 
  Plus, 
  FileSpreadsheet, 
  TrendingUp, 
  ShieldCheck, 
  Truck, 
  ChevronRight,
  Edit,
  Filter,
  Check,
  X,
  UserCheck,
  UserPlus,
  Layers,
  Sparkles,
  ShoppingBag,
  CreditCard,
  CheckSquare,
  Square,
  RefreshCw,
  Tag,
  ShieldAlert,
  Lock,
  Trash2,
  Users
} from 'lucide-react';
import { Order, ShippingBatch, ActivePage, OrderStatus, AdminMember, UserProfile, Product } from '../types';
import { PageHeader } from '../components/PageHeader';
import { cleanPobDisplay, groupOrderItemsByCampaign } from '../utils/orderUtils';
import { getTaipeiDate, isProductAvailable, supabase } from '../lib/supabase';
import { canManageArtistGroups, useArtistGroups } from '../hooks/useArtistGroups';

interface AdminPageProps {
  products: Product[];
  orders: Order[];
  batches: ShippingBatch[];
  onNavigate: (page: ActivePage) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, trackingNumber?: string) => void;
  onUpdateOrderDetails?: (orderId: string, updates: Partial<Order>) => void;
  onBatchUpdateOrders?: (orderIds: string[], updates: Partial<Order>) => void;
  onAdvanceBatchStatus: (batchId: string) => void;
  onUpdateBatchStatus?: (batchId: string, newStatus: OrderStatus) => void;
  onOpenShare: () => void;
  onEditProduct: (product: Product) => void;
  onArchiveProduct: (productId: string) => void;
  onReopenProduct: (productId: string) => void;
  currentUser?: UserProfile;
  onSwitchUserRole?: () => void;
}

// Standardized 9-stage order statuses (identical with customer-facing order status)
export const ORDER_STATUS_FLOW_STEPS: { 
  status: OrderStatus; 
  stepNum: number;
  label: string; 
  desc: string; 
  badgeColor: string;
}[] = [
  { status: 'order_created', stepNum: 1, label: '1. 訂單成立', desc: '官方團務開放，訂單成立待轉帳', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200' },
  { status: 'payment_verifying', stepNum: 2, label: '2. 匯款核對', desc: '粉絲已填末五碼，1-2天內對帳核款', badgeColor: 'bg-blue-50 text-blue-800 border-blue-200' },
  { status: 'procuring', stepNum: 3, label: '3. 官方採購中', desc: '鎖定官方通路配額與限定特典', badgeColor: 'bg-purple-50 text-purple-800 border-purple-200' },
  { status: 'ordered', stepNum: 4, label: '4. 已下單', desc: '首爾官方網站正式下單成功', badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { status: 'shipped_kr', stepNum: 5, label: '5. 已出貨', desc: '韓國官方倉庫發貨配送中', badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  { status: 'warehouse', stepNum: 6, label: '6. 集運倉', desc: '抵達韓國集運倉庫裝箱秤重', badgeColor: 'bg-teal-50 text-teal-800 border-teal-200' },
  { status: 'flight_transit', stepNum: 7, label: '7. 國際航班在途中', desc: '國際空運航班飛行在空中', badgeColor: 'bg-sky-50 text-sky-800 border-sky-200' },
  { status: 'taiwan_customs_sorting', stepNum: 8, label: '8. 抵台品檢理貨', desc: '海關清關完成，品檢加厚防撞包裝', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-bold' },
  { status: 'domestic_shipping', stepNum: 9, label: '9. 超商寄送', desc: '已開立 7-11 賣貨便二補專屬賣場寄出', badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' },
];

export const AdminPage: React.FC<AdminPageProps> = ({
  orders,
  batches,
  products,
  onNavigate,
  onUpdateOrderStatus,
  onUpdateOrderDetails,
  onBatchUpdateOrders,
  onAdvanceBatchStatus,
  onUpdateBatchStatus,
  onOpenShare,
  onEditProduct,
  onArchiveProduct,
  onReopenProduct,
  currentUser,
  onSwitchUserRole,
}) => {
  // Requirement 1: 所有修改功能只有管理員有權限
  const isAdmin = currentUser?.role === 'admin';
  const { groups: artistGroups, activeGroups: activeArtistGroups, loadError: artistGroupsError } = useArtistGroups();

  // Main view tab
  const [activeTab, setActiveTab] = useState<'orders' | 'batches' | 'admins' | 'products' | 'artists'>('orders');
  const [productView, setProductView] = useState<'available' | 'offline'>('available');

  // Filters for orders - 嚴格遵守兩層架構 (Requirement 5)
  // 第一層（根目錄/團體）：Artist
  const [selectedArtist, setSelectedArtist] = useState<string>('all');
  // 第二層（分類主題/批號）：Campaign
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-Selection State (可以直接選取多位一次編輯訂單)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [batchTargetStatus, setBatchTargetStatus] = useState<OrderStatus>('procuring');
  const [batchNoteInput, setBatchNoteInput] = useState('');
  const [batchToast, setBatchToast] = useState('');

  // Single Order Edit Modal State (去掉取件門市、門市 6 碼店號、7-11 賣貨便寄件代碼)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState<OrderStatus>('order_created');
  const [editNotes, setEditNotes] = useState('');
  const [editBankLastFive, setEditBankLastFive] = useState('');
  const [editSocialNickname, setEditSocialNickname] = useState('');
  const [editPobPreference, setEditPobPreference] = useState('');
  // Requirement 3: 後台訂單新增一欄填寫二補金額
  const [editSecondPaymentAmount, setEditSecondPaymentAmount] = useState<number>(0);
  const [editPaymentAccount, setEditPaymentAccount] = useState<string>('全支付(389)11016053741860');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [exportNotice, setExportNotice] = useState(false);
  const [artistName, setArtistName] = useState('');
  const [artistDisplayName, setArtistDisplayName] = useState('');
  const [artistKrName, setArtistKrName] = useState('');
  const [artistFandom, setArtistFandom] = useState('');
  const [artistDescription, setArtistDescription] = useState('');
  const [editingArtistGroupId, setEditingArtistGroupId] = useState<string | null>(null);
  const [artistGroupNotice, setArtistGroupNotice] = useState('');
  const [artistGroupError, setArtistGroupError] = useState('');

  const resetArtistGroupForm = () => {
    setEditingArtistGroupId(null);
    setArtistName('');
    setArtistDisplayName('');
    setArtistKrName('');
    setArtistFandom('');
    setArtistDescription('');
  };

  const saveArtistGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin || !canManageArtistGroups(currentUser?.email)) return;
    setArtistGroupNotice('');
    setArtistGroupError('');
    const name = artistName.trim();
    if (!name) return;
    const values = {
      name,
      display_name: artistDisplayName.trim() || name,
      kr_name: artistKrName.trim(),
      fandom: artistFandom.trim(),
      description: artistDescription.trim(),
    };
    const result = editingArtistGroupId
      ? await supabase.from('artist_groups').update(values).eq('id', editingArtistGroupId)
      : await supabase.from('artist_groups').insert({ id: crypto.randomUUID(), ...values, is_active: true });
    if (result.error) {
      setArtistGroupError(result.error.message.includes('duplicate') ? '這個團體名稱已經存在。' : result.error.message);
      return;
    }
    setArtistGroupNotice(editingArtistGroupId ? '團體資料已更新，各處清單會自動同步。' : '已新增團體，各處清單會自動同步。');
    resetArtistGroupForm();
  };

  const editArtistGroup = (group: (typeof artistGroups)[number]) => {
    setEditingArtistGroupId(group.id);
    setArtistName(group.name);
    setArtistDisplayName(group.display_name);
    setArtistKrName(group.kr_name);
    setArtistFandom(group.fandom);
    setArtistDescription(group.description);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setArtistGroupActive = async (group: (typeof artistGroups)[number], isActive: boolean) => {
    if (!isAdmin || !canManageArtistGroups(currentUser?.email)) return;
    setArtistGroupNotice('');
    setArtistGroupError('');
    const { error } = await supabase.from('artist_groups').update({ is_active: isActive }).eq('id', group.id);
    if (error) setArtistGroupError(error.message);
    else setArtistGroupNotice(isActive ? `已重新啟用 ${group.display_name}。` : `已停用 ${group.display_name}；既有商品和訂單資料會保留。`);
  };

  // Admin Management State
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminMember | null>(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminRole, setEditAdminRole] = useState<AdminMember['role']>('對帳小幫手');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminPhone, setEditAdminPhone] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<AdminMember['role']>('對帳小幫手');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');

  // Load the shared team list and keep all signed-in admin devices current.
  useEffect(() => {
    if (!isAdmin) return;
    const loadAdmins = async () => {
      const { data, error } = await supabase.from('admin_team').select('*').order('added_at', { ascending: false });
      if (error) return;
      setAdmins(data.map(row => ({ id: row.id, name: row.name, role: row.role, email: row.email, phone: row.phone, addedAt: row.added_at, isActive: row.is_active })));
    };
    void loadAdmins();
    const channel = supabase.channel('admin-team-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'admin_team' }, () => { void loadAdmins(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [isAdmin]);

  // Distinct campaigns categorized under selected Artist
  const allCampaignsList = Array.from(
    new Set([
      '10th_Anniversary',
      'WorldTour_dominATE',
      'Born_To_Be_Tour',
      'Fe3O4_Break_Tour',
      'Comeback_Album_POB',
      ...batches.map(b => b.campaign).filter(Boolean),
      ...orders.flatMap(o => [o.campaign, ...o.items.map(i => i.campaign)]).filter(Boolean)
    ])
  ) as string[];

  const availableCampaigns = selectedArtist === 'all'
    ? allCampaignsList
    : Array.from(
        new Set([
          ...batches.filter(b => b.artist === selectedArtist).map(b => b.campaign).filter(Boolean),
          ...orders.flatMap(o => 
            o.items.filter(i => i.artist === selectedArtist).map(i => i.campaign || o.campaign)
          ).filter(Boolean)
        ])
      ) as string[];

  // Map orderStatus to badge label and styling
  const getStatusBadge = (status: OrderStatus) => {
    const matched = ORDER_STATUS_FLOW_STEPS.find(s => s.status === status);
    if (matched) {
      return { label: matched.label, color: matched.badgeColor };
    }
    // Legacy fallback
    switch (status) {
      case 'pending_payment':
        return { label: '1. 訂單成立 (待轉帳)', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'paid_verifying':
        return { label: '2. 匯款核對 (待對帳)', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'confirmed':
        return { label: '3. 官方採購中', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'purchased_official':
        return { label: '4. 已下單鎖定', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'international_transit':
        return { label: '7. 國際航班在途中', color: 'bg-sky-50 text-sky-800 border-sky-200' };
      case 'domestic_sorting':
        return { label: '8. 抵台品檢理貨', color: 'bg-amber-100 text-amber-900 border-amber-300 font-bold' };
      case 'shipped':
        return { label: '9. 超商賣貨便寄送', color: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' };
      case 'completed':
        return { label: '已取件完成', color: 'bg-slate-100 text-slate-800 border-slate-300' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  // Filtered Orders adhering to Level 1 Artist and Level 2 Campaign (Requirement 5)
  const filteredOrders = orders.filter(o => {
    // 第一層（根目錄/團體）Artist
    if (selectedArtist !== 'all') {
      const matchArtist = o.items.some(i => i.artist === selectedArtist) || 
        batches.find(b => b.batchCode === o.batchCode)?.artist === selectedArtist;
      if (!matchArtist) return false;
    }
    // 第二層（分類主題/批號）Campaign
    if (selectedCampaign !== 'all') {
      const matchCampaign = o.campaign === selectedCampaign ||
        o.items.some(i => i.campaign === selectedCampaign) ||
        batches.find(b => b.batchCode === o.batchCode)?.campaign === selectedCampaign;
      if (!matchCampaign) return false;
    }
    // 篩選狀態
    if (filterStatus !== 'all') {
      if (filterStatus === 'unpaid' && o.orderStatus !== 'order_created' && o.orderStatus !== 'pending_payment') return false;
      if (filterStatus === 'verifying' && o.orderStatus !== 'payment_verifying' && o.orderStatus !== 'paid_verifying') return false;
      if (filterStatus === 'procuring' && o.orderStatus !== 'procuring' && o.orderStatus !== 'confirmed' && o.orderStatus !== 'ordered') return false;
      if (filterStatus === 'transit' && o.orderStatus !== 'flight_transit' && o.orderStatus !== 'international_transit' && o.orderStatus !== 'warehouse' && o.orderStatus !== 'shipped_kr') return false;
      if (filterStatus === 'shipping' && o.orderStatus !== 'domestic_shipping' && o.orderStatus !== 'taiwan_customs_sorting') return false;
    }
    // 關鍵字搜尋
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchName = o.customerName.toLowerCase().includes(q);
      const matchPhone = o.phone.includes(q);
      const matchNick = o.socialNickname?.toLowerCase().includes(q);
      const matchBatch = o.batchCode?.toLowerCase().includes(q);
      const matchBank = o.bankLastFive?.includes(q);
      if (!matchId && !matchName && !matchPhone && !matchNick && !matchBatch && !matchBank) return false;
    }
    return true;
  });

  // Multi-Selection Handlers
  const isAllSelected = filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Batch Update Status for selected orders
  const handleBatchApplyStatus = () => {
    if (!isAdmin) {
      alert('⚠️ 權限不足：所有修改功能僅限管理員具備權限！');
      return;
    }
    if (selectedOrderIds.length === 0) return;
    const updates: Partial<Order> = {
      orderStatus: batchTargetStatus,
      paymentStatus: (batchTargetStatus === 'domestic_shipping' || batchTargetStatus === 'taiwan_customs_sorting' || batchTargetStatus === 'flight_transit') ? 'paid' : undefined
    };

    if (onBatchUpdateOrders) {
      onBatchUpdateOrders(selectedOrderIds, updates);
    } else {
      selectedOrderIds.forEach(id => {
        onUpdateOrderStatus(id, batchTargetStatus);
      });
    }

    const matchedStep = ORDER_STATUS_FLOW_STEPS.find(s => s.status === batchTargetStatus);
    setBatchToast(`已成功將選取的 ${selectedOrderIds.length} 筆訂單狀態同步更新為【${matchedStep?.label || batchTargetStatus}】！`);
    setTimeout(() => setBatchToast(''), 3000);
  };

  // Batch Mark as Paid for selected orders
  const handleBatchMarkPaid = () => {
    if (!isAdmin) {
      alert('⚠️ 權限不足：所有修改功能僅限管理員具備權限！');
      return;
    }
    if (selectedOrderIds.length === 0) return;
    const updates: Partial<Order> = {
      paymentStatus: 'paid',
      orderStatus: 'procuring'
    };

    if (onBatchUpdateOrders) {
      onBatchUpdateOrders(selectedOrderIds, updates);
    } else if (onUpdateOrderDetails) {
      selectedOrderIds.forEach(id => {
        onUpdateOrderDetails(id, updates);
      });
    }

    setBatchToast(`已成功將選取的 ${selectedOrderIds.length} 筆訂單標記為「已核帳入帳」，並推進至【3. 官方採購中】！`);
    setTimeout(() => setBatchToast(''), 3000);
  };

  // Batch Add Notes for selected orders
  const handleBatchAddNotes = () => {
    if (!isAdmin) {
      alert('⚠️ 權限不足：所有修改功能僅限管理員具備權限！');
      return;
    }
    if (selectedOrderIds.length === 0 || !batchNoteInput.trim()) return;
    if (onBatchUpdateOrders) {
      onBatchUpdateOrders(selectedOrderIds, { notes: batchNoteInput.trim() });
    } else if (onUpdateOrderDetails) {
      selectedOrderIds.forEach(id => {
        onUpdateOrderDetails(id, { notes: batchNoteInput.trim() });
      });
    }

    setBatchToast(`已為選取的 ${selectedOrderIds.length} 筆訂單附加團務備忘錄！`);
    setBatchNoteInput('');
    setTimeout(() => setBatchToast(''), 3000);
  };

  // Calculate statistics for the CURRENT FILTERED ORDERS (Level 1 Artist * & Level 2 Campaign *)
  const currentBatchOrders = filteredOrders;

  const batchTotalOrders = currentBatchOrders.length;
  const batchTotalItemsCount = currentBatchOrders.reduce(
    (sum, o) => sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0),
    0
  );
  const batchTotalAmount = currentBatchOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const batchDepositCollected = currentBatchOrders.reduce((sum, o) => sum + o.depositAmountPaid, 0);
  const batchRemainingDue = currentBatchOrders.reduce((sum, o) => sum + o.remainingAmount, 0);

  // Grouped procurement statistics (Strictly adheres to: Level 1 Artist > Level 2 Campaign)
  const batchItemBreakdown: Record<string, { artist: string; campaign: string; title: string; count: number; memberCounts: Record<string, number> }> = {};
  currentBatchOrders.forEach(order => {
    order.items.forEach(item => {
      const art = item.artist || (selectedArtist !== 'all' ? selectedArtist : 'JYP_Artist');
      const camp = item.campaign || order.campaign || (selectedCampaign !== 'all' ? selectedCampaign : 'Official_Campaign');
      // Group key includes Artist and Campaign so duplicate item names across campaigns never collide
      const groupKey = `${art}__${camp}__${item.title}`;
      if (!batchItemBreakdown[groupKey]) {
        batchItemBreakdown[groupKey] = { 
          artist: art, 
          campaign: camp, 
          title: item.title, 
          count: 0, 
          memberCounts: {} 
        };
      }
      batchItemBreakdown[groupKey].count += item.quantity;
      const mem = item.selectedMember || '標準版/通版';
      batchItemBreakdown[groupKey].memberCounts[mem] = (batchItemBreakdown[groupKey].memberCounts[mem] || 0) + item.quantity;
    });
  });

  // Open Single Order Edit Modal (Requirement 1: 僅管理員可開啟編輯)
  const handleOpenEditModal = (order: Order) => {
    if (!isAdmin) {
      alert('⚠️ 權限不足：所有修改功能僅限管理員具備權限！');
      return;
    }
    setEditingOrder(order);
    setEditStatus(order.orderStatus);
    setEditNotes(order.notes || '');
    setEditBankLastFive(order.bankLastFive || '');
    setEditSocialNickname(order.socialNickname || '');
    // Requirement 4: 不顯示自訂特典排卡順位 (請在下方備註詳細說明) 只顯示備註內容
    setEditPobPreference(cleanPobDisplay(order.pobPreference));
    // Requirement 3: 二補金額與付款方式
    setEditSecondPaymentAmount(order.secondPaymentAmount ?? 0);
    setEditPaymentAccount(order.paymentAccount || '全支付(389)11016053741860');
  };

  // Save Single Order Edits (Requirement 1 & 4)
  const handleSaveOrderEdits = () => {
    if (!isAdmin) {
      alert('⚠️ 權限不足：所有修改功能僅限管理員具備權限！');
      return;
    }
    if (!editingOrder) return;
    const updates: Partial<Order> = {
      orderStatus: editStatus,
      notes: editNotes,
      bankLastFive: editBankLastFive.trim() || undefined,
      socialNickname: editSocialNickname.trim(),
      pobPreference: cleanPobDisplay(editPobPreference),
      secondPaymentAmount: Number(editSecondPaymentAmount) || 0,
      paymentAccount: editPaymentAccount,
      paymentStatus: (editStatus === 'taiwan_customs_sorting' || editStatus === 'domestic_shipping' || editStatus === 'completed' || editStatus === 'flight_transit') ? 'paid' : editingOrder.paymentStatus
    };

    if (onUpdateOrderDetails) {
      onUpdateOrderDetails(editingOrder.id, updates);
    } else {
      onUpdateOrderStatus(editingOrder.id, editStatus);
    }

    setSaveSuccessNotice(true);
    setTimeout(() => {
      setSaveSuccessNotice(false);
      setEditingOrder(null);
    }, 700);
  };

  // Batch Logistics Controller sync handler (Requirement 1: 僅管理員可推進狀態)
  const handleBatchControllerChange = (batchId: string, newStatus: OrderStatus) => {
    if (!isAdmin) {
      alert('⚠️ 權限不足：推進各團批次物流狀態僅限管理員具備權限！');
      return;
    }
    if (onUpdateBatchStatus) {
      onUpdateBatchStatus(batchId, newStatus);
    } else {
      onAdvanceBatchStatus(batchId);
    }
  };

  // Export Clean CSV (Without removed store/tracking columns)
  const handleExportCsv = () => {
    const headers = [
      '主題批號', '藝人團體', '品項', '規格/成員', '單價', '數量', '品項小計',
      '訂單編號', '下單日期', '團次代碼', '訂購人姓名', '社群暱稱', '手機號碼', '信箱',
      '特典小卡順位', '訂單總金額', '二補金額', '指定收款帳戶', '匯款狀態', '帳號末五碼',
      '九階段物流狀態', '備註'
    ];
    const itemRows = filteredOrders.flatMap(order =>
      groupOrderItemsByCampaign(order.items, order.campaign).flatMap(group =>
        group.items.map(item => ({ order, group, item }))
      )
    ).sort((a, b) =>
      a.group.artist.localeCompare(b.group.artist, 'zh-Hant') ||
      a.group.campaign.localeCompare(b.group.campaign, 'zh-Hant') ||
      a.item.title.localeCompare(b.item.title, 'zh-Hant') ||
      (a.item.selectedMember || '').localeCompare(b.item.selectedMember || '', 'zh-Hant') ||
      a.order.createdAt.localeCompare(b.order.createdAt) ||
      a.order.id.localeCompare(b.order.id)
    );
    const exportedOrderIds = new Set<string>();
    const rows = itemRows.map(({ order, group, item }) => {
      const isFirstLineForOrder = !exportedOrderIds.has(order.id);
      exportedOrderIds.add(order.id);
      return [
        group.campaign,
        group.artist,
        item.title,
        item.selectedMember || '通版',
        item.price,
        item.quantity,
        item.price * item.quantity,
        order.id,
        order.createdAt,
        order.batchCode,
        order.customerName,
        order.socialNickname || '',
        order.phone,
        order.email || '',
        cleanPobDisplay(item.pobPreference || order.pobPreference),
        isFirstLineForOrder ? order.totalAmount : '',
        isFirstLineForOrder ? order.secondPaymentAmount ?? 0 : '',
        isFirstLineForOrder ? order.paymentAccount || '全支付(389)11016053741860' : '',
        isFirstLineForOrder ? order.paymentStatus === 'paid' ? '已核帳' : order.paymentStatus === 'verifying' ? '核對中' : '未付款' : '',
        isFirstLineForOrder ? order.bankLastFive || '' : '',
        isFirstLineForOrder ? getStatusBadge(order.orderStatus).label : '',
        isFirstLineForOrder ? order.notes || '' : ''
      ];
    });

    const csvContent = '\uFEFF' + [headers, ...rows].map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `追星便利店_Orders_${selectedArtist}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 2500);
  };

  // Add Admin Handler
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminEmail.trim()) return;

    const newAdmin: AdminMember = {
      id: `adm-${Date.now()}`,
      name: newAdminName.trim(),
      role: newAdminRole,
      email: newAdminEmail.trim(),
      phone: newAdminPhone.trim() || '未填寫',
      addedAt: new Date().toISOString().split('T')[0],
      isActive: true
    };

    const { error } = await supabase.from('admin_team').insert({ id: newAdmin.id, name: newAdmin.name, role: newAdmin.role, email: newAdmin.email, phone: newAdmin.phone, added_at: newAdmin.addedAt, is_active: true });
    if (error) { window.alert('新增失敗，請確認管理員帳號已完成登入。'); return; }
    setAdmins(prev => [newAdmin, ...prev]);
    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminPhone('');
    setShowAddAdminModal(false);
  };

  const startEditingAdmin = (admin: AdminMember) => {
    setEditingAdmin(admin);
    setEditAdminName(admin.name);
    setEditAdminRole(admin.role);
    setEditAdminEmail(admin.email);
    setEditAdminPhone(admin.phone === '未填寫' ? '' : admin.phone);
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !editingAdmin || !editAdminName.trim() || !editAdminEmail.trim()) return;
    const email = editAdminEmail.trim().toLowerCase();
    if (admins.some(member => member.id !== editingAdmin.id && member.email.toLowerCase() === email)) {
      window.alert('這個 Email 已在名冊中。');
      return;
    }

    const updates = {
      name: editAdminName.trim(),
      role: editAdminRole,
      email,
      phone: editAdminPhone.trim() || '未填寫',
    };
    const { error } = await supabase.from('admin_team').update(updates).eq('id', editingAdmin.id);
    if (error) { window.alert('編輯失敗，請確認目前登入的是授權管理員。'); return; }
    setAdmins(prev => prev.map(member => member.id === editingAdmin.id ? { ...member, ...updates } : member));
    setEditingAdmin(null);
  };

  const handleToggleAdminStatus = async (id: string) => {
    const member = admins.find(a => a.id === id);
    if (!member) return;
    const { error } = await supabase.from('admin_team').update({ is_active: !member.isActive }).eq('id', id);
    if (error) { window.alert('更新失敗，請稍後再試。'); return; }
    setAdmins(prev =>
      prev.map(a => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
  };

  const handleDeleteAdmin = async (admin: AdminMember) => {
    if (!isAdmin || admin.role.includes('Super')) return;
    const confirmed = window.confirm(`確定要刪除「${admin.name}」的小幫手帳號嗎？`);
    if (!confirmed) return;
    const { error } = await supabase.from('admin_team').delete().eq('id', admin.id);
    if (error) { window.alert('刪除失敗，請確認目前登入的是授權管理員。'); return; }
    setAdmins(prev => prev.filter(member => member.id !== admin.id));
  };

  // Requirement 2: 一般會員沒有看團務後台的權限
  if (!isAdmin) {
    return (
      <div className="space-y-10">
        <PageHeader
          title="團務後台 · 存取權限受限"
          description="團務營運管理中心包含全團會員訂購明細、二補款項設定與物流控制器，僅限官方管理員存取。"
          tag="權限管制"
          actionText="← 前往會員中心"
          onActionClick={() => onNavigate('login')}
          onOpenShareModal={onOpenShare}
        />

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-3 py-1 rounded-full border border-rose-200 inline-block">
                403 · 權限不足
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                一般會員無權限查看團務後台
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                您目前的登入身分為一般會員【{currentUser?.name || '一般粉絲'}】。
                團務營運管理中心包含全團跟團者資料、二補金額管理與海關物流控制器，僅限官方主團長與工作人員存取。
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors"
              >
                前往會員中心
              </button>
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold transition-colors"
              >
                返回首頁瀏覽周邊
              </button>
              {onSwitchUserRole && (
                <button
                  type="button"
                  onClick={onSwitchUserRole}
                  className="w-full sm:w-auto px-6 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold transition-colors"
                >
                  ⚡ 切換為團長管理員帳號
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* 每一頁都要有頁面標題與描述 */}
      <PageHeader
        title="追星便利店 · 團務營運與全功能後台管理中心"
        description="具備分團篩選、同一團周邊統計總數與所有金額彙整、多選批量編輯訂單、九階段物流狀態同步推進控制器與小幫手權限管理。"
        tag="官方營運工作台"
        actionText="+ 開立新周邊團務"
        onActionClick={() => onNavigate('add-product')}
        onOpenShareModal={onOpenShare}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* TOP TAB NAVIGATION */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'orders'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>訂單管理與對帳核算 ({orders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('batches')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'batches'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>批次物流狀態推進控制器 ({batches.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'products' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>周邊介紹管理 ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('admins')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'admins'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>管理團隊與權限 ({admins.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('artists')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'artists' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>藝人團體管理 ({artistGroups.length})</span>
            </button>
          </div>

        </div>

        {/* REQUIREMENT 1: 權限提示橫幅 (所有修改功能只有管理員有權限) */}
        {!isAdmin && (
          <div className="p-4 bg-amber-50/95 border border-amber-300 rounded-3xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-amber-900 font-medium">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <div className="font-bold text-sm text-amber-950">⚠️ 團務後台修改權限限制</div>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  所有訂單修改、批量狀態更新、批次推進控制器與團隊設定<strong>僅限管理員有權限</strong>。您目前為一般會員（{currentUser?.name || '一般訪客'}），修改功能已鎖定。
                </p>
              </div>
            </div>
            {onSwitchUserRole && (
              <button
                type="button"
                onClick={onSwitchUserRole}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition-colors cursor-pointer"
              >
                切換為團長管理員身分
              </button>
            )}
          </div>
        )}

        {/* TOAST NOTICE */}
        {batchToast && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{batchToast}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setBatchToast('')}
              className="text-emerald-700 hover:text-emerald-900 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TAB 1: ORDERS & LOGISTICS STATS */}
        {activeTab === 'products' && (
          <section className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">周邊介紹管理</h2>
                <p className="text-xs text-slate-500 mt-1">設定商品內容與下架日期；到期商品會自動移入已下架清單，可隨時重新開啟。</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setProductView('available')} className={`px-3 py-2 rounded-xl text-xs font-bold ${productView === 'available' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>上架中</button>
                <button type="button" onClick={() => setProductView('offline')} className={`px-3 py-2 rounded-xl text-xs font-bold ${productView === 'offline' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>已下架／到期</button>
                <button type="button" onClick={() => onNavigate('add-product')} className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" />新增</button>
              </div>
            </div>
            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.filter(product => productView === 'available' ? isProductAvailable(product) : !isProductAvailable(product)).length === 0 ? (
                <p className="col-span-full py-10 text-center text-sm text-slate-500">目前沒有這類商品。</p>
              ) : products.filter(product => productView === 'available' ? isProductAvailable(product) : !isProductAvailable(product)).map(product => (
                <article key={product.id} className="border border-slate-200 rounded-2xl p-4 flex gap-4">
                  <img src={product.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover bg-slate-100" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-2">{product.title}</h3>
                      <span className={`shrink-0 text-[10px] h-fit px-2 py-1 rounded-full ${isProductAvailable(product) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{isProductAvailable(product) ? '上架中' : product.unpublishAt && product.unpublishAt < getTaipeiDate() && !product.archived ? '已到期' : '已下架'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{product.artist}・NT$ {product.price.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500 mt-1">下架日期：{product.unpublishAt || '未設定'}</p>
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={() => onEditProduct(product)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 inline-flex items-center gap-1"><Edit className="w-3 h-3" />編輯</button>
                      {productView === 'available' ? (
                        <button type="button" onClick={() => { if (window.confirm(`確定將「${product.title}」移至已下架清單？之後仍可重新上架。`)) onArchiveProduct(product.id); }} className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-50 inline-flex items-center gap-1"><Trash2 className="w-3 h-3" />移至下架</button>
                      ) : (
                        <button type="button" onClick={() => onReopenProduct(product.id)} className="px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-50 inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" />重新上架</button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'artists' && (
          <section className="space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">藝人團體管理</h2>
                <p className="text-xs text-slate-500 mt-1">新增或調整團體資料，會同步到首頁本命團體、周邊篩選、商品表單與後台篩選。停用會保留歷史商品和訂單。</p>
              </div>
              {(artistGroupNotice || artistGroupsError) && <p role="status" className="mb-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold">{artistGroupNotice || '團體清單暫時無法從資料庫讀取，目前顯示預設清單。'}</p>}
              {artistGroupError && <p role="alert" className="mb-3 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold">{artistGroupError}</p>}
              <form onSubmit={saveArtistGroup} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <label className="text-xs font-semibold text-slate-700">團體名稱（資料識別）
                  <input required value={artistName} onChange={event => setArtistName(event.target.value)} readOnly={Boolean(editingArtistGroupId)} placeholder="例如：TWICE" className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm read-only:bg-slate-100" />
                </label>
                <label className="text-xs font-semibold text-slate-700">顯示名稱
                  <input value={artistDisplayName} onChange={event => setArtistDisplayName(event.target.value)} placeholder="預設使用團體名稱" className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm" />
                </label>
                <label className="text-xs font-semibold text-slate-700">韓文名稱（選填）
                  <input value={artistKrName} onChange={event => setArtistKrName(event.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm" />
                </label>
                <label className="text-xs font-semibold text-slate-700">粉絲名稱（選填）
                  <input value={artistFandom} onChange={event => setArtistFandom(event.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm" />
                </label>
                <label className="text-xs font-semibold text-slate-700 md:col-span-2">團體介紹（選填）
                  <input value={artistDescription} onChange={event => setArtistDescription(event.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm" />
                </label>
                <div className="md:col-span-2 xl:col-span-3 flex gap-2">
                  <button type="submit" disabled={!isAdmin} className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold disabled:opacity-50">{editingArtistGroupId ? '儲存團體資料' : '新增藝人團體'}</button>
                  {editingArtistGroupId && <button type="button" onClick={resetArtistGroupForm} className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold">取消編輯</button>}
                </div>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {artistGroups.map(group => (
                <article key={group.id} className={`bg-white rounded-2xl border p-5 shadow-xs ${group.is_active ? 'border-slate-200' : 'border-slate-200 opacity-70'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{group.display_name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{group.kr_name || group.name}{group.fandom ? ` ・ ${group.fandom}` : ''}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold ${group.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{group.is_active ? '使用中' : '已停用'}</span>
                  </div>
                  {group.description && <p className="text-xs text-slate-600 mt-3 leading-relaxed">{group.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button type="button" disabled={!isAdmin} onClick={() => editArtistGroup(group)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-50">編輯資料</button>
                    {group.is_active ? (
                      <button type="button" disabled={!isAdmin} onClick={() => { if (window.confirm(`停用「${group.display_name}」？舊商品和訂單仍會保留。`)) void setArtistGroupActive(group, false); }} className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-semibold disabled:opacity-50">停用團體</button>
                    ) : (
                      <button type="button" disabled={!isAdmin} onClick={() => void setArtistGroupActive(group, true)} className="px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 text-xs font-semibold disabled:opacity-50">重新啟用</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* 1. FILTER & SUMMARY HEADER */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* 篩選不同團：嚴格兩層架構 (Requirement 5) */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* 第一層（根目錄/團體）：Artist */}
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold text-slate-800">
                      藝人團體 (Artist) <span className="text-rose-500">*</span>：
                    </span>
                    <select
                      value={selectedArtist}
                      onChange={e => {
                        setSelectedArtist(e.target.value);
                        setSelectedCampaign('all'); // Reset second tier when artist changes
                        setSelectedOrderIds([]);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-rose-300 bg-rose-50/50 text-slate-900 focus:outline-rose-500 cursor-pointer shadow-2xs"
                    >
                      <option value="all">全部藝人團體 (ALL)</option>
                      {activeArtistGroups.map(group => <option key={group.id} value={group.name}>{group.display_name}</option>)}
                    </select>
                  </div>

                  {/* 第二層（分類主題/批號）：Campaign */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      主題批號 (Campaign) <span className="text-rose-500">*</span>：
                    </span>
                    <select
                      value={selectedCampaign}
                      onChange={e => {
                        setSelectedCampaign(e.target.value);
                        setSelectedOrderIds([]);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-rose-500 cursor-pointer shadow-2xs"
                    >
                      <option value="all">全部主題批號 (ALL)</option>
                      {availableCampaigns.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Level 1 & Level 2 Active Badge */}
                  {(selectedArtist !== 'all' || selectedCampaign !== 'all') && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono bg-rose-100/70 text-rose-800 px-2.5 py-1 rounded-lg border border-rose-300">
                      <Tag className="w-3 h-3 text-rose-600" />
                      <span className="font-bold">{selectedArtist !== 'all' ? selectedArtist : '全部團體'}</span>
                      <span className="text-rose-400">/</span>
                      <span className="font-bold">{selectedCampaign !== 'all' ? selectedCampaign : '全部主題'}</span>
                    </div>
                  )}
                </div>

                {/* Search query input */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜尋訂單編號 / 暱稱 / 姓名 / 末五碼..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-rose-500 font-medium"
                  />
                </div>
              </div>

              {/* 2. STATS AGGREGATION: 同一團可以顯示所有資料及統計總數、所有金額 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] text-slate-500 font-medium block">本團跟團總人次</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">
                    {batchTotalOrders} <span className="text-xs font-normal text-slate-500">筆訂單</span>
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] text-slate-500 font-medium block">周邊總採購件數</span>
                  <span className="text-lg font-bold text-rose-600 font-mono">
                    {batchTotalItemsCount} <span className="text-xs font-normal text-slate-500">件</span>
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] text-slate-500 font-medium block">本團總流水金額</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">
                    NT$ {batchTotalAmount.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100">
                  <span className="text-[11px] text-emerald-700 font-medium block">已入帳訂金總數</span>
                  <span className="text-lg font-bold text-emerald-800 font-mono">
                    NT$ {batchDepositCollected.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-amber-700 font-medium block">抵台二補待收尾款</span>
                  <span className="text-lg font-bold text-amber-800 font-mono">
                    NT$ {batchRemainingDue.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 3. ITEM BREAKDOWN ACCORDING TO ARTIST & CAMPAIGN */}
              {Object.keys(batchItemBreakdown).length > 0 && (
                <div className="p-3.5 bg-rose-50/40 rounded-2xl border border-rose-100/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-rose-600" />
                      <span>本團官方採購明細統計（依 Artist &gt; Campaign 分類彙整，避免不同主題同品名混淆）：</span>
                    </span>
                    <span className="text-[10px] text-rose-600 font-medium">已彙整 {Object.keys(batchItemBreakdown).length} 款周邊</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {Object.values(batchItemBreakdown).map((item, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-xl border border-rose-100/80 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-semibold">
                            {item.artist} · {item.campaign}
                          </span>
                          <span className="text-xs font-bold text-rose-600 font-mono">
                            總計: {item.count} 件
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{item.title}</h5>
                        <div className="text-[10px] text-slate-500 font-mono flex flex-wrap gap-1">
                          {Object.entries(item.memberCounts).map(([mem, cnt]) => (
                            <span key={mem} className="bg-slate-100 px-1.5 py-0.2 rounded">
                              {mem}: {cnt}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. MULTI-SELECTION BATCH EDIT CONTROLLER (可以直接選取多位一次編輯訂單) */}
            {selectedOrderIds.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-rose-400" />
                    <span className="text-sm font-bold">
                      已選取 <span className="text-rose-400 font-mono text-base px-1">{selectedOrderIds.length}</span> 位跟團粉絲訂單
                    </span>
                    <span className="text-xs text-slate-400 hidden md:inline">
                      （可進行狀態批次推進、標記核對入帳或附加備忘錄）
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedOrderIds([])}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 self-start sm:self-auto transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>取消選取</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-300 whitespace-nowrap">目標狀態：</span>
                    <select
                      value={batchTargetStatus}
                      onChange={e => setBatchTargetStatus(e.target.value as OrderStatus)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 border border-slate-600 text-white focus:outline-rose-500 cursor-pointer"
                    >
                      {ORDER_STATUS_FLOW_STEPS.map(step => (
                        <option key={step.status} value={step.status}>
                          {step.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Apply Status Button */}
                  <button
                    type="button"
                    onClick={handleBatchApplyStatus}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>批量變更選取狀態</span>
                  </button>

                  {/* Quick Mark Paid */}
                  <button
                    type="button"
                    onClick={handleBatchMarkPaid}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>批量標記已核帳</span>
                  </button>

                  {/* Batch Note input */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="批量附加備忘錄..."
                      value={batchNoteInput}
                      onChange={e => setBatchNoteInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-rose-500"
                    />
                    <button
                      type="button"
                      onClick={handleBatchAddNotes}
                      disabled={!batchNoteInput.trim()}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-xs font-medium rounded-xl whitespace-nowrap"
                    >
                      套用備註
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. ORDERS TABLE WITH MULTI-SELECT (去掉取件門市、門市 6 碼店號、7-11 賣貨便寄件代碼) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Quick Status Sub-filters & Export */}
              <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-xs text-slate-500 font-medium mr-1">快捷篩選：</span>
                  {[
                    { id: 'all', label: '全部訂單' },
                    { id: 'unpaid', label: '待轉帳' },
                    { id: 'verifying', label: '待核帳' },
                    { id: 'procuring', label: '官方採購/已下單' },
                    { id: 'transit', label: '國際空運/集運倉' },
                    { id: 'shipping', label: '抵台品檢/超商寄送' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setFilterStatus(tab.id);
                        setSelectedOrderIds([]);
                      }}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                        filterStatus === tab.id
                          ? 'bg-rose-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {exportNotice && (
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                      ✓ 團務跟團清單已成功匯出！
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>匯出本團訂單名冊</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="p-1 hover:text-rose-600 transition-colors"
                          title={isAllSelected ? "取消全選" : "全選當前篩選之訂單"}
                        >
                          {isAllSelected ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="py-3.5 px-4">訂單編號 / 團次</th>
                      <th className="py-3.5 px-4">訂購人 / 社群暱稱</th>
                      <th className="py-3.5 px-4">訂購品項 / 特典順序</th>
                      <th className="py-3.5 px-4">金額 / 末五碼</th>
                      <th className="py-3.5 px-4">二補金額 (NT$)</th>
                      <th className="py-3.5 px-4">九階段物流狀態</th>
                      <th className="py-3.5 px-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          本團暫無相符訂單資料
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(order => {
                        const badge = getStatusBadge(order.orderStatus);
                        const isSelected = selectedOrderIds.includes(order.id);
                        return (
                          <tr 
                            key={order.id} 
                            className={`transition-colors ${
                              isSelected ? 'bg-rose-50/50' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            {/* Checkbox for Multi-Select */}
                            <td className="py-3.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSelectOrder(order.id)}
                                className="p-1 transition-colors"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-rose-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                                )}
                              </button>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-mono font-bold text-slate-900">{order.id}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{order.createdAt}</div>
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] font-mono rounded">
                                {order.batchCode}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-800">{order.customerName}</div>
                              <div className="text-[11px] text-rose-600 font-semibold">
                                暱稱：{order.socialNickname || '未填寫'}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500">{order.phone}</div>
                            </td>

                            <td className="py-3.5 px-4 max-w-xs">
                              {groupOrderItemsByCampaign(order.items, order.campaign).map(group => (
                                <div key={`${group.artist}-${group.campaign}`} className="mb-1.5">
                                  <div className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded inline-block mb-0.5">
                                    {group.artist}・{group.campaign}
                                  </div>
                                  {group.items.map((item, idx) => (
                                    <div key={`${item.title}-${idx}`} className="line-clamp-1 text-slate-700">
                                      • {item.title} <span className="text-slate-400 font-mono">({item.selectedMember || '通版'} x{item.quantity})</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                              {order.pobPreference && (
                                <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded mt-1 line-clamp-1 border border-amber-200">
                                  🎁 特典順位: {cleanPobDisplay(order.pobPreference)}
                                </div>
                              )}
                              {order.notes && (
                                <div className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">
                                  備註: {order.notes}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 font-mono">
                              <div className="font-bold text-slate-900">NT$ {order.totalAmount.toLocaleString()}</div>
                              <div className="text-[11px] text-slate-500">
                                先付: NT$ {order.depositAmountPaid.toLocaleString()}
                              </div>
                              {order.bankLastFive ? (
                                <div className="text-[11px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded inline-block mt-0.5 border border-rose-200">
                                  後5碼: {order.bankLastFive}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400">未登記末五碼</div>
                              )}
                            </td>

                            {/* 二補金額欄位 (Requirement 3: 後台訂單新增一欄填寫二補金額) */}
                            <td className="py-3.5 px-4 font-mono">
                              {isAdmin ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400 font-bold text-xs">$</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={order.secondPaymentAmount ?? 0}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (onUpdateOrderDetails) {
                                          onUpdateOrderDetails(order.id, { secondPaymentAmount: val });
                                        }
                                      }}
                                      className="w-20 px-2 py-1 text-xs rounded-lg border border-amber-300 bg-amber-50/60 font-mono font-bold text-amber-950 focus:outline-rose-500 focus:bg-white"
                                      placeholder="0"
                                      title="填寫二補金額 (NT$)"
                                    />
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-sans">
                                    {order.secondPaymentAmount && order.secondPaymentAmount > 0 ? '賣貨便二補' : '待設定'}
                                  </div>
                                </div>
                              ) : (
                                <div className="font-bold text-amber-800">
                                  NT$ {(order.secondPaymentAmount ?? 0).toLocaleString()}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-full border text-[11px] inline-block ${badge.color}`}>
                                {badge.label}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                              {/* EDIT BUTTON (後台需可以編輯，可以選狀態，僅管理員有權限) */}
                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(order)}
                                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold text-[11px] transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit className="w-3 h-3 text-slate-600" />
                                  <span>編輯訂單</span>
                                </button>
                              ) : (
                                <span 
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-[11px] inline-flex items-center gap-1 cursor-not-allowed" 
                                  title="僅管理員有權限編輯訂單"
                                >
                                  <ShieldCheck className="w-3 h-3 text-slate-400" />
                                  <span>限管理員修改</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BATCH LOGISTICS CONTROLLER (各團批次物流狀態推進控制器要跟下單狀況選項一樣並同步) */}
        {activeTab === 'batches' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-rose-600" />
                  <span>各團批次物流狀態推進控制器（與下單狀況選項完全同步）</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  控制器選項與粉絲下單狀況 9 階段完全一致。切換或推進批次狀態時，自動即時同步該團全體訂購粉絲訂單。
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('shipping')}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
              >
                <span>查看前台出貨看板效果 →</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {batches.map(batch => {
                const batchOrdersCount = orders.filter(o => o.batchCode === batch.batchCode).length;
                const matchedStep = ORDER_STATUS_FLOW_STEPS.find(s => s.status === batch.statusCode) || ORDER_STATUS_FLOW_STEPS[0];

                return (
                  <div key={batch.id} className="p-6 rounded-3xl border border-slate-200 bg-slate-50/70 space-y-4 shadow-2xs">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {batch.batchCode}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] font-mono bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">
                            {batch.artist}
                          </span>
                          <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
                            {batch.campaign || 'Official_Campaign'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        {batchOrdersCount} 筆跟團訂單
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{batch.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 font-medium leading-snug">
                        當前貨態：<span className="text-rose-600 font-bold">{batch.statusText}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">最後更新：{batch.lastUpdated}</p>
                    </div>

                    {/* Stage Selector (Synchronized with Order Status Options) */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>跳轉至指定階段 (自動同步全團)：</span>
                        <span className="text-[10px] text-rose-600 font-mono">階段 {matchedStep.stepNum}/9</span>
                      </label>
                      <select
                        value={batch.statusCode}
                        disabled={!isAdmin}
                        onChange={e => handleBatchControllerChange(batch.id, e.target.value as OrderStatus)}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-rose-500 cursor-pointer text-slate-900"
                      >
                        {ORDER_STATUS_FLOW_STEPS.map(step => (
                          <option key={step.status} value={step.status}>
                            {step.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Advance to next status button (Requirement 1: 僅限管理員) */}
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => {
                        if (!isAdmin) {
                          alert('⚠️ 權限不足：推進物流狀態僅限管理員具備權限！');
                          return;
                        }
                        onAdvanceBatchStatus(batch.id);
                      }}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isAdmin ? '推進至下一物流階段 (同步全團)' : '推進物流階段 (限管理員)'}</span>
                    </button>

                    <div className="text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="leading-tight">
                        已與本團 <strong>{batchOrdersCount}</strong> 筆跟團訂單即時連動同步
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN TEAM MANAGEMENT */}
        {activeTab === 'admins' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-rose-600" />
                  <span>團務管理員與對帳小幫手權限名冊</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  新增或授權小幫手帳號協助處理每日大量後五碼對帳、理貨打包與客服發送
                </p>
              </div>
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => {
                  if (!isAdmin) {
                    alert('⚠️ 權限不足：管理團隊成員僅限管理員操作！');
                    return;
                  }
                  setShowAddAdminModal(true);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isAdmin ? '+ 新增小幫手權限' : '新增小幫手 (限管理員)'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
              {admins.map(admin => (
                <div 
                  key={admin.id} 
                  className={`p-5 rounded-2xl border transition-all ${
                    admin.isActive ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      admin.role.includes('Super') ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {admin.role}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      admin.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {admin.isActive ? '權限正常' : '已停用'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-3">{admin.name}</h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{admin.email}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">電話：{admin.phone}</p>
                  <p className="text-[11px] text-slate-400 mt-2">授權日：{admin.addedAt}</p>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleAdminStatus(admin.id)}
                      className="text-xs text-slate-500 hover:text-rose-600 transition-colors"
                    >
                      {admin.isActive ? '暫時停用此帳號' : '恢復啟用'}
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => startEditingAdmin(admin)}
                        className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-rose-600 transition-colors"
                        aria-label={`編輯${admin.name}`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        編輯資料
                      </button>
                    )}
                    {isAdmin && !admin.role.includes('Super') && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAdmin(admin)}
                        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 transition-colors"
                        aria-label={`刪除${admin.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        刪除小幫手
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: EDIT SINGLE ORDER (去掉取件門市、門市 6 碼店號、7-11 賣貨便寄件代碼) */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit className="w-4 h-4 text-rose-600" />
                  <span>編輯跟團訂單資料與狀態</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  訂單編號：<strong className="font-mono text-slate-900">{editingOrder.id}</strong> ({editingOrder.batchCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveSuccessNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>訂單資料與狀態已成功儲存！</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* STATUS SELECTOR (與九階段完全同步) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <label className="text-xs font-bold text-slate-900 block">
                  調整訂單九階段物流狀態：
                </label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white focus:outline-rose-500 cursor-pointer text-slate-900"
                >
                  {ORDER_STATUS_FLOW_STEPS.map(step => (
                    <option key={step.status} value={step.status}>
                      {step.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer & Social Nickname */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">訂購人真實姓名</label>
                  <input
                    type="text"
                    value={editingOrder.customerName}
                    disabled
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-bold">社群暱稱 (Threads/IG)</label>
                  <input
                    type="text"
                    value={editSocialNickname}
                    onChange={e => setEditSocialNickname(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-rose-500 font-medium"
                  />
                </div>
              </div>

              {/* Bank Last 5 & Second Payment Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1 font-bold">匯款帳號後五碼 (查帳用)</label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="例：48291"
                    value={editBankLastFive}
                    onChange={e => setEditBankLastFive(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-rose-500 font-bold text-slate-900"
                  />
                </div>

                {/* Requirement 3: 後台訂單新增一欄填寫二補金額 */}
                <div>
                  <label className="text-amber-800 block mb-1 font-bold flex items-center justify-between">
                    <span>二補金額 (NT$)</span>
                    <span className="text-[10px] text-amber-600 font-normal">賣貨便二補賣場</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600">NT$</span>
                    <input
                      type="number"
                      min={0}
                      value={editSecondPaymentAmount}
                      onChange={e => setEditSecondPaymentAmount(Number(e.target.value))}
                      className="w-full pl-10 pr-3 py-2 text-xs font-mono rounded-xl border border-amber-300 bg-amber-50/40 focus:outline-rose-500 font-bold text-amber-950"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Account Selection */}
              <div>
                <label className="text-slate-700 block mb-1 font-bold">
                  指定收款帳戶 / 付款方式
                </label>
                <select
                  value={editPaymentAccount}
                  onChange={e => setEditPaymentAccount(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-rose-500 font-medium text-slate-900"
                >
                  <option value="全支付(389)11016053741860">全支付(389)11016053741860</option>
                  <option value="824 連線 111009346292">824 連線 111009346292</option>
                  <option value="396 街口 901131004">396 街口 901131004</option>
                </select>
              </div>

              {/* POB Preference */}
              <div>
                <label className="text-slate-700 block mb-1 font-bold">
                  特典小卡排卡順位 / 備註志願
                </label>
                <input
                  type="text"
                  value={editPobPreference}
                  onChange={e => setEditPobPreference(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-rose-500 font-medium"
                />
              </div>

              {/* Order Notes */}
              <div>
                <label className="text-slate-700 block mb-1 font-bold">團務小幫手備忘錄 / 訂單備註</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="可在此備註如：已核對彰銀入帳、待補賣貨便 20 元賣場等"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-rose-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveOrderEdits}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>儲存訂單變更</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD ADMIN */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-xl border border-slate-100">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-rose-600" />
                <span>新增團務管理員 / 小幫手</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddAdminModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-bold">
                  管理員姓名 / 稱呼 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例：小雅 (對帳小幫手)"
                  value={newAdminName}
                  onChange={e => setNewAdminName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-rose-500"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold">
                  權限職務身分 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newAdminRole}
                  onChange={e => setNewAdminRole(e.target.value as AdminMember['role'])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:outline-rose-500"
                >
                  <option value="對帳小幫手">對帳小幫手 (核對後五碼與對帳單)</option>
                  <option value="出貨品檢小幫手">出貨品檢小幫手 (品檢理貨、出貨)</option>
                  <option value="客服小幫手">客服小幫手 (回答詢問與特典協調)</option>
                  <option value="主團長 (Super Admin)">主團長 (Super Admin 全權限)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold">
                  管理員 Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin.helper@jypselect.com"
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-medium">聯絡電話</label>
                <input
                  type="tel"
                  placeholder="0911-222-333"
                  value={newAdminPhone}
                  onChange={e => setNewAdminPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                >
                  確認建立管理員
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-xl border border-slate-100">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Edit className="w-4 h-4 text-rose-600" />
                <span>編輯團隊成員資料</span>
              </h3>
              <button type="button" onClick={() => setEditingAdmin(null)} className="p-1 text-slate-400 hover:text-slate-600" aria-label="關閉編輯視窗">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateAdmin} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-bold">管理員姓名 / 稱呼 <span className="text-rose-500">*</span></label>
                <input type="text" required value={editAdminName} onChange={e => setEditAdminName(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-rose-500" />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-bold">權限職務身分 <span className="text-rose-500">*</span></label>
                <select value={editAdminRole} onChange={e => setEditAdminRole(e.target.value as AdminMember['role'])} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:outline-rose-500">
                  <option value="對帳小幫手">對帳小幫手 (核對後五碼與對帳單)</option>
                  <option value="出貨品檢小幫手">出貨品檢小幫手 (品檢理貨、出貨)</option>
                  <option value="客服小幫手">客服小幫手 (回答詢問與特典協調)</option>
                  <option value="主團長 (Super Admin)">主團長 (Super Admin 全權限)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-bold">管理員 Email <span className="text-rose-500">*</span></label>
                <input type="email" required value={editAdminEmail} onChange={e => setEditAdminEmail(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-rose-500 font-mono" />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-medium">聯絡電話</label>
                <input type="tel" value={editAdminPhone} onChange={e => setEditAdminPhone(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-rose-500" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingAdmin(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">取消</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs">儲存變更</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
