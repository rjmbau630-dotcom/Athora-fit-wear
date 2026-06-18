import React, { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X, Search, Eye, EyeOff, LogOut, Plus, Trash2, Edit2, Save, ChevronDown, AlertCircle, Check } from 'lucide-react';

// ==================== CONSTANTS ====================
const KES = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 });
const DELIVERY_THRESHOLD = 10000;
const DELIVERY_COST = 500;
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = ['Black', 'White', 'Navy', 'Red', 'Green', 'Grey'];
const CATEGORIES = ['Tanks', 'T-Shirts', 'Hoodies', 'Shorts', 'Tights', 'Hats'];

// ==================== ADMIN AUTH ====================
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Athora2024!'; // Change in production

// ==================== MOCK DATA ====================
const MOCK_PRODUCTS = [
  {
    id: 1,
    name: 'Elite Pro Tank',
    description: 'Sleeveless performance tank for intense training. Moisture-wicking fabric keeps you dry.',
    category: 'Tanks',
    price: 2500,
    image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"%3E%3Crect fill="%23222" width="400" height="500"/%3E%3Crect fill="%23111" x="80" y="80" width="240" height="300" rx="10"/%3E%3Ctext x="200" y="250" font-size="20" fill="%23C8FF00" text-anchor="middle" font-weight="bold"%3ETank%3C/text%3E%3C/svg%3E',
    variants: [
      { id: 1, size: 'S', color: 'Black', stock: 15 },
      { id: 2, size: 'S', color: 'White', stock: 12 },
      { id: 3, size: 'M', color: 'Black', stock: 20 },
      { id: 4, size: 'M', color: 'White', stock: 18 },
      { id: 5, size: 'L', color: 'Black', stock: 10 },
      { id: 6, size: 'L', color: 'White', stock: 8 },
    ]
  },
  {
    id: 2,
    name: 'Core Strength Tee',
    description: 'Premium 100% cotton t-shirt. Comfortable for daily wear or gym sessions.',
    category: 'T-Shirts',
    price: 1800,
    image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"%3E%3Crect fill="%23222" width="400" height="500"/%3E%3Crect fill="%23111" x="60" y="100" width="280" height="280" rx="10"/%3E%3Ctext x="200" y="260" font-size="20" fill="%23FFE500" text-anchor="middle" font-weight="bold"%3ET-Shirt%3C/text%3E%3C/svg%3E',
    variants: [
      { id: 7, size: 'M', color: 'Black', stock: 25 },
      { id: 8, size: 'M', color: 'Grey', stock: 22 },
      { id: 9, size: 'L', color: 'Black', stock: 18 },
      { id: 10, size: 'L', color: 'Navy', stock: 15 },
    ]
  },
  {
    id: 3,
    name: 'Beast Mode Hoodie',
    description: 'Oversized gym hoodie with kangaroo pocket. Premium fleece lining.',
    category: 'Hoodies',
    price: 4500,
    image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"%3E%3Crect fill="%23222" width="400" height="500"/%3E%3Crect fill="%23111" x="50" y="80" width="300" height="340" rx="10"/%3E%3Ctext x="200" y="270" font-size="18" fill="%23C8FF00" text-anchor="middle" font-weight="bold"%3EHoodie%3C/text%3E%3C/svg%3E',
    variants: [
      { id: 11, size: 'M', color: 'Black', stock: 12 },
      { id: 12, size: 'L', color: 'Black', stock: 8 },
      { id: 13, size: 'XL', color: 'Black', stock: 5 },
    ]
  },
];

// ==================== UTILITY FUNCTIONS ====================
const getVariantKey = (size, color) => `${size}-${color}`;
const calculateCartTotal = (items) => items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
const getDeliveryFee = (total) => total >= DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;

// ==================== COMPONENTS ====================

