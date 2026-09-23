import React, { useEffect } from 'react';
import { ChevronRight, Sparkles, Share2 } from 'lucide-react';
import { BRAND_CONFIG } from '../data/mockData';

interface PageHeaderProps {
  title: string;
  description?: string;
  tag?: string;
  actionText?: string;
  onActionClick?: () => void;
  onOpenShareModal?: () => void;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description = '',
  tag,
  actionText,
  onActionClick,
  onOpenShareModal,
  children
}) => {
  // Synchronize document.title and meta description for full SEO compliance
  useEffect(() => {
    document.title = `${title} | ${BRAND_CONFIG.shortName} 官方藝人周邊集單所`;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description || `${title} - JYP 藝人官方周邊跟團與商品選購`);

    // Also update og:title & og:description
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${title} | ${BRAND_CONFIG.shortName}`);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description || `${title} - JYP 藝人官方周邊跟團與商品選購`);
  }, [title, description]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-rose-50/50 via-white to-[#FBFBFB] border-b border-rose-100/60 pt-8 pb-10 sm:pt-12 sm:pb-14">
      {/* Subtle decorative background glow */}
      <div className="absolute top-0 right-1/4 -z-10 w-96 h-96 bg-rose-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 -z-10 w-80 h-80 bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-3xl">
            {/* Breadcrumb / Tag */}
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-rose-600 mb-3 tracking-wide">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-100/70 text-rose-800 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                {tag || '追星便利店 OFFICIAL ARCHIVE'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">{title}</span>
            </div>

            {/* Page Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              {title}
            </h1>

            {/* Page Description (Only render if provided) */}
            {description ? (
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                {description}
              </p>
            ) : null}
          </div>

          {/* Action buttons & Share CTA */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onOpenShareModal && (
              <button
                type="button"
                id="header-share-btn"
                onClick={onOpenShareModal}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
                title="預覽社群分享卡片 (Threads / FB)"
              >
                <Share2 className="w-4 h-4 text-rose-500" />
                <span>社群分享預覽</span>
              </button>
            )}

            {actionText && onActionClick && (
              <button
                type="button"
                id="header-cta-btn"
                onClick={onActionClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-sm shadow-rose-200 active:scale-[0.98] transition-all"
              >
                {actionText}
              </button>
            )}
          </div>
        </div>

        {children && <div className="mt-6 sm:mt-8">{children}</div>}
      </div>
    </section>
  );
};
