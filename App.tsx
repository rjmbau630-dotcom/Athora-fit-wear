import { Routes, Route } from "react-router";
import { useCart } from "@/hooks/useCart";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppChat from "@/components/WhatsAppChat";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import Checkout from "@/pages/Checkout";
import TrackOrder from "@/pages/TrackOrder";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

export default function App() {
  const cart = useCart();

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar cartCount={cart.totalItems} onCartOpen={() => cart.setIsOpen(true)} />
      <CartDrawer
        isOpen={cart.isOpen}
        onClose={() => cart.setIsOpen(false)}
        items={cart.items}
        onUpdateQuantity={cart.updateQuantity}
        onRemove={cart.removeItem}
        subtotal={cart.subtotal}
      />

      <Routes>
        <Route path="/" element={<Home onAddToCart={cart.addItem} />} />
        <Route path="/shop" element={<Shop onAddToCart={cart.addItem} />} />
        <Route
          path="/product/:slug"
          element={<ProductDetail onAddToCart={cart.addItem} />}
        />
        <Route
          path="/checkout"
          element={
            <Checkout
              items={cart.items}
              subtotal={cart.subtotal}
              onClearCart={cart.clearCart}
            />
          }
        />
        <Route path="/track" element={<TrackOrder />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
      <WhatsAppChat />
    </div>
  );
}
