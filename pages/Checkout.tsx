import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CreditCard,
  Truck,
  MapPin,
  Smartphone,
  Check,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { formatKES, calculateDeliveryFee, FREE_DELIVERY_THRESHOLD } from "@/types";
import type { CartItem } from "@/hooks/useCart";

interface CheckoutProps {
  items: CartItem[];
  subtotal: number;
  onClearCart: () => void;
}

export default function Checkout({ items, subtotal, onClearCart }: CheckoutProps) {
  const navigate = useNavigate();
  const createOrder = trpc.order.create.useMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    address: "",
    city: "",
    deliveryMethod: "delivery" as "pickup" | "delivery",
    paymentMethod: "mpesa" as "mpesa" | "cod",
    paymentPhone: "",
    distance: "",
    notes: "",
  });

  const deliveryFee =
    formData.deliveryMethod === "delivery"
      ? calculateDeliveryFee(
          subtotal,
          formData.distance ? parseFloat(formData.distance) : undefined
        )
      : 0;

  const total = subtotal + deliveryFee;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsSubmitting(true);

    try {
      const result = await createOrder.mutateAsync({
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail || undefined,
        address: formData.deliveryMethod === "delivery" ? formData.address : "Pickup",
        city: formData.city || "Nairobi",
        deliveryMethod: formData.deliveryMethod,
        paymentMethod: formData.paymentMethod,
        paymentPhone: formData.paymentMethod === "mpesa" ? formData.paymentPhone : undefined,
        subtotal,
        deliveryFee,
        total,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
        })),
        notes: formData.notes || undefined,
      });

      setOrderNumber(result.orderNumber);
      setOrderComplete(true);
      onClearCart();
    } catch (error) {
      console.error("Order error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !orderComplete) {
    navigate("/shop");
    return null;
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 rounded-lg border border-zinc-800 p-8 text-center"
          >
            <div className="w-16 h-16 bg-lime-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={32} className="text-lime-400" />
            </div>
            <h1 className="font-display text-3xl text-white mb-2">
              ORDER CONFIRMED!
            </h1>
            <p className="text-zinc-400 mb-6">
              Thank you for your purchase. Your order has been received.
            </p>
            <div className="bg-zinc-950 rounded-lg p-4 mb-6 inline-block">
              <p className="text-zinc-500 text-sm">Order Number</p>
              <p className="text-lime-400 font-bold text-2xl tracking-wider">
                {orderNumber}
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-zinc-400 text-sm">
                Save your order number to track your order status.
              </p>
              {formData.paymentMethod === "mpesa" && (
                <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-3">
                    <Smartphone size={20} className="text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-yellow-400 font-medium text-sm">
                        M-Pesa Payment Instructions
                      </h4>
                      <ol className="text-zinc-300 text-sm mt-2 space-y-1 list-decimal list-inside">
                        <li>Go to M-Pesa on your phone</li>
                        <li>Select Lipa na M-Pesa</li>
                        <li>Select Buy Goods and Services</li>
                        <li>Enter Till Number: <strong className="text-white"> provided at checkout</strong></li>
                        <li>Enter Amount: <strong className="text-white">{formatKES(total)}</strong></li>
                        <li>Enter your M-Pesa PIN and confirm</li>
                        <li>Enter the confirmation code below</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
              <Link to={`/track`} className="btn-neon">
                Track Your Order
              </Link>
              <Link
                to="/shop"
                className="px-6 py-3 border border-zinc-600 text-zinc-300 font-bold rounded-sm hover:border-zinc-400 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Cart
        </button>

        <h1 className="font-display text-3xl sm:text-4xl text-white mb-8">
          CHECKOUT
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Info */}
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
                <h2 className="font-display text-xl text-white tracking-wider mb-4">
                  CONTACT INFORMATION
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-sm mb-1 block">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleChange}
                      required
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1 block">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleChange}
                      required
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none"
                      placeholder="+254 7XX XXX XXX"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-zinc-400 text-sm mb-1 block">
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleChange}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Method */}
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
                <h2 className="font-display text-xl text-white tracking-wider mb-4">
                  DELIVERY METHOD
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        deliveryMethod: "delivery",
                      }))
                    }
                    className={`p-4 rounded-lg border text-left transition-all ${
                      formData.deliveryMethod === "delivery"
                        ? "border-lime-400 bg-lime-400/10"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    <Truck
                      size={20}
                      className={`mb-2 ${
                        formData.deliveryMethod === "delivery"
                          ? "text-lime-400"
                          : "text-zinc-500"
                      }`}
                    />
                    <p className="text-white font-medium text-sm">Delivery</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      We deliver to your address
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        deliveryMethod: "pickup",
                      }))
                    }
                    className={`p-4 rounded-lg border text-left transition-all ${
                      formData.deliveryMethod === "pickup"
                        ? "border-lime-400 bg-lime-400/10"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    <MapPin
                      size={20}
                      className={`mb-2 ${
                        formData.deliveryMethod === "pickup"
                          ? "text-lime-400"
                          : "text-zinc-500"
                      }`}
                    />
                    <p className="text-white font-medium text-sm">Pickup</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      Collect from our store
                    </p>
                  </button>
                </div>

                {formData.deliveryMethod === "delivery" && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-zinc-400 text-sm mb-1 block">
                        Delivery Address *
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                        rows={2}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none resize-none"
                        placeholder="Street address, apartment, building..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-zinc-400 text-sm mb-1 block">
                          City *
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          required
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none"
                          placeholder="Nairobi"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 text-sm mb-1 block">
                          Distance (km) - for delivery fee
                        </label>
                        <input
                          type="number"
                          name="distance"
                          value={formData.distance}
                          onChange={handleChange}
                          min="0"
                          step="0.1"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none"
                          placeholder="e.g. 5"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
                <h2 className="font-display text-xl text-white tracking-wider mb-4">
                  PAYMENT METHOD
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentMethod: "mpesa",
                      }))
                    }
                    className={`p-4 rounded-lg border text-left transition-all ${
                      formData.paymentMethod === "mpesa"
                        ? "border-lime-400 bg-lime-400/10"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    <Smartphone
                      size={20}
                      className={`mb-2 ${
                        formData.paymentMethod === "mpesa"
                          ? "text-lime-400"
                          : "text-zinc-500"
                      }`}
                    />
                    <p className="text-white font-medium text-sm">M-Pesa</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      Pay via M-Pesa STK Push
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentMethod: "cod",
                      }))
                    }
                    className={`p-4 rounded-lg border text-left transition-all ${
                      formData.paymentMethod === "cod"
                        ? "border-lime-400 bg-lime-400/10"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    <CreditCard
                      size={20}
                      className={`mb-2 ${
                        formData.paymentMethod === "cod"
                          ? "text-lime-400"
                          : "text-zinc-500"
                      }`}
                    />
                    <p className="text-white font-medium text-sm">
                      Cash on Delivery
                    </p>
                    <p className="text-zinc-500 text-xs mt-1">
                      Pay when you receive
                    </p>
                  </button>
                </div>

                {formData.paymentMethod === "mpesa" && (
                  <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        size={18}
                        className="text-yellow-400 shrink-0 mt-0.5"
                      />
                      <div>
                        <h4 className="text-yellow-400 font-medium text-sm mb-2">
                          M-Pesa STK Push Instructions
                        </h4>
                        <ol className="text-zinc-300 text-sm space-y-1 list-decimal list-inside">
                          <li>
                            Enter the phone number you want to pay with below
                          </li>
                          <li>Click &quot;Place Order&quot; to initiate the STK push</li>
                          <li>Check your phone for the M-Pesa prompt</li>
                          <li>Enter your M-Pesa PIN to complete payment</li>
                        </ol>
                        <input
                          type="tel"
                          name="paymentPhone"
                          value={formData.paymentPhone}
                          onChange={handleChange}
                          placeholder="M-Pesa phone number"
                          className="mt-3 w-full bg-zinc-950 border border-yellow-400/30 rounded-sm px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
                <h2 className="font-display text-xl text-white tracking-wider mb-4">
                  ORDER NOTES (OPTIONAL)
                </h2>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none resize-none"
                  placeholder="Special instructions for delivery..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-neon w-full flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CreditCard size={18} />
                    Place Order - {formatKES(total)}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 sticky top-24">
              <h2 className="font-display text-xl text-white tracking-wider mb-4">
                ORDER SUMMARY
              </h2>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.variantId} className="flex gap-3">
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-12 h-12 object-cover rounded-md shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {item.productName}
                      </p>
                      <p className="text-zinc-500 text-xs">
                        {item.size} / {item.color} x{item.quantity}
                      </p>
                    </div>
                    <p className="text-lime-400 text-sm font-medium shrink-0">
                      {formatKES(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-800 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Subtotal</span>
                  <span className="text-white">{formatKES(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Delivery</span>
                  <span className={deliveryFee === 0 ? "text-lime-400" : "text-white"}>
                    {deliveryFee === 0 ? "FREE" : formatKES(deliveryFee)}
                  </span>
                </div>
                {subtotal < FREE_DELIVERY_THRESHOLD && (
                  <p className="text-zinc-600 text-xs">
                    Free delivery on orders over{" "}
                    {formatKES(FREE_DELIVERY_THRESHOLD)}
                  </p>
                )}
                <div className="border-t border-zinc-800 pt-2 flex justify-between">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-lime-400 font-bold text-lg">
                    {formatKES(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
