import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Check, AlertCircle, Sparkles } from 'lucide-react';
import { CartItem, Order, OrderItem, UserProfile } from '../types';
import { BRAND_CONFIG } from '../data/mockData';
import { generateOrderId, groupOrderItemsByCampaign, cleanPobDisplay } from '../utils/orderUtils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onCreateOrders: (orders: Order[], walletCreditApplied: number) => Promise<Order[] | null>;
  onNavigateToOrder: (orderId: string) => void;
  onNavigateToLogin: () => void;
  existingOrders?: Order[];
  currentUser?: UserProfile;
  walletBalance?: number;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCreateOrders,
  onNavigateToOrder,
  onNavigateToLogin,
  existingOrders = [],
  currentUser,
  walletBalance = 0,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');

  // Form Fields - 自動帶入會員資料 (Requirement 8)
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [socialNickname, setSocialNickname] = useState(currentUser?.socialNickname || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  
  // Requirement 3: 預設志願順序選項留「不挑成員」及「自訂」
  const [pobChoice, setPobChoice] = useState<'不挑成員' | '自訂'>('不挑成員');
  const [customPobNotes, setCustomPobNotes] = useState('');
  
  const [paymentChoice, setPaymentChoice] = useState<'transfer' | 'cash_on_delivery'>('transfer');
  const [bankLastFive, setBankLastFive] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdOrders, setCreatedOrders] = useState<Order[]>([]);
  const [useWalletCredit, setUseWalletCredit] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Sync user profile data when opening or when currentUser changes
  useEffect(() => {
    if (currentUser) {
      if (!customerName) setCustomerName(currentUser.name || '');
      if (!socialNickname) setSocialNickname(currentUser.socialNickname || '');
      if (!phone) setPhone(currentUser.phone || '');
      if (!email) setEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Requirement 6: 確保重新開啟購物車或加選商品時，不卡在 success 頁面，正常顯示購物車品項
  useEffect(() => {
    if (isOpen) {
      if (cartItems.length > 0 && step === 'success') {
        setStep('cart');
      }
    }
  }, [isOpen, cartItems.length]);

  if (!isOpen) return null;

  // Calculations: 下單介面不需運費，只有全額付清 (Requirement 3)
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shippingFee = 0; // 不需運費
  const walletCreditApplied = useWalletCredit ? Math.min(Math.max(walletBalance, 0), subtotal) : 0;
  const finalTotal = subtotal - walletCreditApplied;

  const currentPaymentAccount = cartItems[0]?.product.paymentMethod || '全支付(389)11016053741860';

  const handleStartCheckout = () => {
    if (cartItems.length === 0) return;
    if (!currentUser?.isLoggedIn) {
      onClose();
      onNavigateToLogin();
      return;
    }
    setStep('checkout');
  };

  const handleCloseAndReset = () => {
    setStep('cart');
    setCreatedOrders([]);
    onClose();
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentUser?.isLoggedIn) {
      setErrorMessage('請先登入會員，才能建立可同步的訂單並使用購物金。');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('請填寫訂購人姓名 (與證件相符以便超商核對)');
      return;
    }
    if (!socialNickname.trim()) {
      setErrorMessage('請填寫您的社群暱稱 (Threads / IG / LINE 暱稱以便核對名單與排卡)');
      return;
    }
    if (!phone.trim() || phone.length < 9) {
      setErrorMessage('請填寫正確的手機號碼 (接收出貨與二補通知)');
      return;
    }
    if (pobChoice === '自訂' && !customPobNotes.trim()) {
      setErrorMessage('您已選擇「自訂」特典順位，請在下方備註欄填寫您的志願順序');
      return;
    }
    if (!agreedTerms) {
      setErrorMessage('請閱讀並勾選同意跟團配送重要守則後再送出表單');
      return;
    }

    // Requirement 4: 團務後台特典小卡排卡順位 / 備註志願不顯示「自訂特典排卡順位 (請在下方備註詳細說明)」 只顯示備註內容
    const finalPobPref = pobChoice === '自訂' 
      ? customPobNotes.trim() 
      : '不挑成員';

    const orderItems: OrderItem[] = cartItems.map(item => ({
      productId: item.product.id,
      title: item.product.title,
      artist: item.product.artist,
      campaign: item.product.campaign || '10th_Anniversary',
      selectedMember: item.selectedMember,
      pobPreference: finalPobPref,
      quantity: item.quantity,
      price: item.product.price,
      imageUrl: item.product.imageUrl
    }));

    const groupedOrderItems = groupOrderItemsByCampaign(orderItems, 'Official_Campaign');
    const createdAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    let walletRemaining = walletCreditApplied;
    const reservedOrders = [...existingOrders];
    const newOrders: Order[] = groupedOrderItems.map(group => {
      const groupSubtotal = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const groupWalletCredit = Math.min(walletRemaining, groupSubtotal);
      walletRemaining -= groupWalletCredit;
      const newOrder: Order = {
        id: generateOrderId(group.artist, reservedOrders),
        createdAt,
        customerName: customerName.trim(),
        socialNickname: socialNickname.trim(),
        phone: phone.trim(),
        email: currentUser.email,
        items: group.items,
        subtotal: groupSubtotal,
        shippingFee: 0,
        totalAmount: groupSubtotal - groupWalletCredit,
        isDepositOnly: false,
        depositAmountPaid: groupSubtotal - groupWalletCredit,
        remainingAmount: 0,
        paymentMethod: paymentChoice === 'transfer' ? 'atm' : 'cash_on_delivery',
        paymentChoice,
        paymentStatus: paymentChoice === 'transfer' && bankLastFive ? 'verifying' : 'unpaid',
        bankLastFive: paymentChoice === 'transfer' ? bankLastFive.trim() || undefined : undefined,
        shippingMethod: '7-11',
        orderStatus: paymentChoice === 'transfer' && bankLastFive ? 'payment_verifying' : 'order_created',
        batchCode: `2409-${group.artist.replace(/[^a-z0-9]/gi, '').toUpperCase()}-A`,
        campaign: group.campaign,
        notes: orderNotes.trim(),
        pobPreference: finalPobPref,
        secondPaymentAmount: 0,
        paymentAccount: paymentChoice === 'transfer' ? currentPaymentAccount : undefined,
        walletCreditApplied: groupWalletCredit,
      };
      reservedOrders.push(newOrder);
      return newOrder;
    });

    setIsSubmittingOrder(true);
    const savedOrders = await onCreateOrders(newOrders, walletCreditApplied);
    setIsSubmittingOrder(false);
    if (!savedOrders?.length) {
      setErrorMessage('訂單尚未成功儲存，請稍後再試；購物金尚未扣除。');
      return;
    }
    setCreatedOrders(savedOrders);
    onClearCart();
    setStep('success');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {step === 'cart' && '跟團購物車 (集單清單)'}
                {step === 'checkout' && '填寫收件與跟團結帳資訊'}
                {step === 'success' && '團務訂單已成功建立！'}
              </h3>
              <p className="text-xs text-slate-500">
                {step === 'cart' && `共 ${cartItems.length} 項官方周邊商品（商品金額全額付清）`}
                {step === 'checkout' && '已自動帶入會員資料，請選擇轉帳或貨付'}
                {step === 'success' && '請保存專屬訂單編號，可於會員中心追蹤'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseAndReset}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: CART ITEMS LIST */}
          {step === 'cart' && (
            <>
              {cartItems.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-slate-800">目前購物車是空的</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      商品下架前皆可重複下單！去周邊專區挑選官方手燈、專輯或限定外套吧！
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseAndReset}
                    className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    立即瀏覽周邊 →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Items list */}
                  <div className="divide-y divide-slate-100">
                    {cartItems.map(item => (
                      <div key={item.cartItemId} className="py-4 flex gap-4 items-start">
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.title}
                          className="w-20 h-20 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            {item.product.artist}
                          </span>
                          <h4 className="text-sm font-semibold text-slate-900 leading-snug mt-1 line-clamp-2">
                            {item.product.title}
                          </h4>
                          {item.selectedMember && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              規格 / 成員：<strong className="text-slate-800">{item.selectedMember}</strong>
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(item.cartItemId, -1)}
                                className="p-1 hover:bg-slate-100 text-slate-600"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-3 text-xs font-semibold text-slate-900 font-mono">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(item.cartItemId, 1)}
                                className="p-1 hover:bg-slate-100 text-slate-600"
                                disabled={Boolean(item.product.purchaseLimit && cartItems.filter(cartItem => cartItem.product.id === item.product.id).reduce((sum, cartItem) => sum + cartItem.quantity, 0) >= item.product.purchaseLimit)}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-slate-900 font-mono">
                                NT$ {(item.product.price * item.quantity).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.cartItemId)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                          title="移除商品"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Payment and shipping notice */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>跟團付款方式：全額付清</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      跟團時先付清商品金額；周邊抵台理貨完成後，會開立「7-11 賣貨便」專屬賣場另收運費並安排超商取件。
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2: CHECKOUT FORM */}
          {step === 'checkout' && (
            <form onSubmit={handleSubmitOrder} className="space-y-5">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {!currentUser?.isLoggedIn && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                  <span>請先登入會員，確保訂單、取消通知和購物金能同步保存。</span>
                  <button type="button" onClick={onNavigateToLogin} className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold">前往登入</button>
                </div>
              )}

              {/* 1. Recipient Information (會員自動帶入) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    1. 訂購與收件人資料 (已自動帶入會員資料)
                  </h4>
                  {currentUser && (
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> 會員資料已連動
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">
                      真實姓名 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="例：林佩儀 (超商取件核對證件)"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">
                      社群暱稱 (Threads / IG / LINE) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="例：@once_mina97 或佩儀"
                      value={socialNickname}
                      onChange={e => setSocialNickname(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">
                      手機號碼 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="例：0912345678 (取件簡訊通知)"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">電子郵件 (選填，寄送訂單確認信)</label>
                    <input
                      type="email"
                      placeholder="once.fan@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-rose-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useWalletCredit}
                      disabled={walletBalance <= 0}
                      onChange={e => setUseWalletCredit(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    使用購物金折抵
                  </label>
                  <span className="font-mono font-bold text-amber-800">可用 NT$ {walletBalance.toLocaleString()}</span>
                </div>
                {walletCreditApplied > 0 && <p className="text-emerald-700">本次折抵 NT$ {walletCreditApplied.toLocaleString()}</p>}
                {walletBalance <= 0 && <p className="text-[11px] text-slate-500">目前沒有可用購物金。</p>}
              </div>

              {/* 2. POB Member Preference: 預設志願順序選項留「不挑成員」及「自訂」 (Requirement 3 & 4) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    2. 特典小卡排卡順位 / 備註志願
                  </h4>
                  <span className="text-[11px] text-rose-600 font-semibold">排卡依表單順序出貨</span>
                </div>

                <div className="space-y-2 bg-rose-50/40 p-4 rounded-xl border border-rose-200">
                  <label className="text-xs text-slate-700 block font-bold mb-1">
                    請選單選擇預設志願順序：
                  </label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPobChoice('不挑成員')}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        pobChoice === '不挑成員'
                          ? 'border-rose-500 bg-white text-rose-600 shadow-xs'
                          : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>不挑成員</span>
                        {pobChoice === '不挑成員' && <Check className="w-3.5 h-3.5 text-rose-600" />}
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal block mt-0.5">隨機發放 / 全本命</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPobChoice('自訂')}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        pobChoice === '自訂'
                          ? 'border-rose-500 bg-white text-rose-600 shadow-xs'
                          : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>自訂</span>
                        {pobChoice === '自訂' && <Check className="w-3.5 h-3.5 text-rose-600" />}
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal block mt-0.5">自填志願順序</span>
                    </button>
                  </div>

                  {/* 自訂備註欄位 - 僅在自訂時顯示或填寫，後台只顯示備註內容 (Requirement 4) */}
                  {pobChoice === '自訂' && (
                    <div className="pt-2 animate-in fade-in">
                      <label className="text-[11px] text-slate-700 font-bold block mb-1">
                        備註自訂特典排卡順序或指定成員 (請詳述志願)：
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="例：子瑜 > SANA > MOMO > MINA (若缺卡接受調配)"
                        value={customPobNotes}
                        onChange={e => setCustomPobNotes(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 bg-white focus:outline-rose-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        ※ 後台排卡順位將直接顯示此處備註內容。
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Payment Method */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  3. 付款方式
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPaymentChoice('transfer')} className={`p-4 rounded-2xl border text-left transition-colors ${paymentChoice === 'transfer' ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-200' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <span className="block text-sm font-bold text-slate-900">轉帳</span>
                    <span className="block mt-1 text-xs text-slate-500">匯款帳號會顯示在會員中心的訂單內</span>
                  </button>
                  <button type="button" onClick={() => setPaymentChoice('cash_on_delivery')} className={`p-4 rounded-2xl border text-left transition-colors ${paymentChoice === 'cash_on_delivery' ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-200' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <span className="block text-sm font-bold text-slate-900">貨付</span>
                    <span className="block mt-1 text-xs text-slate-500">請敲官賴確認可貨付再選</span>
                  </button>
                </div>
                {paymentChoice === 'transfer' ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    匯款帳號不會顯示在此頁；建立訂單後可於會員中心查看，後台完成對帳後會自動隱藏。
                    <label className="block mt-3 text-slate-700 font-medium">
                      已轉帳可填寫帳號後五碼或轉帳人姓名（選填）
                      <input type="text" maxLength={10} placeholder="例：48291 或佩儀" value={bankLastFive} onChange={e => setBankLastFive(e.target.value)} className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono" />
                    </label>
                  </div>
                ) : (
                  <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">貨付訂單不會顯示匯款帳號，也不需要填寫匯款後五碼。</p>
                )}
              </div>

              {/* 4. Order Notes */}
              <div>
                <label className="text-xs text-slate-600 block mb-1">跟團備註留言 (選填)</label>
                <textarea
                  rows={2}
                  placeholder="有任何其他特殊需求或疑問皆可在此留言"
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-rose-500"
                />
              </div>

              {/* 5. Terms & Notice Box: 跟團配送重要守則 (Requirement 7) */}
              <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl text-xs space-y-2.5 border border-slate-800">
                <div className="font-bold flex items-center gap-1.5 text-amber-400">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>跟團配送重要守則 (同意以下事項再填單)</span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-1 leading-relaxed border-t border-slate-800 pt-2 font-sans">
                  <p>•已成立訂單不提供一般取消；若官方未能購得商品，團長會通知您選擇轉購物金或聯繫官方帳號退款。</p>
                  <p>•購物金可於下次消費折抵；選擇退款請自行聯繫官方帳號辦理。</p>
                  <p>•先匯總金額，二補開賣貨便</p>
                  <p>•默認廠損及運輸瑕</p>
                  <p>•物流不保證速度，請耐心等候</p>
                  <p>•海外下單，風險須共同承擔，若 國內和國外 寄送過程中不慎包裹遺失、損， 僅以物流方提供之賠償金額按比例補償</p>
                  <p>•商品到貨後會通知買家，若通知後30日內無法聯絡或未完成賣場下單，本賣場將無法繼續保管商品，並保留轉售權利，日後若重新聯絡，將扣除運費與處理成本後退款</p>
                  <p>•開箱請錄影保護雙方權益，無開箱影片恕無法處理</p>
                  <p className="text-amber-300 font-bold">•🈲第三方匯款，請勿外流帳號*</p>
                  <p className="font-bold text-white pt-1">同意以上事項再填單</p>
                </div>

                <label className="flex items-center gap-2 pt-1 border-t border-slate-800 text-xs text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={e => setAgreedTerms(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span>我已完整閱讀並同意上述「跟團配送重要守則」</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  ← 返回購物車
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder || !currentUser?.isLoggedIn}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span>{isSubmittingOrder ? '訂單儲存中…' : `確認送出團務訂單 (應付 NT$ ${finalTotal.toLocaleString()})`}</span>
                  {!isSubmittingOrder && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS STATE (Requirement 6: 可繼續選購其他商品) */}
          {step === 'success' && createdOrders.length > 0 && (
            <div className="py-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900">恭喜！訂單已成功建立</h4>
                <p className="text-xs text-slate-500 mt-1">
                  團長已收到您的跟團資料，我們將在官方截單後第一時間進行採購！
                </p>
              </div>

              {/* Order summary card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs max-w-md mx-auto">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500">專屬訂單編號：</span>
                  <strong className="font-mono text-sm text-rose-600">{createdOrders.length} 筆</strong>
                </div>
                {createdOrders.map(order => <div key={order.id} className="flex justify-between items-center gap-3 py-1 border-b border-slate-200 last:border-0">
                  <span className="text-slate-700">{order.items[0]?.artist}・{order.campaign}</span>
                  <strong className="font-mono text-rose-600">{order.id} · NT$ {order.totalAmount.toLocaleString()}</strong>
                </div>)}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">訂購人：</span>
                  <span>{createdOrders[0].customerName} ({createdOrders[0].phone})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">社群暱稱：</span>
                  <strong className="text-rose-600">{createdOrders[0].socialNickname}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">特典順位 / 備註：</span>
                  <span className="font-medium text-slate-800">{createdOrders[0].pobPreference}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-500">全額付款金額：</span>
                  <strong className="text-slate-900 font-mono text-sm">NT$ {createdOrders.reduce((sum, order) => sum + order.totalAmount, 0).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-500 text-[11px]">
                  <span>付款方式：</span>
                  <span>{createdOrders[0].paymentChoice === 'cash_on_delivery' ? '貨付' : '轉帳'}</span>
                </div>
              </div>

              {/* Actions - Requirement 6: 可立即繼續選購其他商品 */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleCloseAndReset();
                    onNavigateToOrder(createdOrders[0].id);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
                >
                  前往會員中心查詢訂單動態 →
                </button>
                <button
                  type="button"
                  onClick={handleCloseAndReset}
                  className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium"
                >
                  繼續選購其他周邊商品
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer for Cart Step */}
        {step === 'cart' && cartItems.length > 0 && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/90 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>商品小計 ({cartItems.reduce((s, i) => s + i.quantity, 0)} 件)</span>
                <span className="font-mono font-medium">NT$ {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>本島運費</span>
                <span>抵台後另收</span>
              </div>
              <div className="flex justify-between text-slate-900 text-sm font-bold pt-2 border-t border-slate-200">
                <span>全額付清總計</span>
                <span className="font-mono text-base text-rose-600">
                  NT$ {finalTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              id="start-checkout-btn"
              onClick={handleStartCheckout}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-sm font-bold shadow-md shadow-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>前往填寫收件資料與結帳</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
