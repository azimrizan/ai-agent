import React from "react";
import { useAgentStore } from "../store/useAgentStore.js";
import { X, Check, ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import { MOCK_PRODUCTS } from "../data/mockProducts.js";

export const ReplacementModal: React.FC = () => {
  const { replacementModal, closeReplacementModal, replaceItem } = useAgentStore();

  if (!replacementModal.isOpen || !replacementModal.targetItem) return null;

  const currentProduct = MOCK_PRODUCTS.find((p) => p.id === replacementModal.targetItem?.productId);
  if (!currentProduct) return null;

  const currentTitle = currentProduct.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/95 rounded-2xl border border-stone-200/80 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Select AI Alternative or Swap</h3>
              <p className="text-xs text-stone-600">
                Replacing <span className="text-purple-600 font-semibold">{currentTitle}</span> (₹{currentProduct.price})
              </p>
            </div>
          </div>
          <button
            onClick={closeReplacementModal}
            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alternatives List */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3">
          {replacementModal.alternatives.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-sm">
              No direct alternatives found in this exact category. Try adjusting category filters.
            </div>
          ) : (
            replacementModal.alternatives.map((alt) => {
              const priceDiff = alt.price - currentProduct.price;
              const isCheaper = priceDiff < 0;
              const altTitle = alt.name;
              const altCategory = alt.category || alt.subcategory || "Product";

              return (
                <div
                  key={alt.id}
                  className="bg-stone-50/80 rounded-xl border border-stone-200/80 hover:border-purple-400/50 p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group shadow-xs hover:shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={alt.image}
                      alt={altTitle}
                      className="w-14 h-14 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-200"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                          {altCategory}
                        </span>
                        {isCheaper ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1 border border-emerald-200">
                            <ArrowDownRight className="w-3 h-3" /> Save ₹{Math.abs(priceDiff)}
                          </span>
                        ) : priceDiff > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 flex items-center gap-1 border border-sky-200">
                            <ArrowUpRight className="w-3 h-3" /> Premium (+₹{priceDiff})
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                            Similar Price
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-stone-900 text-sm group-hover:text-purple-600 transition-colors truncate">
                        {altTitle}
                      </h4>
                      {alt.description && <p className="text-xs text-stone-600 line-clamp-1">{alt.description}</p>}
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-200/80 shrink-0">
                    <div className="text-right">
                      <div className="font-black text-stone-900 text-base font-mono">₹{alt.price.toLocaleString()}</div>
                      <div className="text-[10px] text-stone-500">In Stock</div>
                    </div>
                    <button
                      onClick={() => replaceItem(currentProduct.id, alt)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Swap Now
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200/80 bg-stone-50/80 flex items-center justify-between text-xs text-stone-600">
          <span>Replacing updates your shopping plan & subtotal instantly.</span>
          <button
            onClick={closeReplacementModal}
            className="px-4 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors font-medium border border-stone-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
