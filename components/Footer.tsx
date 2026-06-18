import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Instagram, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block">
              <span className="font-display text-3xl text-lime-400 tracking-wider">
                ATORA FIT WEAR
              </span>
            </Link>
            <p className="mt-4 text-zinc-400 text-sm leading-relaxed">
              Premium gym wear designed for athletes who demand performance and
              style. Push your limits.
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href="https://wa.me/254724357210"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-lime-400 hover:bg-zinc-800 transition-all"
              >
                <MessageCircle size={18} />
              </a>
              <a
                href="https://instagram.com/athora_fit_wear"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-lime-400 hover:bg-zinc-800 transition-all"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://tiktok.com/@gymsportswear(athora.wear)"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-lime-400 hover:bg-zinc-800 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg text-white tracking-wider mb-4">
              QUICK LINKS
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Home", path: "/" },
                { label: "Shop All", path: "/shop" },
                { label: "Track Order", path: "/track" },
                { label: "Size Guide", path: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-zinc-400 hover:text-lime-400 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-display text-lg text-white tracking-wider mb-4">
              CATEGORIES
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Men's Wear", path: "/shop?category=mens-wear" },
                { label: "Women's Wear", path: "/shop?category=womens-wear" },
                { label: "Accessories", path: "/shop?category=accessories" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-zinc-400 hover:text-lime-400 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-lg text-white tracking-wider mb-4">
              CONTACT
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-zinc-400 text-sm">
                <MapPin size={16} className="text-lime-400 mt-0.5 shrink-0" />
                <span>Nairobi, Kenya</span>
              </li>
              <li className="flex items-center gap-3 text-zinc-400 text-sm">
                <Phone size={16} className="text-lime-400 shrink-0" />
                <a href="tel:+254724357210" className="hover:text-lime-400 transition-colors">
                  +254 724 357 210
                </a>
              </li>
              <li className="flex items-center gap-3 text-zinc-400 text-sm">
                <Mail size={16} className="text-lime-400 shrink-0" />
                <a href="mailto:rjmbau630@gmail.com" className="hover:text-lime-400 transition-colors">
                  rjmbau630@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-zinc-500 text-xs">
            &copy; {new Date().getFullYear()} Atora Fit Wear. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-zinc-500">
            <Link to="#" className="hover:text-zinc-300 transition-colors">
              Privacy Policy
            </Link>
            <Link to="#" className="hover:text-zinc-300 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
