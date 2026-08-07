import React from "react";
import { useAgentStore } from "../store/useAgentStore.js";
import { X, Check, Sparkles } from "lucide-react";

export const ReplacementModal: React.FC = () => {
  const { replacementModal, closeReplacementModal, replaceItem, getProduct } = useAgentStore();

  if (!replacementModal.isOpen || !replacementModal.targetItem) return null;

  const currentProduct = getProduct(replacementModal.targetItem?.productId);
  if (!currentProduct) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#0E0E0E] rounded-[28px] border border-white/10 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Select Alternative</h3>
              <p className="text-xs text-white/50">
                Swapping <span className="text-white font-medium">{currentProduct.name}</span> (₹{currentProduct.price.toLocaleString()})
              </p>
            </div>
          </div>
          <button
            onClick={closeReplacementModal}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alternatives List */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {replacementModal.alternatives.length === 0 ? (
            <div className="text-center py-12 text-white/40 text-xs">
              No direct alternatives found in this catalog query.
            </div>
          ) : (
            replacementModal.alternatives.map((alt) => {
              const priceDiff = alt.price - currentProduct.price;

              return (
                <div
                  key={alt.id}
                  className="liquid-glass-card rounded-[20px] p-5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/5 shrink-0 flex items-center justify-center p-1">
                      <img
                        src={alt.image}
                        alt={alt.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">
                        {alt.name}
                      </h4>
                      {alt.description && <p className="text-xs text-white/40 line-clamp-1 mt-0.5">{alt.description}</p>}
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5 shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-white text-base font-mono">₹{alt.price.toLocaleString()}</div>
                      <div className="text-[10px] text-white/40 font-mono">
                        {priceDiff < 0 ? `-₹${Math.abs(priceDiff)}` : priceDiff > 0 ? `+₹${priceDiff}` : "Same Price"}
                      </div>
                    </div>

                    <button
                      onClick={() => replaceItem(currentProduct.id, alt)}
                      className="px-4 py-2 rounded-full bg-white text-black hover:bg-white/90 font-bold text-xs transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Swap
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
          <span>Subtotal and plan will update automatically.</span>
          <button
            onClick={closeReplacementModal}
            className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
