import { useState } from "react";
// TrackOrder.tsx
import { motion } from "framer-motion";
import { Search, Package, Truck, CheckCircle, Clock, X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { formatKES, ORDER_STATUS_LABELS } from "@/types";

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);

  const { data: order, isLoading } = trpc.order.lookup.useQuery(
    { orderNumber, phone },
    { enabled: searched && !!orderNumber && !!phone }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
  };

  const statusSteps = [
    { key: "pending", label: "Order Placed", icon: Clock },
    { key: "processing", label: "Processing", icon: Package },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle },
  ];

  const getCurrentStep = (status: string) => {
    const index = statusSteps.findIndex((s) => s.key === status);
    return index >= 0 ? index : 0;
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <span className="text-lime-400 font-display text-sm tracking-[0.3em]">
            TRACKING
          </span>
          <h1 className="font-display text-4xl sm:text-5xl text-white mt-2">
            TRACK YOUR ORDER
          </h1>
          <p className="text-zinc-400 mt-3">
            Enter your order number and phone number to check your order status
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSearch}
          className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 mb-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 text-sm mb-1 block">
                Order Number
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => {
                  setOrderNumber(e.target.value);
                  setSearched(false);
                }}
                placeholder="e.g. ATW-XXXXXXXX"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none uppercase"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-sm mb-1 block">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setSearched(false);
                }}
                placeholder="+254 7XX XXX XXX"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-neon w-full mt-4 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Search size={18} />
                Track Order
              </>
            )}
          </button>
        </motion.form>

        {/* Results */}
        {searched && !isLoading && !order && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <X size={48} className="text-red-400 mx-auto mb-4" />
            <p className="text-white font-display text-xl">
              ORDER NOT FOUND
            </p>
            <p className="text-zinc-500 text-sm mt-2">
              Please check your order number and phone number
            </p>
          </motion.div>
        )}

        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Status Badge */}
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-zinc-500 text-sm">Order Number</p>
                  <p className="text-lime-400 font-bold text-xl tracking-wider">
                    {order.orderNumber}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    ORDER_STATUS_LABELS[order.status]?.color
                  }`}
                >
                  {ORDER_STATUS_LABELS[order.status]?.label}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative">
                <div className="absolute top-5 left-0 right-0 h-1 bg-zinc-800">
                  <div
                    className="h-full bg-lime-400 transition-all duration-500"
                    style={{
                      width: `${(getCurrentStep(order.status) / (statusSteps.length - 1)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between relative z-10">
                  {statusSteps.map((step, index) => {
                    const isCompleted = index <= getCurrentStep(order.status);
                    const isCurrent = index === getCurrentStep(order.status);
                    return (
                      <div key={step.key} className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                            isCompleted
                              ? "border-lime-400 bg-lime-400 text-black"
                              : "border-zinc-700 bg-zinc-900 text-zinc-600"
                          } ${isCurrent ? "ring-2 ring-lime-400/30" : ""}`}
                        >
                          <step.icon size={18} />
                        </div>
                        <span
                          className={`text-xs mt-2 font-medium ${
                            isCompleted ? "text-lime-400" : "text-zinc-600"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 mb-6">
              <h3 className="font-display text-lg text-white tracking-wider mb-4">
                ORDER DETAILS
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Customer</span>
                  <span className="text-white">{order.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Phone</span>
                  <span className="text-white">{order.customerPhone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Delivery Method</span>
                  <span className="text-white capitalize">
                    {order.deliveryMethod}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Payment Method</span>
                  <span className="text-white uppercase">
                    {order.paymentMethod === "mpesa" ? "M-Pesa" : "Cash on Delivery"}
                  </span>
                </div>
                {order.address && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Address</span>
                    <span className="text-white text-right">{order.address}</span>
                  </div>
                )}
                <div className="border-t border-zinc-800 pt-3">
                  <h4 className="text-white text-sm font-medium mb-2">Items</h4>
                  {order.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm py-1"
                    >
                      <span className="text-zinc-400">
                        {item.productName}{" "}
                        {item.size && `(${item.size}`}
                        {item.color && ` / ${item.color})`} x{item.quantity}
                      </span>
                      <span className="text-white">
                        {formatKES(parseFloat(item.total))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-zinc-800 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Subtotal</span>
                    <span className="text-white">
                      {formatKES(parseFloat(order.subtotal))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Delivery Fee</span>
                    <span className="text-white">
                      {parseFloat(order.deliveryFee) === 0
                        ? "FREE"
                        : formatKES(parseFloat(order.deliveryFee))}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-lime-400">
                      {formatKES(parseFloat(order.total))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Help */}
            <div className="text-center">
              <p className="text-zinc-400 text-sm">
                Need help?{" "}
                <a
                  href="https://wa.me/254724357210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lime-400 hover:text-lime-300 transition-colors"
                >
                  Contact us on WhatsApp
                </a>
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