// Hero Section
function Hero() {
  return (
    <div className="relative w-full h-[600px] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#0A0A0A] overflow-hidden">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,rgba(200,255,0,0.1),transparent_70%)]" />
      
      <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
        <div className="space-y-6">
          <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-white uppercase" style={{fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '-0.02em'}}>
            Athora
          </h1>
          <p className="text-2xl md:text-3xl text-[#C8FF00] font-bold uppercase tracking-wide" style={{fontFamily: 'Bebas Neue, sans-serif'}}>
            Elite Fit. Zero Compromise.
          </p>
          <p className="text-lg text-[#B0B0B0] max-w-xl mx-auto leading-relaxed">
            Premium gym wear engineered for athletes who demand more. Built for intensity. Designed for dominance.
          </p>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
    </div>
  );
}

// Product Card
function ProductCard({ product, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(product)}
    >
      <div className={`relative overflow-hidden aspect-square bg-[#1A1A1A] border-2 transition-all duration-200 ${isHovered ? 'border-[#C8FF00] shadow-lg shadow-[#C8FF00]/30' : 'border-[#333]'}`}>
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-center h-full">
            <button className="px-6 py-3 bg-[#C8FF00] text-black font-bold uppercase text-sm transition-transform duration-200 hover:scale-105">
              View
            </button>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-sm text-[#888]">{product.category}</p>
        <h3 className="text-lg font-bold text-white uppercase tracking-tight">{product.name}</h3>
        <p className="text-[#C8FF00] font-bold text-lg">{KES.format(product.price)}</p>
      </div>
    </div>
  );
}

