import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Filter, SlidersHorizontal, X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import ProductCard from "@/components/ProductCard";
import type { CartItem } from "@/hooks/useCart";

interface ShopProps {
  onAddToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
}

export default function Shop({ onAddToCart }: ShopProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [showFilters, setShowFilters] = useState(false);

  const { data: products, isLoading } = trpc.product.list.useQuery({
    category: selectedCategory || undefined,
    search: searchQuery || undefined,
  });

  const { data: categories } = trpc.product.categories.useQuery();

  // Filter products by size/color
  const filteredProducts = products?.filter((product) => {
    if (selectedSize && !product.variants?.some((v) => v.size === selectedSize)) return false;
    if (selectedColor && !product.variants?.some((v) => v.color.includes(selectedColor))) return false;
    return true;
  });

  const allSizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const allColors = ["Black", "Green", "Grey"];

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedSize("");
    setSelectedColor("");
    setSearchQuery("");
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      {/* Header */}
      <section className="relative py-12 bg-zinc-900/50 border-b border-zinc-800">
        <div className="absolute inset-0 opacity-20">
          <img src="/section-bg-1.jpg" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="font-display text-4xl sm:text-5xl text-white">
              ALL PRODUCTS
            </h1>
            <p className="text-zinc-400 mt-2">
              {filteredProducts?.length || 0} products available
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden flex items-center gap-2 text-white text-sm font-medium py-2 px-4 bg-zinc-900 rounded-lg w-fit"
          >
            <SlidersHorizontal size={16} />
            Filters
            {(selectedCategory || selectedSize || selectedColor) && (
              <span className="w-2 h-2 bg-lime-400 rounded-full" />
            )}
          </button>

          {/* Sidebar Filters */}
          <aside
            className={`lg:w-64 shrink-0 space-y-6 ${
              showFilters ? "block" : "hidden lg:block"
            }`}
          >
            {/* Search */}
            <div>
              <h3 className="font-display text-white tracking-wider mb-3">
                SEARCH
              </h3>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-sm px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-lime-400 focus:outline-none"
              />
            </div>

            {/* Categories */}
            <div>
              <h3 className="font-display text-white tracking-wider mb-3">
                CATEGORIES
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory("")}
                  className={`block text-sm w-full text-left py-1 px-2 rounded transition-colors ${
                    !selectedCategory
                      ? "text-lime-400 bg-lime-400/10"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  All Categories
                </button>
                {categories?.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`block text-sm w-full text-left py-1 px-2 rounded transition-colors ${
                      selectedCategory === cat.slug
                        ? "text-lime-400 bg-lime-400/10"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h3 className="font-display text-white tracking-wider mb-3">
                SIZES
              </h3>
              <div className="flex flex-wrap gap-2">
                {allSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() =>
                      setSelectedSize(selectedSize === size ? "" : size)
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-colors ${
                      selectedSize === size
                        ? "border-lime-400 text-lime-400 bg-lime-400/10"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <h3 className="font-display text-white tracking-wider mb-3">
                COLORS
              </h3>
              <div className="space-y-2">
                {allColors.map((color) => (
                  <button
                    key={color}
                    onClick={() =>
                      setSelectedColor(selectedColor === color ? "" : color)
                    }
                    className={`flex items-center gap-2 text-sm w-full text-left py-1 px-2 rounded transition-colors ${
                      selectedColor === color
                        ? "text-lime-400 bg-lime-400/10"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border border-zinc-600 ${
                        color === "Black"
                          ? "bg-black"
                          : color === "Green"
                          ? "bg-lime-500"
                          : "bg-zinc-500"
                      }`}
                    />
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedCategory || selectedSize || selectedColor || searchQuery) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-red-400 text-sm hover:text-red-300 transition-colors"
              >
                <X size={14} />
                Clear All Filters
              </button>
            )}
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-zinc-900 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : filteredProducts?.length === 0 ? (
              <div className="text-center py-20">
                <Filter size={48} className="text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-400 font-display text-xl">
                  No products found
                </p>
                <p className="text-zinc-600 text-sm mt-2">
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts?.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <ProductCard
                      product={product}
                      onAddToCart={onAddToCart}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
