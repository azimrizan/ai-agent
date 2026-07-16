import React from "react";
import type { Product } from "../types/product.js";
import type { ShoppingListItem } from "../types/project.js";
import { useAgentStore } from "../store/useAgentStore.js";
import { Plus, Minus, Trash2, CheckCircle2, ShieldCheck, RefreshCw } from "lucide-react";

interface ProductCardProps {
  item: ShoppingListItem;
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, product }) => {
  const { updateQuantity, removeItem, openReplacementModal } = useAgentStore();

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "essential":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "recommended":
        return "bg-violet-500/10 text-violet-600 border-violet-500/20";
      default:
        return "bg-stone-100 text-stone-600 border-stone-200";
    }
  };

  return (
    <div className="group relative bg-white/85 hover:bg-white rounded-2xl border border-stone-200/80 hover:border-purple-400/50 p-4 transition-all duration-300 shadow-sm hover:shadow-lg flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      {/* Product Image */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-stone-50 shrink-0 border border-stone-200 group-hover:scale-102 transition-transform duration-300">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Priority Badge */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-white/90 backdrop-blur-md text-[9px] font-bold uppercase tracking-wider text-stone-800 border border-stone-200 shadow-xs">
          {item.priority}
        </div>

        {product.stockStatus === "in_stock" ? (
          <div className="absolute bottom-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm" title="In Stock">
            <CheckCircle2 className="w-3 h-3" />
          </div>
        ) : (
          <div className="absolute bottom-1.5 right-1.5 bg-red-500 text-white text-[9px] font-bold px-1 rounded shadow-sm">
            Out
          </div>
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getPriorityBadge(item.priority)}`}>
            {product.category}
          </span>
          <span className="text-[11px] text-stone-400 font-mono">SKU: {product.sku}</span>
        </div>

        <h4 className="font-bold text-stone-900 text-sm sm:text-base leading-snug group-hover:text-purple-600 transition-colors line-clamp-1">
          {product.name}
        </h4>

        {item.reason && (
          <p className="text-xs text-stone-600 italic line-clamp-2 bg-stone-50 p-2 rounded-lg border border-stone-200/60 mt-1.5">
            "{item.reason}"
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {product.tags.map((tag, idx) => (
            <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium">
              #{tag}
            </span>
          ))}
          {(product as any).aiVerified && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> AI Verified
            </span>
          )}
        </div>
      </div>

      {/* Pricing & Controls */}
      <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100 shrink-0">
        <div className="text-right">
          <div className="text-xs text-stone-500 font-medium">Total Cost</div>
          <div className="text-base sm:text-lg font-black text-stone-900 font-mono">
            ₹{(product.price * item.quantity).toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-500 font-medium">₹{product.price.toLocaleString()} each</div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Swap Alternative Button */}
          <button
            onClick={() => openReplacementModal(item)}
            title="Swap with compatible AI alternative"
            className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-purple-50 hover:text-purple-600 text-stone-700 transition-all text-xs font-semibold flex items-center gap-1 border border-stone-200 hover:border-purple-300 shadow-sm"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden md:inline">Swap</span>
          </button>

          {/* Quantity Stepper */}
          <div className="flex items-center bg-stone-100 rounded-lg border border-stone-200 p-0.5 shadow-sm">
            <button
              onClick={() => updateQuantity(product.id, item.quantity - 1)}
              className="p-1.5 hover:bg-white rounded text-stone-600 hover:text-stone-900 transition-colors"
              title="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-7 text-center font-bold text-xs text-stone-900 font-mono">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(product.id, item.quantity + 1)}
              className="p-1.5 hover:bg-white rounded text-stone-600 hover:text-stone-900 transition-colors"
              title="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Remove Button */}
          <button
            onClick={() => removeItem(product.id)}
            className="p-1.5 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-200"
            title="Remove item from plan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
