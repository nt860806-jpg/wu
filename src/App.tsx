import React, { useState, useEffect } from 'react';
import { ActivePage, Product, Order, ShippingBatch, CartItem, UserProfile, OrderStatus } from './types';
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
import { supabase, ADMIN_EMAILS } from './lib/supabase';

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
      setCurrentUser({ ...base, id: session.user.id, email, name: email.split('@')[0], role, isLoggedIn: true });
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Modals & Search Queries
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
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

  useEffect(() => {
    localStorage.setItem('jyp_select_orders', JSON.stringify(orders));
  }, [orders]);

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
      const existingIdx = prev.findIndex(
        item => item.product.id === product.id && item.selectedMember === member
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += qty;
        return updated;
      }
      return [
        ...prev,
        {
          cartItemId: `${product.id}-${member || 'default'}-${Date.now()}`,
          product,
          selectedMember: member,
          quantity: qty,
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
          const newQty = item.quantity + delta;
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
  const handleCreateOrder = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
    setCurrentUser(prev => ({
      ...prev,
      accumulatedOrders: (prev.accumulatedOrders || 0) + 1,
    }));
  };

  const handleNavigateToOrder = (orderId: string) => {
    setOrderSearchQuery(orderId);
    handleNavigate('order-status');
  };

  const handleUpdateOrderBankCode = (orderId: string, bankLastFive: string) => {
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? { ...o, bankLastFive, orderStatus: 'paid_verifying' }
          : o
      )
    );
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus, trackingNumber?: string) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            orderStatus: status,
            trackingNumber: trackingNumber || o.trackingNumber,
            paymentStatus: status === 'confirmed' || status === 'shipped' || status === 'completed' || status === 'domestic_shipping' ? 'paid' : o.paymentStatus
          };
        }
        return o;
      })
    );
  };

  const handleUpdateOrderDetails = (orderId: string, updates: Partial<Order>) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, ...updates } : o))
    );
  };

  // Batch Multi-Order Update
  const handleBatchUpdateOrders = (orderIds: string[], updates: Partial<Order>) => {
    setOrders(prev =>
      prev.map(o => (orderIds.includes(o.id) ? { ...o, ...updates } : o))
    );
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
        if (o.batchCode === targetBatch.batchCode) {
          return {
            ...o,
            orderStatus: newStatus,
            paymentStatus: (newStatus === 'domestic_shipping' || newStatus === 'taiwan_customs_sorting' || newStatus === 'flight_transit') ? 'paid' : o.paymentStatus
          };
        }
        return o;
      })
    );
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

  const handleArchiveProduct = async (productId: string) => {
    const { error } = await supabase.from('products').update({ archived: true }).eq('id', productId);
    if (error) { window.alert('下架失敗，請稍後重試。'); return; }
    setProducts(prev => prev.map(product => product.id === productId ? { ...product, archived: true } : product));
  };

  const handleReopenProduct = async (productId: string) => {
    const product = products.find(item => item.id === productId);
    if (!product) return;
    const reopened = { ...product, archived: false, unpublishAt: null, status: 'active' as const };
    const { error } = await supabase.from('products').update({ data: reopened, unpublish_at: null, archived: false }).eq('id', productId);
    if (error) { window.alert('重新上架失敗，請稍後重試。'); return; }
    setProducts(prev => prev.map(item => item.id === productId ? reopened : item));
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
            onNavigate={handleNavigate}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateOrderDetails={handleUpdateOrderDetails}
            onBatchUpdateOrders={handleBatchUpdateOrders}
            onAdvanceBatchStatus={handleAdvanceBatchStatus}
            onUpdateBatchStatus={handleUpdateBatchStatus}
            onOpenShare={() => setIsShareModalOpen(true)}
            onEditProduct={(product) => { setProductToEdit(product); handleNavigate('add-product'); }}
            onArchiveProduct={handleArchiveProduct}
            onReopenProduct={handleReopenProduct}
            currentUser={currentUser}
            onSwitchUserRole={handleSwitchUserRole}
          />
        )}

        {currentPage === 'add-product' && (
          <AddProductPage
            onAddProduct={handleAddProduct}
            editingProduct={productToEdit}
            onUpdateProduct={handleUpdateProduct}
            onNavigate={handleNavigate}
            onOpenShare={() => setIsShareModalOpen(true)}
            currentUser={currentUser}
            onSwitchUserRole={handleSwitchUserRole}
          />
        )}

        {currentPage === 'login' && (
          <LoginPage
            currentUser={currentUser}
            orders={orders}
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
