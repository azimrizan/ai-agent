import React from "react";
import { MOCK_STORES } from "../data/mockStores.js";
import { useAgentStore } from "../store/useAgentStore.js";
import { MapPin, Phone, Clock, CheckCircle2, ShoppingBag, ArrowRight } from "lucide-react";

export const StoresView: React.FC = () => {
  const { projectState } = useAgentStore();

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-300">
      {/* Stores Banner */}
      <div className="bg-white/90 rounded-2xl p-6 border border-stone-200/80 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600">Live Retail Inventory Check</span>
          <h2 className="text-xl font-black text-stone-900">Nearby Stores & Stock Availability</h2>
          <p className="text-xs text-stone-600 mt-1">
            Check real-time stock for your {projectState.shoppingList.length} shopping basket items across our retail outlets.
          </p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-600 flex items-center gap-2 shrink-0 shadow-sm">
          <ShoppingBag className="w-4 h-4" />
          <span>2-Hour Store Pickup Available</span>
        </div>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 gap-4">
        {MOCK_STORES.map((store) => (
          <div
            key={store.id}
            className="bg-white/85 rounded-2xl p-5 border border-stone-200/80 hover:border-purple-400/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group shadow-sm hover:shadow-lg"
          >
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {store.availableStockCount} items ready for immediate pickup
                </span>
                <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                  {store.distance}
                </span>
              </div>

              <h3 className="font-bold text-stone-900 text-base group-hover:text-purple-600 transition-colors">
                {store.name}
              </h3>

              <div className="space-y-1 text-xs text-stone-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{store.address} (PIN: {store.postalCode})</span>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{store.hours}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{store.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto flex md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-stone-100 shrink-0">
              <button
                onClick={() => alert(`Reserved your basket items for 2-hour pickup at ${store.name}!`)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-extrabold text-xs transition-all shadow-md flex items-center gap-2 group-hover:scale-102"
              >
                <span>Reserve for Pickup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => alert(`Directions sent to your phone for ${store.address}`)}
                className="text-xs text-stone-600 hover:text-purple-600 font-semibold underline underline-offset-4 transition-colors"
              >
                Get Directions
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
