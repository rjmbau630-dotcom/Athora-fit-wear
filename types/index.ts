export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  image: string;
  images: string[] | null;
  featured: string;
  categoryId: number | null;
  categoryName: string | null;
  variants: ProductVariant[];
  createdAt: Date;
}

export interface ProductVariant {
  id: number;
  productId: number | null;
  size: string;
  color: string;
  stock: number;
  sku: string | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: string;
  city: string;
  deliveryMethod: "pickup" | "delivery";
  paymentMethod: "mpesa" | "cod";
  paymentPhone: string | null;
  mpesaCode: string | null;
  subtotal: string;
  deliveryFee: string;
  total: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  notes: string | null;
  createdAt: Date;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  variantId: number | null;
  productName: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: string;
  total: string;
}

export const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10" },
  processing: { label: "Processing", color: "text-blue-400 bg-blue-400/10" },
  shipped: { label: "Shipped", color: "text-purple-400 bg-purple-400/10" },
  delivered: { label: "Delivered", color: "text-green-400 bg-green-400/10" },
  cancelled: { label: "Cancelled", color: "text-red-400 bg-red-400/10" },
};

export const FREE_DELIVERY_THRESHOLD = 10000;
export const BASE_DELIVERY_FEE = 300;

export function calculateDeliveryFee(subtotal: number, distance?: number): number {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  if (distance) {
    return Math.min(BASE_DELIVERY_FEE + distance * 20, 800);
  }
  return BASE_DELIVERY_FEE;
}

export function formatKES(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `KES ${num.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
