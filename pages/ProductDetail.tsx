import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Truck,
  RotateCcw,
  Check,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { formatKES } from "@/types";
import type { CartItem } from "@/hooks/useCart";

interface ProductDetailProps {
  onAddToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
}

export default function ProductDetail({ onAddToCart }: ProductDetailProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = trpc.product.bySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-20 flex flex-col items-center justify-center">
        <h1 className="font-display text-3xl text-white">Product Not Found</h1>
        <Link to="/shop" className="btn-neon mt-4">
          Back to Shop
        </Link>
      </div>
    );
  }

  const price = parseFloat(product.price);

  // Get unique sizes and colors
  const sizes = [...new Set(product.variants?.map((v) => v.size) || [])];
  const colors = [...new Set(product.variants?.map((v) => v.color) || [])];

  // Find matching variant
  const selectedVariant = product.variants?.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  );

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    onAddToCart({
      productId: product.id,
      variantId: selectedVariant.id,
      productName: product.name,
      productImage: product.image,
      size: selectedVariant.size,
      color: selectedVariant.color,
      unitPrice: price,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const inStock = selectedVariant && selectedVariant.stock > 0;
  const lowStock = selectedVariant && selectedVariant.stock < 5 && selectedVariant.stock > 0;

  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Shop
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="aspect-square bg-zinc-900 rounded-lg overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3 mt-4">
                {product.images.map((img, i) => (
                  <div
                    key={i}
                    className="w-20 h-20 bg-zinc-900 rounded-md overflow-hidden cursor-pointer border-2 border-transparent hover:border-lime-400 transition-colors"
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-lime-400 text-xs font-medium tracking-wider uppercase">
              {product.categoryName}
            </span>
            <h1 className="font-display text-3xl sm:text-4xl text-white mt-2">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 mt-3">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className="text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>
              <span className="text-zinc-400 text-sm">(24 reviews)</span>
            </div>

            <p className="text-lime-400 font-bold text-2xl mt-4">
              {formatKES(price)}
            </p>

            <p className="text-zinc-300 mt-4 leading-relaxed">
              {product.description}
            </p>

            {/* Size Selection */}
            <div className="mt-8">
              <h3 className="text-white font-medium text-sm mb-3">
                Size: <span className="text-lime-400">{selectedSize || "Select"}</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const hasStock = product.variants?.some(
                    (v) => v.size === size && v.stock > 0
                  );
                  return (
                    <button
                      key={size}
                      onClick={() => {
                        setSelectedSize(size);
                        setAdded(false);
                      }}
                      disabled={!hasStock}
                      className={`px-4 py-2 text-sm font-medium rounded-sm border transition-colors ${
                        selectedSize === size
                          ? "border-lime-400 text-lime-400 bg-lime-400/10"
                          : hasStock
                          ? "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                          : "border-zinc-800 text-zinc-600 cursor-not-allowed line-through"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Selection */}
            <div className="mt-6">
              <h3 className="text-white font-medium text-sm mb-3">
                Color: <span className="text-lime-400">{selectedColor || "Select"}</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const hasStock = product.variants?.some(
                    (v) => v.color === color && v.stock > 0
                  );
                  return (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        setAdded(false);
                      }}
                      disabled={!hasStock}
                      className={`px-4 py-2 text-sm font-medium rounded-sm border transition-colors ${
                        selectedColor === color
                          ? "border-lime-400 text-lime-400 bg-lime-400/10"
                          : hasStock
                          ? "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                          : "border-zinc-800 text-zinc-600 cursor-not-allowed line-through"
                      }`}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stock Status */}
            {selectedVariant && (
              <div className="mt-4">
                {inStock ? (
                  <p className={`text-sm ${lowStock ? "text-yellow-400" : "text-green-400"}`}>
                    {lowStock
                      ? `Only ${selectedVariant.stock} left in stock - order soon`
                      : `${selectedVariant.stock} in stock`}
                  </p>
                ) : (
                  <p className="text-red-400 text-sm">Out of stock</p>
                )}
              </div>
            )}

            {/* Quantity */}
            <div className="mt-6">
              <h3 className="text-white font-medium text-sm mb-3">Quantity</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 bg-zinc-900 border border-zinc-700 rounded-sm flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="text-white font-bold text-lg w-8 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity(
                      Math.min(selectedVariant?.stock || 10, quantity + 1)
                    )
                  }
                  className="w-10 h-10 bg-zinc-900 border border-zinc-700 rounded-sm flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleAddToCart}
                disabled={!inStock}
                className={`btn-neon flex items-center justify-center gap-2 flex-1 ${
                  added ? "bg-green-500" : ""
                } ${!inStock ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {added ? (
                  <>
                    <Check size={18} />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    Add to Cart
                  </>
                )}
              </button>
              <Link
                to="/shop"
                className="flex items-center justify-center gap-2 px-6 py-3 border border-zinc-600 text-zinc-300 font-bold rounded-sm hover:border-zinc-400 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>

            {/* Features */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { icon: Truck, text: "Fast Delivery" },
                { icon: RotateCcw, text: "Easy Returns" },
              ].map((feature) => (
                <div
                  key={feature.text}
                  className="flex items-center gap-3 bg-zinc-900 rounded-lg p-3"
                >
                  <feature.icon size={18} className="text-lime-400" />
                  <span className="text-zinc-300 text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
