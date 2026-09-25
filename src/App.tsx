import React, { useState, useEffect } from 'react';
import { ActivePage, Product, Order, ShippingBatch, CartItem, UserProfile, OrderStatus, WalletTransaction } from './types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_SHIPPING_BATCHES, 
  INITIAL_ORDERS, 
  MOCK_USERS, 
  BRAND_CONFIG 
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { SocialShareModal } from './components/SocialShareModal';
import { CartDrawer } from './components/CartDrawer';

// Pages
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { OrderStatusPage } from './pages/OrderStatusPage';
import { ShippingPage } from './pages/ShippingPage';
import { AdminPage } from './pages/AdminPage';
import { AddProductPage } from './pages/AddProductPage';
import { LoginPage } from './pages/LoginPage';
import { ContactPage } from './pages/ContactPage';
import { supabase, ADMIN_EMAILS, isProductAvailable } from './lib/supabase';
import { groupOrderItemsByCampaign, isPaymentConfirmedByOrderStatus, normalizeOrderPaymentStatus, withAllCampaignStatuses, withCampaignStatus } from './utils/orderUtils';

export default function App() {
  // Navigation State
  const [currentPage, setCurrentPage] = useState<ActivePage>('home');

  // Persistence State
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('jyp_select_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('jyp_select_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);

  const [batches, setBatches] = useState<ShippingBatch[]>(() => {
    const saved = localStorage.getItem('jyp_select_batches');
    return saved ? JSON.parse(saved) : INITIAL_SHIPPING_BATCHES;
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('jyp_select_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    return { ...MOCK_USERS.fan, name: '訪客', email: '尚未登入', isLoggedIn: false };
  });
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [, setDateCheck] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setDateCheck(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const recoveryRedirect = /(?:[?#&])type=recovery(?:[&#]|$)/i.test(window.location.href);

    if (recoveryRedirect) {
      setCurrentPage('login');
      void supabase.auth.getSession().then(({ data }) => {
        if (isMounted && data.session) setIsPasswordRecovery(true);
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (recoveryRedirect && event === 'INITIAL_SESSION' && session)) {
        setIsPasswordRecovery(true);
        setCurrentPage('login');
      }
      const email = session?.user.email;
      if (!email) {
        setCurrentUser({ ...MOCK_USERS.fan, name: '訪客', email: '尚未登入', isLoggedIn: false });
        return;
      }
      const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'fan';
      const base = role === 'admin' ? MOCK_USERS.admin : MOCK_USERS.fan;
      const metadata = session.user.user_metadata || {};
      setCurrentUser({
        ...base,
        id: session.user.id,
        email,
        name: metadata.full_name || email.split('@')[0],
        phone: metadata.phone || '',
        socialNickname: metadata.social_nickname || '',
        role,
        isLoggedIn: true,
      });
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Modals & Search Queries
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [productsToEdit, setProductsToEdit] = useState<Product[] | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('jyp_select_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase.from('products').select('id,data,unpublish_at,archived').order('id');
      if (error || !data) return;
      setProducts(data.map(row => ({ ...row.data, id: row.id, unpublishAt: row.unpublish_at, archived: row.archived }) as Product));
    };
    void loadProducts();
    const channel = supabase.channel('product-catalog-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { void loadProducts(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [currentUser.isLoggedIn, currentUser.email, currentUser.role]);

  // Keep one logistics controller entry for every currently available artist/topic pair.
  useEffect(() => {
    const currentTopics = new Map<string, { artist: string; campaign: string }>();
    products.filter(isProductAvailable).forEach(product => {
      if (!product.campaign) return;
      const key = `${product.artist.toLowerCase()}::${product.campaign.toLowerCase()}`;
      currentTopics.set(key, { artist: product.artist, campaign: product.campaign });
    });
    if (!currentTopics.size) return;

    setBatches(existing => {
      const missingTopics = Array.from(currentTopics.entries()).filter(([key, topic]) =>
        !existing.some(batch => `${batch.artist.toLowerCase()}::${(batch.campaign || '').toLowerCase()}` === key)
      );
      if (!missingTopics.length) return existing;
      const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const newBatches: ShippingBatch[] = missingTopics.map(([key, topic]) => {
        const slug = `${topic.artist}-${topic.campaign}`.normalize('NFKD').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toUpperCase();
        return {
          id: `topic-${encodeURIComponent(key)}`,
          batchCode: `TOPIC-${slug}`,
          title: `${topic.artist}・${topic.campaign} 主題物流`,
          artist: topic.artist,
          campaign: topic.campaign,
          statusText: '目前開放跟團，等待團務物流更新',
          statusCode: 'order_created',
          totalParcels: 0,
          shippedParcels: 0,
          estimatedArrival: '待更新',
          lastUpdated: now,
          events: [],
        };
      });
      return [...existing, ...newBatches];
    });
  }, [products]);

  useEffect(() => {
    localStorage.setItem('jyp_select_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    if (!currentUser.isLoggedIn || !currentUser.email || currentUser.email === '尚未登入') {
      setWalletTransactions([]);
      return;
    }
    let active = true;
    const email = currentUser.email.toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(email);

    const mapOrderRows = (rows: { data: Order; cancellation_status: Order['cancellationStatus'] }[]) =>
      rows.map(row => normalizeOrderPaymentStatus({ ...row.data, cancellationStatus: row.cancellation_status && row.cancellation_status !== 'none' ? row.cancellation_status : row.data.cancellationStatus || 'none' }));
    const loadCloudOrders = async () => {
      const { data, error } = await supabase.from('orders').select('data,cancellation_status').order('created_at', { ascending: false });
      if (!error && data && active) {
        const rows = data as { data: Order; cancellation_status: Order['cancellationStatus'] }[];
        const cloudOrders = mapOrderRows(rows);
        setOrders(cloudOrders);
        const inconsistentOrders = cloudOrders.filter((order, index) => order.paymentStatus !== rows[index].data.paymentStatus);
        if (inconsistentOrders.length) {
          void Promise.all(inconsistentOrders.map(order => supabase.from('orders').update({ data: order, updated_at: new Date().toISOString() }).eq('id', order.id)));
        }
      }
    };
    const loadWallet = async () => {
      const { data, error } = await supabase.from('wallet_transactions').select('id,owner_email,order_id,amount,transaction_type,description,created_at').order('created_at', { ascending: false });
      if (!error && data && active) {
        setWalletTransactions(data.map(row => ({
          id: row.id,
          ownerEmail: row.owner_email,
          orderId: row.order_id || undefined,
          amount: row.amount,
          transactionType: row.transaction_type,
          description: row.description,
          createdAt: row.created_at,
        })));
      }
    };

    const syncLegacyLocalOrders = async () => {
      let localOrders: Order[] = [];
      try {
        const raw = localStorage.getItem('jyp_select_orders');
        localOrders = raw ? JSON.parse(raw) as Order[] : [];
      } catch {
        localOrders = [];
      }
      const migratable = localOrders.filter(order => {
        const ownerEmail = order.email?.trim().toLowerCase() || '';
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail) && (isAdmin || ownerEmail === email);
      });
      if (migratable.length) {
        await supabase.from('orders').upsert(migratable.map(order => ({
          id: order.id,
          owner_email: order.email!.trim().toLowerCase(),
          data: { ...order, cancellationStatus: order.cancellationStatus || 'none' },
          cancellation_status: order.cancellationStatus || 'none',
        })), { onConflict: 'id', ignoreDuplicates: true });
      }
      await Promise.all([loadCloudOrders(), loadWallet()]);
    };

    void syncLegacyLocalOrders();
    const channel = supabase.channel(`member-orders-wallet-${email}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { void loadCloudOrders(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => { void loadWallet(); })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [currentUser.email, currentUser.isLoggedIn, currentUser.role]);

  useEffect(() => {
    localStorage.setItem('jyp_select_batches', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('jyp_select_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (currentUser.isLoggedIn) localStorage.setItem('jyp_select_user', JSON.stringify(currentUser));
    else localStorage.removeItem('jyp_select_user');
  }, [currentUser]);

  // Scroll to top on navigation
  const handleNavigate = (page: ActivePage) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cart operations
  const handleAddToCart = (product: Product, member: string | undefined, qty: number) => {
    setCartItems(prev => {
      const productQuantity = prev.filter(item => item.product.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
      const allowedQuantity = product.purchaseLimit ? product.purchaseLimit - productQuantity : qty;
      const quantityToAdd = Math.min(qty, allowedQuantity);
      if (quantityToAdd < 1) return prev;
      const existingIdx = prev.findIndex(
        item => item.product.id === product.id && item.selectedMember === member
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantityToAdd;
        return updated;
      }
      return [
        ...prev,
        {
          cartItemId: `${product.id}-${member || 'default'}-${Date.now()}`,
          product,
          selectedMember: member,
          quantity: quantityToAdd,
        }
      ];
    });
  };

  const handleInstantBuy = (product: Product, member: string | undefined, qty: number) => {
    handleAddToCart(product, member, qty);
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCartItems(prev =>
      prev.map(item => {
        if (item.cartItemId === cartItemId) {
          const productQuantity = prev.filter(cartItem => cartItem.product.id === item.product.id).reduce((sum, cartItem) => sum + cartItem.quantity, 0);
          const remaining = item.product.purchaseLimit ? Math.max(0, item.product.purchaseLimit - productQuantity) : Math.abs(delta);
          const newQty = item.quantity + (delta > 0 ? Math.min(delta, remaining) : delta);
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Order operations
  const handleCreateOrder = async (newOrder: Order, walletCreditApplied: number): Promise<boolean> => {
    const { data, error } = await supabase.rpc('create_member_order', {
      p_order: newOrder,
      p_wallet_apply: walletCreditApplied,
    });
    if (error || !data) {
      window.alert(error?.message || '訂單建立失敗，請稍後再試。');
      return false;
    }
    const savedOrder = { ...newOrder, ...(data as Partial<Order>) };
    setOrders(prev => [savedOrder, ...prev.filter(order => order.id !== savedOrder.id)]);
    setCurrentUser(prev => ({
      ...prev,
      accumulatedOrders: (prev.accumulatedOrders || 0) + 1,
    }));
    return true;
  };

  const handleNavigateToOrder = (orderId: string) => {
    setOrderSearchQuery(orderId);
    handleNavigate('order-status');
  };

  const handleUpdateOrderBankCode = async (orderId: string, bankLastFive: string) => {
    const { data, error } = await supabase.rpc('submit_order_bank_code', { p_order_id: orderId, p_bank_last_five: bankLastFive });
    if (error) { window.alert(error.message); return; }
    if (data) setOrders(prev => prev.map(order => order.id === orderId ? { ...order, ...(data as Partial<Order>) } : order));
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus, trackingNumber?: string) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id === orderId) {
          const updatedOrder = withAllCampaignStatuses({
            ...o,
            trackingNumber: trackingNumber || o.trackingNumber,
          }, status);
          return {
            ...updatedOrder,
            paymentStatus: isPaymentConfirmedByOrderStatus(status) ? 'paid' : o.paymentStatus
          };
        }
        return o;
      })
    );
    const order = orders.find(item => item.id === orderId);
    if (order) {
      const statusUpdatedOrder = withAllCampaignStatuses({ ...order, trackingNumber: trackingNumber || order.trackingNumber }, status);
      const updated = {
        ...statusUpdatedOrder,
        paymentStatus: isPaymentConfirmedByOrderStatus(status) ? 'paid' : order.paymentStatus,
      };
      void supabase.from('orders').update({ data: updated, updated_at: new Date().toISOString() }).eq('id', orderId);
    }
  };

  const handleUpdateOrderDetails = (orderId: string, updates: Partial<Order>) => {
    const existing = orders.find(order => order.id === orderId);
    if (!existing) return;
    const updated = normalizeOrderPaymentStatus(updates.orderStatus
      ? withAllCampaignStatuses({ ...existing, ...updates }, updates.orderStatus)
      : { ...existing, ...updates });
    setOrders(prev => prev.map(order => order.id === orderId ? updated : order));
    void supabase.from('orders').update({
      data: updated,
      cancellation_status: updated.cancellationStatus || 'none',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId).then(({ error }) => {
      if (error) window.alert(`訂單更新失敗：${error.message}`);
    });
  };

  const handleCancelOrderForNoStock = async (orderId: string): Promise<boolean> => {
    if (!currentUser.isLoggedIn || !ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) return false;
    const order = orders.find(item => item.id === orderId);
    if (!order) return false;
    const isUnpaid = order.paymentStatus === 'unpaid' && !order.bankLastFive;
    const updated: Order = {
      ...order,
      orderStatus: 'cancelled',
      cancellationStatus: isUnpaid ? 'cancelled_unpaid' : 'awaiting_choice',
      cancellationReason: isUnpaid
        ? '此訂單在未付款時取消，無需退款或轉購物金。'
        : '商品未能向官方購得，請選擇轉為購物金或自行聯繫官方帳號退款。',
      cancelledAt: new Date().toISOString(),
      cancelledBy: currentUser.email,
    };
    const { error } = await supabase.from('orders').update({
      data: updated,
      cancellation_status: isUnpaid ? 'none' : updated.cancellationStatus,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);
    if (error) { window.alert(`取消訂單失敗：${error.message}`); return false; }
    setOrders(prev => prev.map(item => item.id === orderId ? updated : item));
    return true;
  };

  const handleCancellationResolution = async (orderId: string, resolution: 'store_credit' | 'refund_contact'): Promise<boolean> => {
    const { error } = await supabase.rpc('choose_order_cancellation_resolution', { p_order_id: orderId, p_resolution: resolution });
    if (error) { window.alert(error.message); return false; }
    const [ordersResult, walletResult] = await Promise.all([
      supabase.from('orders').select('data,cancellation_status').order('created_at', { ascending: false }),
      supabase.from('wallet_transactions').select('id,owner_email,order_id,amount,transaction_type,description,created_at').order('created_at', { ascending: false }),
    ]);
    if (ordersResult.data) setOrders(ordersResult.data.map(row => ({ ...row.data as Order, cancellationStatus: row.cancellation_status && row.cancellation_status !== 'none' ? row.cancellation_status : row.data.cancellationStatus || 'none' })));
    if (walletResult.data) setWalletTransactions(walletResult.data.map(row => ({ id: row.id, ownerEmail: row.owner_email, orderId: row.order_id || undefined, amount: row.amount, transactionType: row.transaction_type, description: row.description, createdAt: row.created_at })));
    return true;
  };

  const handleMarkRefundCompleted = (orderId: string) => {
    const order = orders.find(item => item.id === orderId);
    if (!order || !ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) return;
    handleUpdateOrderDetails(orderId, {
      cancellationStatus: 'refund_completed',
      refundCompletedAt: new Date().toISOString(),
      cancellationResolvedAt: new Date().toISOString(),
    });
  };

  // Batch Multi-Order Update
  const handleBatchUpdateOrders = (orderIds: string[], updates: Partial<Order>) => {
    setOrders(prev =>
      prev.map(o => {
        if (!orderIds.includes(o.id)) return o;
        const combined = { ...o, ...updates };
        return normalizeOrderPaymentStatus(updates.orderStatus ? withAllCampaignStatuses(combined, updates.orderStatus) : combined);
      })
    );
    const affected = orders.filter(order => orderIds.includes(order.id));
    void Promise.all(affected.map(order => supabase.from('orders').update({
      data: normalizeOrderPaymentStatus(updates.orderStatus
        ? withAllCampaignStatuses({ ...order, ...updates }, updates.orderStatus)
        : { ...order, ...updates }),
      cancellation_status: updates.cancellationStatus || order.cancellationStatus || 'none',
      updated_at: new Date().toISOString(),
    }).eq('id', order.id)));
  };

  // Synchronized Batch & Orders Status Update
  const getStatusTextFromCode = (status: OrderStatus): string => {
    switch (status) {
      case 'order_created': return '官方團務開單，訂單成立中';
      case 'payment_verifying': return '粉絲轉帳核對中，1-2天內完成對帳';
      case 'procuring': return '韓國官方通路採購中，鎖定特典配額';
      case 'ordered': return '韓國官網正式下單成功';
      case 'shipped_kr': return '韓國官方倉庫發貨出庫';
      case 'warehouse': return '抵達韓國集運倉庫裝箱';
      case 'flight_transit': return '國際航班空運飛行在途中';
      case 'taiwan_customs_sorting': return '海關放行，新北理貨中心品檢理貨中';
      case 'domestic_shipping': return '已開立 7-11 賣貨便二補專屬賣場並陸續寄送中';
      default: return '團務圓滿完成';
    }
  };

  const handleUpdateBatchStatus = (batchId: string, newStatus: OrderStatus) => {
    const targetBatch = batches.find(b => b.id === batchId);
    if (!targetBatch) return;

    const belongsToBatch = (order: Order) => targetBatch.campaign
      ? order.items.some(item => item.campaign === targetBatch.campaign && (targetBatch.artist === 'ALL' || item.artist === targetBatch.artist))
        || (order.campaign === targetBatch.campaign && (targetBatch.artist === 'ALL' || order.items.some(item => item.artist === targetBatch.artist)))
        || (!order.items.length && order.campaign === targetBatch.campaign)
      : order.batchCode === targetBatch.batchCode;
    const updateOrderForBatch = (order: Order): Order => {
      if (!belongsToBatch(order) || order.orderStatus === 'cancelled') return order;
      const groups = groupOrderItemsByCampaign(order.items, order.campaign);
      let updated = order;
      if (targetBatch.campaign) {
        const matchingGroups = groups.filter(group => group.campaign === targetBatch.campaign && (targetBatch.artist === 'ALL' || group.artist === targetBatch.artist));
        matchingGroups.forEach(group => {
          updated = withCampaignStatus(updated, group.artist, group.campaign, newStatus);
        });
      } else {
        updated = withAllCampaignStatuses(order, newStatus);
      }
      if (!groups.length) updated = { ...updated, orderStatus: newStatus };
      return normalizeOrderPaymentStatus({
        ...updated,
        paymentStatus: isPaymentConfirmedByOrderStatus(newStatus) ? 'paid' : updated.paymentStatus,
      });
    };

    const statusText = getStatusTextFromCode(newStatus);
    const newEvent = {
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      title: `全團貨態同步推進：${statusText}`,
      description: `團長已更新批次【${targetBatch.batchCode}】狀態，並自動同步推進全團跟團粉絲訂單。`,
      location: '官方團務物流部',
      done: true,
    };

    // 1. Update Batch
    setBatches(prev =>
      prev.map(b => {
        if (b.id !== batchId) return b;
        return {
          ...b,
          statusCode: newStatus,
          statusText,
          lastUpdated: new Date().toISOString().replace('T', ' ').slice(0, 16),
          events: [newEvent, ...b.events]
        };
      })
    );

    // 2. Synchronize all orders belonging to this batch
    setOrders(prev =>
      prev.map(o => {
        return updateOrderForBatch(o);
      })
    );
    const batchOrders = orders.filter(order => belongsToBatch(order) && order.orderStatus !== 'cancelled');
    void Promise.all(batchOrders.map(order => supabase.from('orders').update({ data: updateOrderForBatch(order), updated_at: new Date().toISOString() }).eq('id', order.id)));
  };

  const handleAdvanceBatchStatus = (batchId: string) => {
    const targetBatch = batches.find(b => b.id === batchId);
    if (!targetBatch) return;

    const statusFlow: OrderStatus[] = [
      'order_created',
      'payment_verifying',
      'procuring',
      'ordered',
      'shipped_kr',
      'warehouse',
      'flight_transit',
      'taiwan_customs_sorting',
      'domestic_shipping'
    ];

    const currentIdx = statusFlow.indexOf(targetBatch.statusCode as OrderStatus);
    const nextStatus = currentIdx >= 0 && currentIdx < statusFlow.length - 1
      ? statusFlow[currentIdx + 1]
      : 'domestic_shipping';

    handleUpdateBatchStatus(batchId, nextStatus);
  };

  const handleMarkBatchShippingComplete = (batchId: string, complete: boolean) => {
    if (!currentUser.isLoggedIn || !ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) return;
    setBatches(prev => prev.map(batch => batch.id === batchId ? { ...batch, isShippingComplete: complete } : batch));
  };

  // User Profile Role Switch
  const handleSwitchUserRole = async () => {
    if (!currentUser.isLoggedIn || !ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) return;
    const role = currentUser.role === 'admin' ? 'fan' : 'admin';
    setCurrentUser(prev => ({ ...prev, role }));
  };

  // Add Product
  const handleAddProduct = async (newProduct: Product): Promise<boolean> => {
    const { error } = await supabase.from('products').insert({ id: newProduct.id, data: newProduct, unpublish_at: newProduct.unpublishAt || null, archived: false });
    if (error) return false;
    setProducts(prev => [newProduct, ...prev]);
    return true;
  };

  const handleUpdateProduct = async (updated: Product): Promise<boolean> => {
    const { error } = await supabase.from('products').update({ data: updated, unpublish_at: updated.unpublishAt || null, archived: !!updated.archived }).eq('id', updated.id);
    if (error) return false;
    setProducts(prev => prev.map(product => product.id === updated.id ? updated : product));
    return true;
  };

  const handleArchiveProducts = async (productIds: string[]) => {
    if (!currentUser.isLoggedIn || !ADMIN_EMAILS.includes(currentUser.email.toLowerCase()) || productIds.length === 0) return;
    const { error } = await supabase.from('products').update({ archived: true }).in('id', productIds);
    if (error) { window.alert('下架失敗，請稍後重試。'); return; }
    const selectedIds = new Set(productIds);
    setProducts(prev => prev.map(product => selectedIds.has(product.id) ? { ...product, archived: true } : product));
  };

  const handleReopenProducts = async (productIds: string[]) => {
    if (!currentUser.isLoggedIn || !ADMIN_EMAILS.includes(currentUser.email.toLowerCase()) || productIds.length === 0) return;
    const selected = products.filter(product => productIds.includes(product.id));
    if (selected.length !== productIds.length) return;
    const reopened = selected.map(product => ({ ...product, archived: false, unpublishAt: null, status: 'active' as const }));
    const results = await Promise.all(reopened.map(product =>
      supabase.from('products').update({ data: product, unpublish_at: null, archived: false }).eq('id', product.id)
    ));
    if (results.some(({ error }) => error)) { window.alert('重新上架失敗，請稍後重試。'); return; }
    const reopenedById = new Map(reopened.map(product => [product.id, product]));
    setProducts(prev => prev.map(product => reopenedById.get(product.id) || product));
  };

  const handleDeleteOfflineProducts = async (productIds: string[]) => {
    if (!currentUser.isLoggedIn || !ADMIN_EMAILS.includes(currentUser.email.toLowerCase()) || productIds.length === 0) return;
    const selectedIds = new Set(productIds);
    const selectedProducts = products.filter(product => selectedIds.has(product.id));
    if (selectedProducts.length !== productIds.length || selectedProducts.some(isProductAvailable)) return;
    const { error } = await supabase.from('products').delete().in('id', productIds);
    if (error) { window.alert('刪除失敗，請稍後重試。'); return; }
    setProducts(prev => prev.filter(product => !selectedIds.has(product.id)));
  };

  // Dynamic share metadata based on current page
  const getShareInfo = () => {
    switch (currentPage) {
      case 'products':
        return {
          title: '官方藝人周邊目錄與限定跟團專區 | 追星便利店',
          desc: 'TWICE 10週年棒球外套、CANDYBONG ∞ 手燈與最新回歸特典通路專輯熱烈預購中！100% 官方正品直購。',
          image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop'
        };
      case 'order-status':
        return {
          title: '會員中心即時對帳與進度查詢 | 追星便利店',
          desc: '輸入手機號碼或訂單編號，即時查驗匯款入帳、提交後五碼與超商物流進度。',
          image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&auto=format&fit=crop'
        };
      case 'shipping':
        return {
          title: '國際物流進度與批次出貨看板 | 追星便利店',
          desc: '全程公開透明！即時追蹤韓國提單、EMS 航空班機與台灣海關清關放行時間。',
          image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1200&auto=format&fit=crop'
        };
      case 'admin':
        return {
          title: '追星便利店 團務管理後台工作站',
          desc: '管理目前進行中團務、核對粉絲轉帳後五碼與門市出貨編號。',
          image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop'
        };
      case 'contact':
        return {
          title: '聯絡團長客服與常見問題解答 (FAQ) | 追星便利店',
          desc: '提供 LINE 官方帳號、Threads 社群與客服表單，專人協助對帳與門市變更。',
          image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop'
        };
      default:
        return {
          title: '追星便利店 | 官方藝人周邊集單所',
          desc: '專為 TWICE 與 K-POP 藝人粉絲打造的專業代購品牌。官方正品直購、榜單計入、批次海關透明追蹤與加厚防撞包裝。',
          image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop'
        };
    }
  };

  const shareInfo = getShareInfo();
  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const walletBalance = currentUser.isLoggedIn
    ? walletTransactions
        .filter(transaction => transaction.ownerEmail.toLowerCase() === currentUser.email.toLowerCase())
        .reduce((sum, transaction) => sum + transaction.amount, 0)
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFB] text-slate-900 font-sans">
      {/* Top Sticky Navigation */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenShare={() => setIsShareModalOpen(true)}
        currentUser={currentUser}
        onSwitchUserRole={handleSwitchUserRole}
      />

      {/* Main View Router */}
      <main className="flex-1 pb-12">
        {currentPage === 'home' && (
          <HomePage
            products={products}
            onNavigate={handleNavigate}
            onSelectProduct={(p) => {
              setSelectedProductForModal(p);
              handleNavigate('products');
            }}
            onSearchOrder={(q) => {
              setOrderSearchQuery(q);
              handleNavigate('order-status');
            }}
            onOpenShare={() => setIsShareModalOpen(true)}
          />
        )}

        {currentPage === 'products' && (
          <ProductsPage
            products={products}
            selectedProduct={selectedProductForModal}
            onSelectProduct={setSelectedProductForModal}
            onAddToCart={handleAddToCart}
            onInstantBuy={handleInstantBuy}
            onOpenShare={() => setIsShareModalOpen(true)}
          />
        )}

        {currentPage === 'order-status' && (
          <OrderStatusPage
            orders={orders}
            batches={batches}
            initialSearchQuery={orderSearchQuery}
            onUpdateOrderBankCode={handleUpdateOrderBankCode}
            onOpenShare={() => setIsShareModalOpen(true)}
          />
        )}

        {currentPage === 'shipping' && (
          <ShippingPage
            batches={batches}
            onNavigate={handleNavigate}
            onOpenShare={() => setIsShareModalOpen(true)}
            isPasswordRecovery={isPasswordRecovery}
            onPasswordRecoveryHandled={() => setIsPasswordRecovery(false)}
          />
        )}

        {currentPage === 'admin' && (
          <AdminPage
            products={products}
            orders={orders}
            batches={batches}
            walletTransactions={walletTransactions}
            onNavigate={handleNavigate}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateOrderDetails={handleUpdateOrderDetails}
            onCancelOrder={handleCancelOrderForNoStock}
            onMarkRefundCompleted={handleMarkRefundCompleted}
            onBatchUpdateOrders={handleBatchUpdateOrders}
            onAdvanceBatchStatus={handleAdvanceBatchStatus}
            onMarkBatchShippingComplete={handleMarkBatchShippingComplete}
            onUpdateBatchStatus={handleUpdateBatchStatus}
            onOpenShare={() => setIsShareModalOpen(true)}
            onEditProductGroup={(groupProducts) => { setProductsToEdit(groupProducts); handleNavigate('add-product'); }}
            onArchiveProducts={handleArchiveProducts}
            onReopenProducts={handleReopenProducts}
            onDeleteOfflineProducts={handleDeleteOfflineProducts}
            currentUser={currentUser}
            onSwitchUserRole={handleSwitchUserRole}
          />
        )}

        {currentPage === 'add-product' && (
          <AddProductPage
            onAddProduct={handleAddProduct}
            editingProduct={productsToEdit?.[0] || null}
            editingProducts={productsToEdit || undefined}
            onUpdateProduct={handleUpdateProduct}
            onNavigate={(page) => { if (page !== 'add-product') setProductsToEdit(null); handleNavigate(page); }}
            onOpenShare={() => setIsShareModalOpen(true)}
            currentUser={currentUser}
            onSwitchUserRole={handleSwitchUserRole}
          />
        )}

        {currentPage === 'login' && (
          <LoginPage
            currentUser={currentUser}
            orders={orders}
            batches={batches}
            walletTransactions={walletTransactions}
            walletBalance={walletBalance}
            onChooseCancellationResolution={handleCancellationResolution}
            onSetUser={setCurrentUser}
            onNavigate={handleNavigate}
            onOpenShare={() => setIsShareModalOpen(true)}
            isPasswordRecovery={isPasswordRecovery}
            onPasswordRecoveryHandled={() => setIsPasswordRecovery(false)}
          />
        )}

        {currentPage === 'contact' && (
          <ContactPage
            onNavigate={handleNavigate}
            onOpenShare={() => setIsShareModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenShare={() => setIsShareModalOpen(true)}
        currentUser={currentUser}
      />

      {/* Cart Drawer / Slide-out Checkout */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onCreateOrder={handleCreateOrder}
        onNavigateToOrder={handleNavigateToOrder}
        onNavigateToLogin={() => { setIsCartOpen(false); handleNavigate('login'); }}
        currentUser={currentUser}
        existingOrders={orders}
        walletBalance={walletBalance}
      />

      {/* Social Share Preview Modal (Threads & Facebook) */}
      <SocialShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        pageTitle={shareInfo.title}
        pageDescription={shareInfo.desc}
        imageUrl={shareInfo.image}
      />
    </div>
  );
}
