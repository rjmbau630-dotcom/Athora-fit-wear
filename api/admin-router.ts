import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  products,
  productVariants,
  categories,
  orders,
  orderItems,
} from "@db/schema";
import { eq, desc, sql, count } from "drizzle-orm";

export const adminRouter = createRouter({
  // ── Dashboard Stats ──────────────────────────────────
  stats: adminQuery.query(async () => {
    const db = getDb();

    const [orderStats] = await db
      .select({
        totalOrders: count(orders.id),
        totalRevenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        pendingOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'pending' THEN 1 ELSE 0 END)`,
        processingOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'processing' THEN 1 ELSE 0 END)`,
      })
      .from(orders);

    const [productStats] = await db
      .select({
        totalProducts: count(products.id),
        lowStock: sql<number>`SUM(CASE WHEN ${productVariants.stock} < 5 THEN 1 ELSE 0 END)`,
      })
      .from(products)
      .leftJoin(productVariants, eq(products.id, productVariants.productId));

    return {
      ...orderStats,
      ...productStats,
    };
  }),

  // ── Recent Orders ────────────────────────────────────
  recentOrders: adminQuery.query(async () => {
    const db = getDb();

    const results = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(50);

    const ordersWithItems = [];
    for (const order of results) {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      ordersWithItems.push({ ...order, items });
    }

    return ordersWithItems;
  }),

  // ── Update Order Status ──────────────────────────────
  updateOrderStatus: adminQuery
    .input(
      z.object({
        orderId: z.number(),
        status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(orders)
        .set({ status: input.status })
        .where(eq(orders.id, input.orderId));
      return { success: true };
    }),

  // ── All Products (Admin) ─────────────────────────────
  products: adminQuery.query(async () => {
    const db = getDb();

    const results = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        image: products.image,
        images: products.images,
        featured: products.featured,
        active: products.active,
        categoryId: products.categoryId,
        categoryName: categories.name,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.createdAt));

    const productIds = results.map((r) => r.id);
    let variants: Array<{
      id: number;
      productId: number | null;
      size: string;
      color: string;
      stock: number;
      sku: string | null;
    }> = [];

    if (productIds.length > 0) {
      variants = await db
        .select()
        .from(productVariants)
        .where(sql`${productVariants.productId} IN (${productIds.join(",")})`);
    }

    return results.map((product) => ({
      ...product,
      variants: variants.filter((v) => v.productId === product.id),
    }));
  }),

  // ── Create Product ───────────────────────────────────
  createProduct: adminQuery
    .input(
      z.object({
        name: z.string().min(2),
        slug: z.string().min(2),
        description: z.string().optional(),
        price: z.number().positive(),
        categoryId: z.number().optional(),
        image: z.string().min(1),
        images: z.array(z.string()).optional(),
        featured: z.boolean().default(false),
        variants: z.array(
          z.object({
            size: z.string(),
            color: z.string(),
            stock: z.number().min(0),
            sku: z.string().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const [product] = await db.insert(products).values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        price: input.price.toFixed(2),
        categoryId: input.categoryId,
        image: input.image,
        images: input.images || [input.image],
        featured: input.featured ? "true" : "false",
        active: "true",
      });

      const productId = Number(product.insertId);

      if (input.variants && input.variants.length > 0) {
        for (const variant of input.variants) {
          await db.insert(productVariants).values({
            productId,
            size: variant.size,
            color: variant.color,
            stock: variant.stock,
            sku: variant.sku,
          });
        }
      }

      return { productId, success: true };
    }),

  // ── Update Product ───────────────────────────────────
  updateProduct: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(2).optional(),
        slug: z.string().min(2).optional(),
        description: z.string().optional(),
        price: z.number().positive().optional(),
        categoryId: z.number().optional(),
        image: z.string().optional(),
        images: z.array(z.string()).optional(),
        featured: z.boolean().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updates } = input;

      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.slug !== undefined) updateData.slug = updates.slug;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.price !== undefined) updateData.price = updates.price.toFixed(2);
      if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId;
      if (updates.image !== undefined) updateData.image = updates.image;
      if (updates.images !== undefined) updateData.images = updates.images;
      if (updates.featured !== undefined) updateData.featured = updates.featured ? "true" : "false";
      if (updates.active !== undefined) updateData.active = updates.active ? "true" : "false";

      await db.update(products).set(updateData).where(eq(products.id, id));
      return { success: true };
    }),

  // ── Delete Product ───────────────────────────────────
  deleteProduct: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(productVariants).where(eq(productVariants.productId, input.id));
      await db.delete(products).where(eq(products.id, input.id));
      return { success: true };
    }),

  // ── Add Variant ──────────────────────────────────────
  addVariant: adminQuery
    .input(
      z.object({
        productId: z.number(),
        size: z.string(),
        color: z.string(),
        stock: z.number().min(0),
        sku: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(productVariants).values(input);
      return { success: true };
    }),

  // ── Update Variant Stock ─────────────────────────────
  updateVariantStock: adminQuery
    .input(
      z.object({
        variantId: z.number(),
        stock: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(productVariants)
        .set({ stock: input.stock })
        .where(eq(productVariants.id, input.variantId));
      return { success: true };
    }),

  // ── Delete Variant ───────────────────────────────────
  deleteVariant: adminQuery
    .input(z.object({ variantId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .delete(productVariants)
        .where(eq(productVariants.id, input.variantId));
      return { success: true };
    }),

  // ── Create Category ──────────────────────────────────
  createCategory: adminQuery
    .input(
      z.object({
        name: z.string().min(2),
        slug: z.string().min(2),
        description: z.string().optional(),
        image: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(categories).values(input);
      return { success: true };
    }),
});
