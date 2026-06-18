import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { products, productVariants, categories } from "@db/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";

export const productRouter = createRouter({
  // ── Categories ───────────────────────────────────────
  categories: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(categories).orderBy(categories.name);
  }),

  // ── List Products ────────────────────────────────────
  list: publicQuery
    .input(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        featured: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.category) {
        conditions.push(eq(categories.slug, input.category));
      }
      if (input?.search) {
        conditions.push(like(products.name, `%${input.search}%`));
      }
      if (input?.featured) {
        conditions.push(eq(products.featured, "true"));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

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
          categoryId: products.categoryId,
          categoryName: categories.name,
          createdAt: products.createdAt,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(where)
        .orderBy(desc(products.createdAt));

      // Fetch variants for each product
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

  // ── Get Single Product ───────────────────────────────
  bySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();

      const [product] = await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          price: products.price,
          image: products.image,
          images: products.images,
          featured: products.featured,
          categoryId: products.categoryId,
          categoryName: categories.name,
          createdAt: products.createdAt,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.slug, input.slug))
        .limit(1);

      if (!product) return null;

      const variants = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, product.id));

      return { ...product, variants };
    }),

  // ── Get Featured Products ────────────────────────────
  featured: publicQuery.query(async () => {
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
        categoryId: products.categoryId,
        categoryName: categories.name,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.featured, "true"))
      .orderBy(desc(products.createdAt))
      .limit(8);

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
});
