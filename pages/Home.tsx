import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Truck, Shield, Star } from "lucide-react";
import { trpc } from "@/providers/trpc";
import ProductCard from "@/components/ProductCard";
import type { CartItem } from "@/hooks/useCart";

interface HomeProps {
  onAddToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
}

export default function Home({ onAddToCart }: HomeProps) {
  const { data: featuredProducts } = trpc.product.featured.useQuery();

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 },
  };

  return (
    <div className="min-h-screen">
      {/* ─── HERO SECTION ─────────────────────────────── */}
      <section className="relative h-screen min-h-[700px] flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src="/hero-bg.jpg"
            alt="Gym background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block text-lime-400 font-display text-lg tracking-[0.3em] mb-4">
                PREMIUM GYM WEAR
              </span>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl text-white leading-none mb-6">
                ELEVATE YOUR
                <span className="block text-gradient mt-2">PERFORMANCE</span>
              </h1>
              <p className="text-zinc-300 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
                Engineered for athletes. Designed for champions. Premium
                sportswear that pushes boundaries with you.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/shop"
                  className="btn-neon inline-flex items-center gap-2 text-sm sm:text-base"
                >
                  Shop Now
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/shop?category=mens-wear"
                  className="px-6 py-3 border border-zinc-600 text-white font-bold text-sm sm:text-base rounded-sm hover:border-lime-400 hover:text-lime-400 transition-all"
                >
                  Men&apos;s Collection
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Athlete Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-[400px] xl:w-[500px]"
          >
            <img
              src="/hero-athlete.jpg"
              alt="Athlete"
              className="w-full h-auto rounded-lg opacity-90"
              style={{
                maskImage:
                  "linear-gradient(to left, black 60%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to left, black 60%, transparent 100%)",
              }}
            />
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-zinc-500 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-1.5 bg-lime-400 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ─── FEATURES BAR ─────────────────────────────── */}
      <section className="bg-zinc-900/50 border-y border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Truck,
                title: "Free Delivery",
                desc: "On orders over KES 10,000",
              },
              {
                icon: Zap,
                title: "M-Pesa Payment",
                desc: "Fast & secure checkout",
              },
              {
                icon: Shield,
                title: "Quality Guarantee",
                desc: "Premium materials only",
              },
              {
                icon: Star,
                title: "5-Star Rated",
                desc: "Trusted by athletes",
              },
            ].map((feature) => (
              <div key={feature.title} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                  <feature.icon size={20} className="text-lime-400" />
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">
                    {feature.title}
                  </h4>
                  <p className="text-zinc-500 text-xs">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED PRODUCTS ────────────────────────── */}
      <section className="py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <span className="text-lime-400 font-display text-sm tracking-[0.3em]">
              BEST SELLERS
            </span>
            <h2 className="font-display text-4xl sm:text-5xl text-white mt-2">
              FEATURED COLLECTION
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts?.slice(0, 8).map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <ProductCard
                  product={product}
                  onAddToCart={onAddToCart}
                />
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/shop"
              className="btn-neon inline-flex items-center gap-2"
            >
              View All Products
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CATEGORY SECTION ─────────────────────────── */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/collection-bg.jpg"
            alt="Collection"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950/80 to-zinc-950" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <span className="text-lime-400 font-display text-sm tracking-[0.3em]">
              BROWSE
            </span>
            <h2 className="font-display text-4xl sm:text-5xl text-white mt-2">
              SHOP BY CATEGORY
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "MEN'S WEAR",
                image: "/hero-athlete.jpg",
                link: "/shop?category=mens-wear",
                desc: "Performance wear built for strength",
              },
              {
                name: "WOMEN'S WEAR",
                image: "/hero-female.jpg",
                link: "/shop?category=womens-wear",
                desc: "Engineered for the modern athlete",
              },
              {
                name: "ACCESSORIES",
                image: "/section-bg-1.jpg",
                link: "/shop?category=accessories",
                desc: "Complete your training gear",
              },
            ].map((cat) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
              >
                <Link to={cat.link} className="group block relative overflow-hidden rounded-lg aspect-[3/4]">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="font-display text-2xl text-white group-hover:text-lime-400 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-zinc-300 text-sm mt-1">{cat.desc}</p>
                    <div className="flex items-center gap-2 mt-3 text-lime-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Shop Now <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROMO BANNER ─────────────────────────────── */}
      <section
        className="relative py-20 bg-fixed bg-cover bg-center"
        style={{ backgroundImage: "url(/section-bg-2.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-yellow-400 font-display text-sm tracking-[0.3em]">
              LIMITED TIME
            </span>
            <h2 className="font-display text-4xl sm:text-6xl text-white mt-2 mb-4">
              FREE DELIVERY ON
              <span className="block text-gradient">ORDERS OVER KES 10,000</span>
            </h2>
            <p className="text-zinc-300 mb-8">
              Use M-Pesa at checkout for instant payment confirmation. Cash on
              delivery also available.
            </p>
            <Link to="/shop" className="btn-neon inline-flex items-center gap-2">
              Shop Now <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────── */}
      <section className="py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <span className="text-lime-400 font-display text-sm tracking-[0.3em]">
              TESTIMONIALS
            </span>
            <h2 className="font-display text-4xl sm:text-5xl text-white mt-2">
              WHAT ATHLETES SAY
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "James K.",
                text: "The quality is insane. The compression tights are perfect for heavy leg days. Will definitely be buying more!",
                rating: 5,
              },
              {
                name: "Sarah M.",
                text: "Finally found gym wear that actually fits well and looks amazing. The neon green accents are everything!",
                rating: 5,
              },
              {
                name: "David O.",
                text: "M-Pesa payment was smooth, delivery was fast. The hoodie is premium quality. Atora is now my go-to brand.",
                rating: 5,
              },
            ].map((review, index) => (
              <motion.div
                key={review.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-zinc-900 rounded-lg p-6 border border-zinc-800"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className="text-yellow-400 fill-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                  &ldquo;{review.text}&rdquo;
                </p>
                <p className="text-white font-medium text-sm">{review.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LOCATION SECTION ─────────────────────────── */}
      <section className="py-20 bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <motion.div {...fadeInUp}>
              <span className="text-lime-400 font-display text-sm tracking-[0.3em]">
                FIND US
              </span>
              <h2 className="font-display text-4xl sm:text-5xl text-white mt-2 mb-4">
                VISIT OUR STORE
              </h2>
              <p className="text-zinc-400 mb-6 leading-relaxed">
                Come try on our collection in person. Our friendly staff will
                help you find the perfect fit for your training needs.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-lime-400">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Location</h4>
                    <p className="text-zinc-400 text-sm">Nairobi, Kenya</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-lime-400">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Phone</h4>
                    <p className="text-zinc-400 text-sm">+254 724 357 210</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-lg overflow-hidden border border-zinc-800"
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255281.19891806886!2d36.68248865!3d-1.30286185!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f1172d84d49a7%3A0xf7cf0254b297924c!2sNairobi!5e0!3m2!1sen!2ske!4v1699900000000!5m2!1sen!2ske"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale hover:grayscale-0 transition-all duration-500"
              />
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
