import { Link } from "react-router-dom";
import { X, Plus, Minus, ShoppingBag, ArrowRight, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CartItem } from "@/hooks/useCart";
import { formatKES } from "@/types";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (variantId: number, quantity: number) => void;
  onRemove: (variantId: number) => void;
  subtotal: number;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemove,
  subtotal,
}: CartDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <ShoppingBag size={20} className="text-lime-400" />
                <h2 className="font-display text-xl text-white tracking-wider">
                  YOUR CART
                </h2>
                <span className="bg-lime-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag size={48} className="text-zinc-700 mb-4" />
                  <p className="text-zinc-400 font-display text-lg">
                    YOUR CART IS EMPTY
                  </p>
                  <p className="text-zinc-600 text-sm mt-2">
                    Add some items to get started
                  </p>
                  <button
                    onClick={onClose}
                    className="btn-neon mt-6 text-sm"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.variantId}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex gap-4 bg-zinc-900 rounded-lg p-3"
                  >
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-20 h-20 object-cover rounded-md shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-sm font-medium truncate">
                        {item.productName}
                      </h4>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {item.size} / {item.color}
                      </p>
                      <p className="text-lime-400 font-bold text-sm mt-1">
                        {formatKES(item.unitPrice)}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 bg-zinc-800 rounded">
                          <button
                            onClick={() =>
                              onUpdateQuantity(item.variantId, item.quantity - 1)
                            }
                            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-white text-sm font-medium w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              onUpdateQuantity(item.variantId, item.quantity + 1)
                            }
                            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => onRemove(item.variantId)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-4 border-t border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Subtotal</span>
                  <span className="text-white font-bold text-lg">
                    {formatKES(subtotal)}
                  </span>
                </div>
                <p className="text-zinc-500 text-xs">
                  Shipping and taxes calculated at checkout
                </p>
                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="btn-neon w-full flex items-center justify-center gap-2"
                >
                  Checkout
                  <ArrowRight size={16} />
                </Link>
                <button
                  onClick={onClose}
                  className="w-full text-zinc-400 hover:text-white text-sm transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
