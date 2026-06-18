import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Menu, X, Search, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavbarProps {
  cartCount: number;
  onCartOpen: () => void;
}

export default function Navbar({ cartCount, onCartOpen }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: "HOME", path: "/" },
    { label: "SHOP", path: "/shop" },
    { label: "TRACK ORDER", path: "/track" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/90 backdrop-blur-md border-b border-zinc-800"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-2xl lg:text-3xl text-lime-400 tracking-wider">
              ATORA FIT WEAR
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-display text-sm tracking-widest transition-colors ${
                  location.pathname === link.path
                    ? "text-lime-400"
                    : "text-zinc-300 hover:text-lime-400"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="font-display text-sm tracking-widest text-yellow-400 hover:text-yellow-300"
              >
                ADMIN
              </Link>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-zinc-300 hover:text-lime-400 transition-colors"
            >
              <Search size={20} />
            </button>

            {isAuthenticated ? (
              <Link
                to={isAdmin ? "/admin" : "/"}
                className="hidden sm:flex items-center gap-2 p-2 text-zinc-300 hover:text-lime-400 transition-colors"
              >
                <User size={20} />
                <span className="text-xs font-medium hidden xl:block">{user?.name}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden sm:flex p-2 text-zinc-300 hover:text-lime-400 transition-colors"
              >
                <User size={20} />
              </Link>
            )}

            <button
              onClick={onCartOpen}
              className="relative p-2 text-zinc-300 hover:text-lime-400 transition-colors"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-lime-400 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-zinc-300 hover:text-lime-400 transition-colors"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="pb-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.querySelector("input") as HTMLInputElement;
                if (input.value.trim()) {
                  window.location.href = `/shop?search=${encodeURIComponent(input.value.trim())}`;
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Search products..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-sm px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-lime-400 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="btn-neon text-sm py-2 px-4"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-black/95 backdrop-blur-md border-t border-zinc-800">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block font-display text-lg tracking-widest py-2 ${
                  location.pathname === link.path
                    ? "text-lime-400"
                    : "text-zinc-300"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="block font-display text-lg tracking-widest py-2 text-yellow-400"
              >
                ADMIN PANEL
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
