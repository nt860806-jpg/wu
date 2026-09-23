import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Menu, 
  X, 
  Share2, 
  User, 
  Sparkles, 
  Package, 
  Truck, 
  PhoneCall, 
  ShieldCheck, 
  Layers,
  ChevronDown
} from 'lucide-react';
import { ActivePage, UserProfile } from '../types';
import { BRAND_CONFIG } from '../data/mockData';

interface NavbarProps {
  currentPage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenShare: () => void;
  currentUser: UserProfile;
  onSwitchUserRole: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  cartCount,
  onOpenCart,
  onOpenShare,
  currentUser,
  onSwitchUserRole
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks: { page: ActivePage; label: string; badge?: string }[] = [
    { page: 'home', label: '首頁' },
    { page: 'products', label: '周邊介紹', badge: '熱門集單' },
    { page: 'login', label: '會員中心' },
    { page: 'contact', label: '聯絡方式' },
    ...(currentUser.role === 'admin' ? [{ page: 'admin' as ActivePage, label: '團務後台', badge: '管理員' }] : []),
  ];

  const handleLinkClick = (page: ActivePage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand Logo */}
          <div 
            onClick={() => handleLinkClick('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-rose-600 to-amber-500 flex items-center justify-center text-white font-black text-sm tracking-tight shadow-md shadow-rose-200 group-hover:scale-105 transition-transform">
              追星
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 group-hover:text-rose-600 transition-colors">
                  追星便利店
                </span>
                <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200/60 hidden sm:inline-block">
                  官方藝人集單所
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block tracking-wide">
                TWICE & K-POP 藝人官方周邊專屬代購
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map(({ page, label, badge }) => {
              const isActive = currentPage === page;
              return (
                <button
                  key={page}
                  type="button"
                  id={`nav-link-${page}`}
                  onClick={() => handleLinkClick(page)}
                  className={`relative px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                    isActive
                      ? 'text-rose-600 bg-rose-50/80 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span>{label}</span>
                  {badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive 
                        ? 'bg-rose-200/80 text-rose-800' 
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Social Share Modal Trigger */}
            <button
              type="button"
              id="navbar-share-btn"
              onClick={onOpenShare}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="社群分享預覽 (Threads/FB)"
            >
              <Share2 className="w-4 h-4 text-rose-500" />
              <span className="hidden md:inline">社群預覽</span>
            </button>

            {/* Shopping Cart Button */}
            <button
              type="button"
              id="navbar-cart-btn"
              onClick={onOpenCart}
              className="relative p-2.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium flex items-center gap-2 shadow-xs transition-colors"
              title="查看購物車"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">購物車</span>
              {cartCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold bg-rose-500 text-white rounded-full">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Profile / Role Switch */}
            <div className="relative flex items-center">
              <button
                type="button"
                id="user-profile-btn"
                onClick={() => onNavigate('login')}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-xs text-slate-700"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="hidden xl:block text-left">
                  <div className="font-semibold text-slate-900 leading-tight text-xs truncate max-w-[100px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {currentUser.role === 'admin' ? '⚡ 團務管理員' : 'ONCE 會員'}
                  </div>
                </div>
              </button>
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="開啟選單"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">{currentUser.name}</p>
                <p className="text-xs text-slate-500">{currentUser.role === 'admin' ? '最高權限團長' : 'ONCE 認證粉絲'}</p>
              </div>
            </div>
            {currentUser.isLoggedIn && (
              <button
                type="button"
                onClick={onSwitchUserRole}
                className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium hover:bg-slate-200"
              >
                切換成 {currentUser.role === 'admin' ? '一般粉絲' : '團長後台'}
              </button>
            )}
          </div>

          {navLinks.map(({ page, label, badge }) => (
            <button
              key={page}
              type="button"
              onClick={() => handleLinkClick(page)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-colors ${
                currentPage === page
                  ? 'bg-rose-50 text-rose-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{label}</span>
              {badge && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">
                  {badge}
                </span>
              )}
            </button>
          ))}

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => {
                onOpenShare();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-700 bg-slate-50 rounded-xl border border-slate-200"
            >
              <Share2 className="w-4 h-4 text-rose-500" />
              <span>社群分享預覽 (Threads / FB)</span>
            </button>

            <button
              type="button"
              onClick={() => handleLinkClick('login')}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-white bg-slate-900 rounded-xl"
            >
              <User className="w-4 h-4" />
              <span>會員中心 / 登入切換</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
