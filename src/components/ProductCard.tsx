import React from "react";
import type { Product } from "../types/product.js";
import type { ShoppingListItem } from "../types/project.js";
import { useAgentStore } from "../store/useAgentStore.js";
import { Plus, Minus, Heart, ExternalLink, Trash2 } from "lucide-react";

interface ProductCardProps {
  item: ShoppingListItem;
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, product }) => {
  const { updateQuantity, removeItem, openReplacementModal } = useAgentStore();
  const [isWishlisted, setIsWishlisted] = React.useState(false);

  const shopifyDomain = "bxyaz5-em.myshopify.com";
  const handle = product.specifications?.handle as string | undefined;
  const storeUrl = handle ? `https://${shopifyDomain}/products/${handle}` : null;

  return (
    <div className="group relative liquid-glass-card rounded-[28px] p-6 transition-all duration-500 flex flex-col justify-between overflow-hidden hover:-translate-y-1">
      {/* Top Bar: Wishlist & Availability */}
      <div className="flex items-center justify-between z-10">
        <span className={`text-[11px] font-medium tracking-wide ${product.stockStatus === "in_stock" ? "text-white/60" : "text-white/30"}`}>
          {product.stockStatus === "in_stock" ? "In Stock" : "Out of Stock"}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => removeItem(product.id)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
            title="Remove item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsWishlisted(!isWishlisted)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
            title="Add to wishlist"
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? "fill-white text-white" : ""}`} />
          </button>
        </div>
      </div>

      {/* Product Image: Hero Presentation */}
      <div className="relative w-full h-52 my-4 flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 border border-white/5">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-700 ease-out"
        />
      </div>

      {/* Product Details */}
      <div className="flex flex-col gap-1.5 mt-2">
        <h3 className="font-bold text-white text-lg tracking-tight line-clamp-1 group-hover:text-white transition-colors">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-xs text-white/50 font-normal line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-2xl font-bold tracking-tight text-white font-mono">
            ₹{product.price.toLocaleString()}
          </span>
          {item.quantity > 1 && (
            <span className="text-xs text-white/40 font-mono">
              (₹{(product.price * item.quantity).toLocaleString()} total)
            </span>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-white/5">
        {/* Quantity Stepper */}
        <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/5">
          <button
            onClick={() => updateQuantity(product.id, -1)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Decrease quantity"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-7 text-center font-bold text-xs text-white font-mono">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(product.id, 1)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Increase quantity"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Swap Button */}
          <button
            onClick={() => openReplacementModal(item)}
            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all"
            title="Explore alternatives"
          >
            Swap
          </button>

          {/* Buy Now Direct Checkout Button */}
          <a
            href={
              product.specifications?.variantId
                ? `https://shop.mrplus.in/cart/${String(product.specifications.variantId).split("/").pop()}:${item.quantity}`
                : storeUrl || "https://shop.mrplus.in"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all flex items-center gap-1 shadow-lg shadow-emerald-500/20"
            title="One-click direct checkout on shop.mrplus.in"
          >
            <span>Buy Now</span>
          </a>

          {/* View Details / External Link */}
          {storeUrl && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              title="View on shop.mrplus.in"
            >
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
