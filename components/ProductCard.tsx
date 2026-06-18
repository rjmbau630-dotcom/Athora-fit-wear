import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { formatKES, type Product } from "@/types";
import type { CartItem } from "@/hooks/useCart";

interface ProductCardProps {
  product: Product;
  onAddToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const price = parseFloat(product.price);
  const firstVariant = product.variants?.[0];

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (firstVariant) {
      onAddToCart({
        productId: product.id,
        variantId: firstVariant.id,
        productName: product.name,
        productImage: product.image,
        size: firstVariant.size,
        color: firstVariant.color,
        unitPrice: price,
      });
    }
  };

  return (
    <div className="group card-hover">
      <Link to={`/product/${product.slug}`} className="block">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-900">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

          {/* Quick Add Button */}
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-3 right-3 w-10 h-10 bg-lime-400 text-black rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-lime-300"
          >
            <ShoppingCart size={18} />
          </button>

          {/* Featured Badge */}
          {product.featured === "true" && (
            <span className="absolute top-3 left-3 bg-lime-400 text-black text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider">
              Featured
            </span>
          )}
        </div>

        {/* Info */}
        <div className="mt-3 px-1">
          <h3 className="text-white text-sm font-medium truncate group-hover:text-lime-400 transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-lime-400 font-bold">
              {formatKES(price)}
            </span>
            <span className="text-zinc-500 text-xs">
              {product.variants?.length || 0} options
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
