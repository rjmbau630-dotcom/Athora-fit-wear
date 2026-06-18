import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, productVariants } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";

function generateOrderNumber(): string {
  const prefix = "ATW";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

export const orderRouter = createRouter({
  // ── Create Order ─────────────────────────────────────
  create: publicQuery
    .input(
      z.object({
        customerName: z.string().min(2),
        customerPhone: z.string().min(10),
        customerEmail: z.string().email().optional(),
        address: z.string().min(5),
        city: z.string().min(2),
        deliveryMethod: z.enum(["pickup", "delivery"]),
        paymentMethod: z.enum(["mpesa", "cod"]),
        paymentPhone: z.string().optional(),
        subtotal: z.number().positive(),
        deliveryFee: z.number().min(0),
        total: z.number().positive(),
        items: z.array(
          z.object({
            productId: z.number(),
            variantId: z.number().optional(),
            productName: z.string(),
            size: z.string().optional(),
            color: z.string().optional(),
            quantity: z.number().positive(),
            unitPrice: z.number().positive(),
            total: z.number().positive(),
          })
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const orderNumber = generateOrderNumber();

      // Insert order
      const [order] = await db.insert(orders).values({
        orderNumber,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        address: input.address,
        city: input.city,
        deliveryMethod: input.deliveryMethod,
        paymentMethod: input.paymentMethod,
        paymentPhone: input.paymentPhone,
        subtotal: input.subtotal.toFixed(2),
        deliveryFee: input.deliveryFee.toFixed(2),
        total: input.total.toFixed(2),
        status: "pending",
        notes: input.notes,
      });

      const orderId = Number(order.insertId);

      // Insert order items
      for (const item of input.items) {
        await db.insert(orderItems).values({
          orderId,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          total: item.total.toFixed(2),
        });

        // Decrease stock if variant exists
        if (item.variantId) {
          await db
            .update(productVariants)
            .set({
              stock: sql`${productVariants.stock} - ${item.quantity}`,
            })
            .where(eq(productVariants.id, item.variantId));
        }
      }

      return { orderNumber, orderId };
    }),

  // ── Get Order by Number + Phone ──────────────────────
  lookup: publicQuery
    .input(
      z.object({
        orderNumber: z.string(),
        phone: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();

      const [order] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.orderNumber, input.orderNumber),
            eq(orders.customerPhone, input.phone)
          )
        )
        .limit(1);

      if (!order) return null;

      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      return { ...order, items };
    }),
});
