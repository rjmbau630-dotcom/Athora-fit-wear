import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatKES, ORDER_STATUS_LABELS } from "@/types";

type Tab = "dashboard" | "products" | "orders";

export default function Admin() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/");
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs = [
    { key: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
    { key: "products" as Tab, label: "Products", icon: Package },
    { key: "orders" as Tab, label: "Orders", icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl text-white">ADMIN PANEL</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Welcome back, {user?.name}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-lime-400 text-black"
                  : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "products" && <ProductsTab />}
        {activeTab === "orders" && <OrdersTab />}
      </div>
    </div>
  );
}

// ─── DASHBOARD TAB ──────────────────────────────────────
function DashboardTab() {
  const { data: stats } = trpc.admin.stats.useQuery(undefined, {
    retry: false,
  });

  const statCards = [
    {
      label: "Total Orders",
      value: stats?.totalOrders ?? 0,
      icon: ShoppingBag,
      color: "text-blue-400 bg-blue-400/10",
    },
    {
      label: "Total Revenue",
      value: stats?.totalRevenue ? formatKES(stats.totalRevenue) : formatKES(0),
      icon: TrendingUp,
      color: "text-lime-400 bg-lime-400/10",
    },
    {
      label: "Pending Orders",
      value: stats?.pendingOrders ?? 0,
      icon: Clock,
      color: "text-yellow-400 bg-yellow-400/10",
    },
    {
      label: "Processing",
      value: stats?.processingOrders ?? 0,
      icon: CheckCircle,
      color: "text-purple-400 bg-purple-400/10",
    },
    {
      label: "Total Products",
      value: stats?.totalProducts ?? 0,
      icon: Package,
      color: "text-cyan-400 bg-cyan-400/10",
    },
    {
      label: "Low Stock Items",
      value: stats?.lowStock ?? 0,
      icon: AlertTriangle,
      color: "text-red-400 bg-red-400/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 rounded-lg border border-zinc-800 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">{stat.label}</p>
                <p className="text-white font-bold text-2xl mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── PRODUCTS TAB ───────────────────────────────────────
function ProductsTab() {
  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.admin.products.useQuery(undefined, {
    retry: false,
  });

  const deleteMutation = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => utils.admin.products.invalidate(),
  });

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editStock, setEditStock] = useState<Record<number, number>>({});
  const updateVariantStock = trpc.admin.updateVariantStock.useMutation({
    onSuccess: () => {
      utils.admin.products.invalidate();
      setEditingProduct(null);
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    image: "",
    categoryId: "",
  });

  const createProduct = trpc.admin.createProduct.useMutation({
    onSuccess: () => {
      utils.admin.products.invalidate();
      setShowForm(false);
      setFormData({ name: "", slug: "", description: "", price: "", image: "", categoryId: "" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-");
    createProduct.mutate({
      name: formData.name,
      slug,
      description: formData.description,
      price: parseFloat(formData.price),
      image: formData.image,
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : undefined,
      variants: [
        { size: "M", color: "Black/Neon Green", stock: 20 },
        { size: "L", color: "Black/Neon Green", stock: 20 },
        { size: "XL", color: "Black/Neon Green", stock: 20 },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search products..."
            className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none w-64"
          />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-neon flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Add Product Form */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          onSubmit={handleSubmit}
          className="bg-zinc-900 rounded-lg border border-zinc-800 p-6"
        >
          <h3 className="font-display text-lg text-white mb-4">
            ADD NEW PRODUCT
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 text-sm mb-1 block">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2 text-sm text-white focus:border-lime-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-sm mb-1 block">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="auto-generated if empty"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2 text-sm text-white focus:border-lime-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-sm mb-1 block">Price (KES) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                min="0"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2 text-sm text-white focus:border-lime-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-sm mb-1 block">Image URL *</label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                required
                placeholder="/product-image.jpg"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2 text-sm text-white focus:border-lime-400 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-zinc-400 text-sm mb-1 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-2 text-sm text-white focus:border-lime-400 focus:outline-none resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="btn-neon text-sm" disabled={createProduct.isPending}>
              {createProduct.isPending ? "Creating..." : "Create Product"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-zinc-600 text-zinc-400 rounded-sm hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </motion.form>
      )}

      {/* Products Table */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-400 font-medium px-4 py-3">Product</th>
                  <th className="text-left text-zinc-400 font-medium px-4 py-3">Price</th>
                  <th className="text-left text-zinc-400 font-medium px-4 py-3">Variants</th>
                  <th className="text-left text-zinc-400 font-medium px-4 py-3">Stock</th>
                  <th className="text-right text-zinc-400 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products?.map((product) => (
                  <tr key={product.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div>
                          <p className="text-white font-medium">{product.name}</p>
                          <p className="text-zinc-500 text-xs">{product.categoryName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-lime-400 font-medium">
                      {formatKES(parseFloat(product.price))}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {product.variants?.length || 0} variants
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {product.variants?.slice(0, 3).map((v) => (
                          <span
                            key={v.id}
                            className={`text-xs px-2 py-0.5 rounded ${
                              v.stock < 5
                                ? "bg-red-400/10 text-red-400"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {v.size}:{v.stock}
                          </span>
                        ))}
                        {(product.variants?.length || 0) > 3 && (
                          <span className="text-xs text-zinc-500 px-1">
                            +{(product.variants?.length || 0) - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            if (editingProduct === product.id) {
                              setEditingProduct(null);
                            } else {
                              setEditingProduct(product.id);
                              const stockMap: Record<number, number> = {};
                              product.variants?.forEach((v) => {
                                stockMap[v.id] = v.stock;
                              });
                              setEditStock(stockMap);
                            }
                          }}
                          className="p-1.5 text-zinc-400 hover:text-lime-400 transition-colors"
                          title="Edit stock"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this product?")) {
                              deleteMutation.mutate({ id: product.id });
                            }
                          }}
                          className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Edit Panel */}
      {editingProduct && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 rounded-lg border border-lime-400/30 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-white">
              EDIT STOCK -{" "}
              {products?.find((p) => p.id === editingProduct)?.name}
            </h3>
            <button
              onClick={() => setEditingProduct(null)}
              className="p-1 text-zinc-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {products
              ?.find((p) => p.id === editingProduct)
              ?.variants?.map((variant) => (
                <div
                  key={variant.id}
                  className="bg-zinc-950 rounded-lg p-3 border border-zinc-800"
                >
                  <p className="text-zinc-400 text-xs">{variant.size}</p>
                  <p className="text-zinc-500 text-[10px]">{variant.color}</p>
                  <input
                    type="number"
                    value={editStock[variant.id] ?? variant.stock}
                    onChange={(e) =>
                      setEditStock({
                        ...editStock,
                        [variant.id]: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white mt-2 focus:border-lime-400 focus:outline-none"
                  />
                  <button
                    onClick={() =>
                      updateVariantStock.mutate({
                        variantId: variant.id,
                        stock: editStock[variant.id] ?? variant.stock,
                      })
                    }
                    className="w-full mt-2 bg-lime-400 text-black text-xs font-bold py-1 rounded-sm hover:bg-lime-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <Save size={10} />
                    Save
                  </button>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── ORDERS TAB ─────────────────────────────────────────
function OrdersTab() {
  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.admin.recentOrders.useQuery(undefined, {
    retry: false,
  });

  const updateStatus = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => utils.admin.recentOrders.invalidate(),
  });

  const [filterStatus, setFilterStatus] = useState("");

  const filteredOrders = filterStatus
    ? orders?.filter((o) => o.status === filterStatus)
    : orders;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFilterStatus("")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !filterStatus
              ? "bg-lime-400 text-black"
              : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          All
        </button>
        {["pending", "processing", "shipped", "delivered"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filterStatus === status
                ? "bg-lime-400 text-black"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-400 font-medium px-4 py-3">Order #</th>
                  <th className="text-left text-zinc-400 font-medium px-4 py-3">Customer</th>
                  <th className="text-left text-zinc-400 font-medium px-4 py-3">Items</th>
                  <th className="text-left text-zinc-400 font-medium px-4 py-3">Total</th>
                  <th className="text-left text-zinc-400 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-zinc-400 font-medium px-4 py-3">Date</th>
                  <th className="text-right text-zinc-400 font-medium px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                      No orders found
                    </td>
                  </tr>
                )}
                {filteredOrders?.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                  >
                    <td className="px-4 py-3">
                      <span className="text-lime-400 font-mono text-xs">
                        {order.orderNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{order.customerName}</p>
                      <p className="text-zinc-500 text-xs">{order.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {order.items?.length || 0} items
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      {formatKES(parseFloat(order.total))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                          ORDER_STATUS_LABELS[order.status]?.color
                        }`}
                      >
                        {ORDER_STATUS_LABELS[order.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateStatus.mutate({
                            orderId: order.id,
                            status: e.target.value as "pending" | "processing" | "shipped" | "delivered" | "cancelled",
                          })
                        }
                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:border-lime-400 focus:outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