// Product Detail Modal
function ProductDetailModal({ product, onClose, onAddToCart }) {
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  if (!product) return null;

  const sizes = [...new Set(product.variants.map(v => v.size))];
  const colors = [...new Set(product.variants.filter(v => v.size === selectedSize).map(v => v.color))];
  const variant = product.variants.find(v => v.size === selectedSize && v.color === selectedColor);
  const stock = variant?.stock || 0;

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
      setError('Please select size and color');
      return;
    }
    if (stock === 0) {
      setError('Out of stock');
      return;
    }
    onAddToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      size: selectedSize,
      color: selectedColor,
      quantity: Math.min(quantity, stock),
      variantId: variant.id
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#333]">
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#333] p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white uppercase">{product.name}</h2>
          <button onClick={onClose} className="text-[#888] hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="aspect-square bg-[#0A0A0A] overflow-hidden border border-[#333]">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>

          <div className="space-y-4">
            <p className="text-[#B0B0B0] text-lg leading-relaxed">{product.description}</p>
            <p className="text-[#C8FF00] text-3xl font-bold">{KES.format(product.price)}</p>

            {/* Size Selection */}
            <div className="space-y-3">
              <label className="block text-white font-bold uppercase text-sm">Size</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => {
                      setSelectedSize(size);
                      setSelectedColor(null);
                      setError('');
                    }}
                    className={`py-2 font-bold uppercase text-sm transition-all border ${selectedSize === size ? 'bg-[#C8FF00] text-black border-[#C8FF00]' : 'bg-[#0A0A0A] text-white border-[#333] hover:border-[#C8FF00]'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            {selectedSize && (
              <div className="space-y-3">
                <label className="block text-white font-bold uppercase text-sm">Color</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        setError('');
                      }}
                      className={`py-2 font-bold uppercase text-sm transition-all border ${selectedColor === color ? 'bg-[#FFE500] text-black border-[#FFE500]' : 'bg-[#0A0A0A] text-white border-[#333] hover:border-[#FFE500]'}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Status */}
            {selectedSize && selectedColor && (
              <div className={`p-3 border rounded text-sm font-semibold ${stock > 0 ? 'bg-green-900/20 border-green-600 text-green-400' : 'bg-red-900/20 border-red-600 text-red-400'}`}>
                {stock > 0 ? `${stock} in stock` : 'Out of stock'}
              </div>
            )}

            {/* Quantity */}
            {selectedSize && selectedColor && stock > 0 && (
              <div className="space-y-3">
                <label className="block text-white font-bold uppercase text-sm">Quantity</label>
                <div className="flex gap-2">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 bg-[#0A0A0A] text-white border border-[#333] hover:border-[#C8FF00]">−</button>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} max={stock} className="flex-1 bg-[#0A0A0A] text-white border border-[#333] text-center px-3 py-2" />
                  <button onClick={() => setQuantity(Math.min(stock, quantity + 1))} className="px-3 py-2 bg-[#0A0A0A] text-white border border-[#333] hover:border-[#C8FF00]">+</button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-600 text-red-400 text-sm flex gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={!selectedSize || !selectedColor || stock === 0}
              className="w-full py-3 bg-[#C8FF00] text-black font-bold uppercase text-lg transition-all hover:bg-[#FFE500] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Cart Drawer
function CartDrawer({ items, onClose, onUpdateQuantity, onRemove, onCheckout }) {
  const subtotal = calculateCartTotal(items);
  const delivery = getDeliveryFee(subtotal);
  const total = subtotal + delivery;
  const isFreeDelivery = subtotal >= DELIVERY_THRESHOLD;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-[#0A0A0A] border-l border-[#333] overflow-y-auto">
        <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#333] p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white uppercase">Your Cart</h2>
          <button onClick={onClose} className="text-[#888] hover:text-white">
            <X size={20} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center text-[#888]">
            <ShoppingCart size={32} className="mx-auto mb-3 opacity-50" />
            <p>Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-4">
              {items.map(item => (
                <div key={`${item.productId}-${item.size}-${item.color}`} className="bg-[#1A1A1A] p-3 border border-[#333] space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm uppercase">{item.name}</p>
                      <p className="text-[#888] text-xs">{item.size} / {item.color}</p>
                    </div>
                    <button onClick={() => onRemove(item.productId, item.size, item.color)} className="text-red-400 hover:text-red-300 flex-shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <button onClick={() => onUpdateQuantity(item.productId, item.size, item.color, item.quantity - 1)} className="px-2 py-1 bg-[#0A0A0A] text-white border border-[#333] hover:border-[#C8FF00] text-xs">−</button>
                      <span className="px-3 py-1 bg-[#0A0A0A] text-white border border-[#333] text-xs text-center min-w-[40px]">{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.productId, item.size, item.color, item.quantity + 1)} className="px-2 py-1 bg-[#0A0A0A] text-white border border-[#333] hover:border-[#C8FF00] text-xs">+</button>
                    </div>
                    <p className="text-[#C8FF00] font-bold text-sm">{KES.format(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#333] p-4 space-y-3">
              <div className="flex justify-between text-[#B0B0B0]">
                <span>Subtotal:</span>
                <span>{KES.format(subtotal)}</span>
              </div>
              <div className={`flex justify-between text-sm ${isFreeDelivery ? 'text-green-400' : 'text-[#B0B0B0]'}`}>
                <span>Delivery:</span>
                <span>{isFreeDelivery ? 'FREE' : KES.format(delivery)}</span>
              </div>
              {!isFreeDelivery && (
                <p className="text-xs text-[#888]">Free delivery on orders over {KES.format(DELIVERY_THRESHOLD)}</p>
              )}
              <div className="border-t border-[#333] pt-3 flex justify-between text-white font-bold text-lg">
                <span>Total:</span>
                <span className="text-[#C8FF00]">{KES.format(total)}</span>
              </div>
              <button onClick={onCheckout} className="w-full py-3 bg-[#C8FF00] text-black font-bold uppercase transition-all hover:bg-[#FFE500]">
                Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Checkout Modal
function CheckoutModal({ items, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    paymentMethod: 'cod', // 'cod' or 'mpesa'
    mpesaPhone: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const subtotal = calculateCartTotal(items);
  const delivery = getDeliveryFee(subtotal);
  const total = subtotal + delivery;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address) {
      alert('Please fill in all required fields');
      return;
    }
    if (formData.paymentMethod === 'mpesa' && !formData.mpesaPhone) {
      alert('Please enter M-Pesa phone number');
      return;
    }

    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const id = Date.now().toString();
    setOrderId(id);
    setSuccess(true);

    // Save order to localStorage (mock)
    const orders = JSON.parse(localStorage.getItem('athora_orders') || '[]');
    orders.push({
      id,
      ...formData,
      items,
      subtotal,
      delivery,
      total,
      status: formData.paymentMethod === 'mpesa' ? 'pending_payment' : 'pending',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('athora_orders', JSON.stringify(orders));

    setLoading(false);
    onSubmit(id);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-[#1A1A1A] max-w-md w-full border border-[#333] p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <Check size={32} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white uppercase">Order Placed!</h2>
          <p className="text-[#B0B0B0]">Thank you for your order. Your Order ID is:</p>
          <p className="text-2xl font-mono font-bold text-[#C8FF00]">{orderId}</p>
          <p className="text-sm text-[#888]">Use this ID to track your order status.</p>
          <button onClick={onClose} className="w-full py-3 bg-[#C8FF00] text-black font-bold uppercase hover:bg-[#FFE500] transition">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#333]">
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#333] p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white uppercase">Checkout</h2>
          <button onClick={onClose} className="text-[#888] hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contact Info */}
            <div>
              <label className="block text-white font-bold uppercase text-sm mb-2">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 bg-[#0A0A0A] text-white border border-[#333] focus:border-[#C8FF00] outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-white font-bold uppercase text-sm mb-2">Phone Number *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+254 xxx xxx xxx"
                className="w-full px-3 py-2 bg-[#0A0A0A] text-white border border-[#333] focus:border-[#C8FF00] outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-white font-bold uppercase text-sm mb-2">Delivery Address *</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Street address, area, postal code"
                rows={3}
                className="w-full px-3 py-2 bg-[#0A0A0A] text-white border border-[#333] focus:border-[#C8FF00] outline-none transition resize-none"
                required
              />
            </div>

            {/* Payment Method */}
            <div className="border-t border-[#333] pt-4">
              <label className="block text-white font-bold uppercase text-sm mb-3">Payment Method *</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-[#0A0A0A] border border-[#333] cursor-pointer hover:border-[#C8FF00] transition">
                  <input
                    type="radio"
                    value="cod"
                    checked={formData.paymentMethod === 'cod'}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-4 h-4"
                  />
                  <span className="text-white font-semibold">Cash on Delivery</span>
                  <span className="text-[#888] text-sm ml-auto">Pay when item arrives</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-[#0A0A0A] border border-[#333] cursor-pointer hover:border-[#FFE500] transition">
                  <input
                    type="radio"
                    value="mpesa"
                    checked={formData.paymentMethod === 'mpesa'}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-4 h-4"
                  />
                  <span className="text-white font-semibold">M-Pesa</span>
                  <span className="text-[#888] text-sm ml-auto">Pay with M-Pesa instantly</span>
                </label>
              </div>
            </div>

            {formData.paymentMethod === 'mpesa' && (
              <div>
                <label className="block text-white font-bold uppercase text-sm mb-2">M-Pesa Phone Number *</label>
                <input
                  type="tel"
                  value={formData.mpesaPhone}
                  onChange={(e) => setFormData({...formData, mpesaPhone: e.target.value})}
                  placeholder="+254 7xx xxx xxx"
                  className="w-full px-3 py-2 bg-[#0A0A0A] text-white border border-[#FFE500] focus:border-[#FFE500] outline-none transition"
                />
                <p className="text-[#888] text-xs mt-2">You'll receive an STK push prompt on your phone. Enter your M-Pesa PIN to confirm payment.</p>
              </div>
            )}

            {/* Order Summary */}
            <div className="border-t border-[#333] pt-4 bg-[#0A0A0A] p-3 space-y-2">
              <div className="flex justify-between text-[#B0B0B0] text-sm">
                <span>Subtotal:</span>
                <span>{KES.format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#B0B0B0] text-sm">
                <span>Delivery:</span>
                <span>{getDeliveryFee(subtotal) === 0 ? 'FREE' : KES.format(delivery)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-lg border-t border-[#333] pt-2">
                <span>Total:</span>
                <span className="text-[#C8FF00]">{KES.format(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#C8FF00] text-black font-bold uppercase text-lg transition-all hover:bg-[#FFE500] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Place Order'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Order Lookup
function OrderLookup({ onClose }) {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [searched, setSearched] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = () => {
    if (!orderId || !phone) {
      alert('Please enter Order ID and phone number');
      return;
    }

    const orders = JSON.parse(localStorage.getItem('athora_orders') || '[]');
    const found = orders.find(o => o.id === orderId && o.phone === phone);

    setSearched(true);
    if (found) {
      setOrder(found);
      setNotFound(false);
    } else {
      setNotFound(true);
      setOrder(null);
    }
  };

  const statusColors = {
    pending: 'text-yellow-400 bg-yellow-900/20 border-yellow-600',
    pending_payment: 'text-orange-400 bg-orange-900/20 border-orange-600',
    processing: 'text-blue-400 bg-blue-900/20 border-blue-600',
    shipped: 'text-cyan-400 bg-cyan-900/20 border-cyan-600',
    delivered: 'text-green-400 bg-green-900/20 border-green-600'
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] max-w-2xl w-full border border-[#333]">
        <div className="border-b border-[#333] p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white uppercase">Track Order</h2>
          <button onClick={onClose} className="text-[#888] hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {!searched ? (
            <div className="space-y-4">
              <p className="text-[#B0B0B0]">Enter your Order ID and phone number to track your order status.</p>
              
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Order ID"
                className="w-full px-3 py-2 bg-[#0A0A0A] text-white border border-[#333] focus:border-[#C8FF00] outline-none"
              />

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full px-3 py-2 bg-[#0A0A0A] text-white border border-[#333] focus:border-[#C8FF00] outline-none"
              />

              <button
                onClick={handleSearch}
                className="w-full py-3 bg-[#C8FF00] text-black font-bold uppercase hover:bg-[#FFE500] transition"
              >
                Search
              </button>
            </div>
          ) : notFound ? (
            <div className="text-center space-y-4">
              <AlertCircle size={48} className="mx-auto text-red-400" />
              <p className="text-[#B0B0B0]">No order found with the provided details.</p>
              <button
                onClick={() => { setSearched(false); setOrderId(''); setPhone(''); }}
                className="px-4 py-2 bg-[#C8FF00] text-black font-bold uppercase hover:bg-[#FFE500] transition"
              >
                Try Again
              </button>
            </div>
          ) : order && (
            <div className="space-y-4">
              <div className="bg-[#0A0A0A] p-4 border border-[#333] space-y-3">
                <div>
                  <p className="text-[#888] text-sm uppercase">Order ID</p>
                  <p className="text-white font-mono text-lg">{order.id}</p>
                </div>
                <div className={`px-3 py-2 border rounded text-sm font-bold inline-block ${statusColors[order.status] || statusColors.pending}`}>
                  {order.status.replace('_', ' ').toUpperCase()}
                </div>
                <div className="space-y-2 border-t border-[#333] pt-3">
                  <p><span className="text-[#888]">Name:</span> <span className="text-white">{order.name}</span></p>
                  <p><span className="text-[#888]">Phone:</span> <span className="text-white">{order.phone}</span></p>
                  <p><span className="text-[#888]">Address:</span> <span className="text-white">{order.address}</span></p>
                  <p><span className="text-[#888]">Payment:</span> <span className="text-white">{order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash on Delivery'}</span></p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-white font-bold uppercase text-sm">Items</p>
                {order.items.map((item, idx) => (
                  <div key={idx} className="bg-[#0A0A0A] p-3 border border-[#333] text-sm">
                    <p className="text-white">{item.name} × {item.quantity}</p>
                    <p className="text-[#888] text-xs">{item.size} / {item.color}</p>
                    <p className="text-[#C8FF00] font-bold">{KES.format(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#0A0A0A] p-3 border border-[#333] space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Total:</span>
                  <span className="text-[#C8FF00] font-bold">{KES.format(order.total)}</span>
                </div>
              </div>

              <button
                onClick={() => { setSearched(false); setOrderId(''); setPhone(''); }}
                className="w-full px-4 py-2 bg-[#C8FF00] text-black font-bold uppercase hover:bg-[#FFE500] transition"
              >
                Search Another Order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Admin Dashboard
function AdminDashboard({ onLogout }) {
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [orders, setOrders] = useState(JSON.parse(localStorage.getItem('athora_orders') || '[]'));
  const [activeTab, setActiveTab] = useState('products');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: CATEGORIES[0],
    price: '',
    image: ''
  });

  // Calculate stats
  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
    pendingOrders: orders.filter(o => o.status === 'pending' || o.status === 'pending_payment').length
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price || !newProduct.description) {
      alert('Please fill all fields');
      return;
    }
    const product = {
      id: Math.max(...products.map(p => p.id)) + 1,
      ...newProduct,
      price: parseInt(newProduct.price),
      variants: SIZES.flatMap(size => 
        COLORS.map(color => ({
          id: Math.random(),
          size,
          color,
          stock: 10
        }))
      )
    };
    setProducts([...products, product]);
    setNewProduct({ name: '', description: '', category: CATEGORIES[0], price: '', image: '' });
    setShowProductForm(false);
  };

  const handleDeleteProduct = (id) => {
    if (confirm('Delete this product?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(o => o.id === orderId ? {...o, status: newStatus} : o));
    localStorage.setItem('athora_orders', JSON.stringify(orders));
  };

  const handleUpdateStock = (productId, variantId, newStock) => {
    setProducts(products.map(p => 
      p.id === productId 
        ? {...p, variants: p.variants.map(v => v.id === variantId ? {...v, stock: newStock} : v)}
        : p
    ));
  };

  const lowStockItems = products.flatMap(p => 
    p.variants.filter(v => v.stock < 5).map(v => ({...v, productName: p.name, productId: p.id}))
  );

  const statusOptions = ['pending', 'pending_payment', 'processing', 'shipped', 'delivered'];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Admin Header */}
      <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#333] p-4 flex justify-between items-center z-30">
        <h1 className="text-2xl font-bold uppercase" style={{fontFamily: 'Bebas Neue, sans-serif'}}>Admin Dashboard</h1>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-900/30 text-red-400 border border-red-600 hover:bg-red-900/50 transition uppercase text-sm font-bold"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 max-w-7xl mx-auto">
        <div className="bg-[#1A1A1A] border border-[#333] p-4 space-y-2">
          <p className="text-[#888] uppercase text-xs font-bold">Total Orders</p>
          <p className="text-[#C8FF00] text-3xl font-bold">{stats.totalOrders}</p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#333] p-4 space-y-2">
          <p className="text-[#888] uppercase text-xs font-bold">Revenue</p>
          <p className="text-[#FFE500] text-3xl font-bold">{KES.format(stats.totalRevenue)}</p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#333] p-4 space-y-2">
          <p className="text-[#888] uppercase text-xs font-bold">Pending Orders</p>
          <p className="text-orange-400 text-3xl font-bold">{stats.pendingOrders}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-6 mb-4 flex gap-2 border-b border-[#333]">
        {['products', 'orders', 'inventory'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 uppercase text-sm font-bold border-b-2 transition ${activeTab === tab ? 'border-[#C8FF00] text-[#C8FF00]' : 'border-transparent text-[#888] hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowProductForm(!showProductForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[#C8FF00] text-black font-bold uppercase hover:bg-[#FFE500] transition"
            >
              <Plus size={18} /> Add Product
            </button>

            {showProductForm && (
              <div className="bg-[#1A1A1A] border border-[#333] p-4 space-y-3">
                <input
                  type="text"
                  placeholder="Product name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0A0A0A] text-white border border-[#333] focus:border-[#C8FF00] outline-none"
                />
                <textarea
                  placeholder="Description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0A0A0A] text-white border border-[#333] focus:border-[#C8FF00] outline-none resize-none"
                />
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0A0A0A] text-white border border-[#333] focus:border-[#C8FF00] outline-none"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <input
                  type="number"
                  placeholder="Price (KES)"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0A0A0A] text-white border border-[#333] focus:border-[#C8FF00] outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddProduct}
                    className="flex-1 px-3 py-2 bg-[#C8FF00] text-black font-bold uppercase hover:bg-[#FFE500] transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowProductForm(false)}
                    className="flex-1 px-3 py-2 bg-[#333] text-white font-bold uppercase hover:bg-[#444] transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {products.map(product => (
                <div key={product.id} className="bg-[#1A1A1A] border border-[#333] p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{product.name}</h3>
                      <p className="text-[#888] text-sm">{product.category} • {KES.format(product.price)}</p>
                      <p className="text-[#B0B0B0] text-sm mt-1">{product.description}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="border-t border-[#333] pt-3">
                    <p className="text-[#888] text-xs uppercase mb-2">Variants</p>
                    <div className="text-[#B0B0B0] text-sm space-y-1">
                      {product.variants.slice(0, 3).map(v => (
                        <span key={v.id} className="block">{v.size} / {v.color}: {v.stock} units</span>
                      ))}
                      {product.variants.length > 3 && <span className="text-[#888]">+{product.variants.length - 3} more</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <p className="text-[#888] text-center py-8">No orders yet</p>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-[#1A1A1A] border border-[#333] p-4 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-[#888] text-sm">Order #{order.id}</p>
                      <h3 className="text-lg font-bold text-white">{order.name}</h3>
                      <p className="text-[#B0B0B0] text-sm">{order.phone} • {order.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#C8FF00] font-bold text-lg">{KES.format(order.total)}</p>
                      <p className="text-[#888] text-xs">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="bg-[#0A0A0A] p-3 border border-[#333] rounded space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-white">{item.name} × {item.quantity}</span>
                        <span className="text-[#888]">{item.size}/{item.color}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-[#333] pt-3">
                    <div>
                      <p className="text-[#888] text-xs uppercase mb-1">Status</p>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className="bg-[#0A0A0A] text-white border border-[#333] px-2 py-1 text-sm"
                      >
                        {statusOptions.map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-right">
                      <p className="text-[#888] text-xs uppercase">Payment</p>
                      <p className="text-white font-semibold">{order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'COD'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {lowStockItems.length > 0 && (
              <div className="bg-orange-900/20 border border-orange-600 p-4 rounded flex gap-2">
                <AlertCircle size={20} className="text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-400 font-bold">{lowStockItems.length} items with low stock</p>
                  <p className="text-orange-300 text-sm">Restock items with less than 5 units</p>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {products.map(product => (
                <div key={product.id} className="bg-[#1A1A1A] border border-[#333] p-4 space-y-3">
                  <h3 className="text-lg font-bold text-white">{product.name}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {product.variants.map(v => (
                      <div key={v.id} className={`bg-[#0A0A0A] p-2 border rounded text-sm ${v.stock < 5 ? 'border-red-600' : 'border-[#333]'}`}>
                        <p className="text-[#888] text-xs">{v.size} / {v.color}</p>
                        <div className="flex gap-1 mt-1">
                          <input
                            type="number"
                            value={v.stock}
                            onChange={(e) => handleUpdateStock(product.id, v.id, parseInt(e.target.value) || 0)}
                            min="0"
                            className="flex-1 bg-[#1A1A1A] text-white border border-[#333] px-1 py-1 text-xs text-center"
                          />
                        </div>
                        {v.stock < 5 && <p className="text-red-400 text-xs mt-1">Low stock!</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main App
export default function AtoraFitWear() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderLookup, setShowOrderLookup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('athora_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('athora_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setAdminPassword('');
      setShowAdminLogin(false);
    } else {
      alert('Incorrect password');
    }
  };

  const handleAddToCart = (item) => {
    const key = getVariantKey(item.size, item.color);
    const existing = cartItems.find(ci => ci.productId === item.productId && getVariantKey(ci.size, ci.color) === key);

    if (existing) {
      setCartItems(cartItems.map(ci =>
        ci.productId === item.productId && getVariantKey(ci.size, ci.color) === key
          ? {...ci, quantity: Math.min(ci.quantity + item.quantity, item.stock || 100)}
          : ci
      ));
    } else {
      setCartItems([...cartItems, item]);
    }
    setShowCart(true);
  };

  const handleUpdateQuantity = (productId, size, color, newQty) => {
    if (newQty <= 0) {
      handleRemoveFromCart(productId, size, color);
    } else {
      setCartItems(cartItems.map(item =>
        item.productId === productId && item.size === size && item.color === color
          ? {...item, quantity: newQty}
          : item
      ));
    }
  };

  const handleRemoveFromCart = (productId, size, color) => {
    setCartItems(cartItems.filter(item =>
      !(item.productId === productId && item.size === size && item.color === color)
    ));
  };

  const handleCheckoutComplete = (orderId) => {
    setCartItems([]);
    setShowCheckout(false);
    setShowCart(false);
  };

  if (isAdmin) {
    return (
      <AdminDashboard onLogout={() => setIsAdmin(false)} />
    );
  }

  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0A0A0A] border-b border-[#333]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tighter uppercase" style={{fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '-0.02em'}}>
            <span className="text-white">Athora </span>
            <span className="text-[#C8FF00]">Fit</span>
          </h1>

          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => setShowOrderLookup(true)} className="text-[#B0B0B0] hover:text-[#C8FF00] transition text-sm uppercase font-semibold">
              Track Order
            </button>
            <button onClick={() => setShowAdminLogin(true)} className="text-[#B0B0B0] hover:text-[#FFE500] transition text-sm uppercase font-semibold">
              Admin
            </button>
          </div>

          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 px-4 py-2 bg-[#C8FF00] text-black font-bold uppercase transition hover:bg-[#FFE500]"
          >
            <ShoppingCart size={20} />
            {cartItems.length > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white text-xs font-bold flex items-center justify-center rounded-full">
                {cartItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-[#C8FF00] hover:text-[#FFE500]"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-[#333] p-4 space-y-2">
            <button onClick={() => { setShowOrderLookup(true); setIsMobileMenuOpen(false); }} className="block w-full text-left text-[#B0B0B0] hover:text-[#C8FF00] transition text-sm uppercase font-semibold py-2">
              Track Order
            </button>
            <button onClick={() => { setShowAdminLogin(true); setIsMobileMenuOpen(false); }} className="block w-full text-left text-[#B0B0B0] hover:text-[#FFE500] transition text-sm uppercase font-semibold py-2">
              Admin
            </button>
          </div>
        )}
      </header>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] w-full max-w-sm border border-[#333] p-6 space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase">Admin Access</h2>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="Enter password"
              className="w-full px-3 py-2 bg-[#0A0A0A] text-white border border-[#333] focus:border-[#C8FF00] outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdminLogin}
                className="flex-1 py-2 bg-[#C8FF00] text-black font-bold uppercase hover:bg-[#FFE500] transition"
              >
                Login
              </button>
              <button
                onClick={() => { setShowAdminLogin(false); setAdminPassword(''); }}
                className="flex-1 py-2 bg-[#333] text-white font-bold uppercase hover:bg-[#444] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <Hero />

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold uppercase mb-12 text-white" style={{fontFamily: 'Bebas Neue, sans-serif'}}>
          <span className="text-[#C8FF00]">Featured</span> Collection
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {MOCK_PRODUCTS.map(product => (
            <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />
          ))}
        </div>
      </div>

      {/* Modals */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {showCart && (
        <CartDrawer
          items={cartItems}
          onClose={() => setShowCart(false)}
          onUpdateQuantity={handleUpdateQuantity}
          onRemove={handleRemoveFromCart}
          onCheckout={() => { setShowCheckout(true); setShowCart(false); }}
        />
      )}

      {showCheckout && (
        <CheckoutModal
          items={cartItems}
          onClose={() => setShowCheckout(false)}
          onSubmit={handleCheckoutComplete}
        />
      )}

      {showOrderLookup && (
        <OrderLookup onClose={() => setShowOrderLookup(false)} />
      )}

      {/* Footer */}
      <footer className="border-t border-[#333] bg-[#1A1A1A] mt-20">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold text-white uppercase mb-3">Athora Fit Wear</h3>
              <p className="text-[#888] text-sm">Premium gym wear for elite athletes.</p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase mb-3">Support</h4>
              <p className="text-[#888] text-sm">Email: support@athorafit.com</p>
              <p className="text-[#888] text-sm">Phone: +254 7xx xxx xxx</p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase mb-3">Info</h4>
              <p className="text-[#888] text-sm">Prices in KES</p>
              <p className="text-[#888] text-sm">Free delivery over KES 10,000</p>
            </div>
          </div>
          <div className="border-t border-[#333] pt-6 text-center text-[#888] text-sm">
            <p>&copy; 2024 Athora Fit Wear. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
