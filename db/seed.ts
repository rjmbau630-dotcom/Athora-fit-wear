import { getDb } from "../api/queries/connection";
import { categories, products, productVariants } from "./schema";
import type { ResultSetHeader } from "mysql2";

const db = getDb();

async function seed() {
  console.log("Seeding database...");

  // Seed categories
  const catsResult = await db.insert(categories).values([
    { name: "Men's Wear", slug: "mens-wear", description: "Premium gym wear for men" },
    { name: "Women's Wear", slug: "womens-wear", description: "Premium gym wear for women" },
    { name: "Accessories", slug: "accessories", description: "Gym accessories and gear" },
  ]);

  const cats = catsResult as unknown as ResultSetHeader[];
  const mensId = cats[0]?.insertId || 1;
  const womensId = mensId + 1;

  // Seed products
  const prodsResult = await db.insert(products).values([
    {
      name: "Elite Performance T-Shirt Set",
      slug: "elite-performance-t-shirt-set",
      description: "Premium moisture-wicking t-shirt and shorts set designed for intense training sessions.",
      price: "2499.00",
      categoryId: mensId,
      image: "/product-men-set.jpg",
      images: ["/product-men-set.jpg", "/product-tank-men.jpg"],
      featured: "true" as const,
      active: "true" as const,
    },
    {
      name: "PowerLift Compression Tights",
      slug: "powerlift-compression-tights",
      description: "High-performance compression leggings with neon green stripe accents.",
      price: "1899.00",
      categoryId: mensId,
      image: "/product-leggings-men.jpg",
      images: ["/product-leggings-men.jpg"],
      featured: "true" as const,
      active: "true" as const,
    },
    {
      name: "Turbo Tank Top",
      slug: "turbo-tank-top",
      description: "Lightweight, sweat-wicking tank top with neon green trim.",
      price: "1299.00",
      categoryId: mensId,
      image: "/product-tank-men.jpg",
      featured: "false" as const,
      active: "true" as const,
    },
    {
      name: "FlexFit Athletic Shorts",
      slug: "flexfit-athletic-shorts",
      description: "Breathable athletic shorts with neon green side stripes.",
      price: "1599.00",
      categoryId: mensId,
      image: "/product-shorts-men.jpg",
      featured: "true" as const,
      active: "true" as const,
    },
    {
      name: "Apex Sports Bra",
      slug: "apex-sports-bra",
      description: "High-impact sports bra with neon green accent straps.",
      price: "1799.00",
      categoryId: womensId,
      image: "/product-bra-women.jpg",
      featured: "true" as const,
      active: "true" as const,
    },
    {
      name: "SculptFit Leggings Set",
      slug: "sculptfit-leggings-set",
      description: "High-waist yoga pants with neon green waistband detail. Includes matching sports bra.",
      price: "3299.00",
      categoryId: womensId,
      image: "/product-women-set.jpg",
      images: ["/product-women-set.jpg", "/product-yoga-women.jpg"],
      featured: "true" as const,
      active: "true" as const,
    },
    {
      name: "FlowState Yoga Pants",
      slug: "flowstate-yoga-pants",
      description: "Premium high-waist yoga pants with neon green waistband accent.",
      price: "2199.00",
      categoryId: womensId,
      image: "/product-yoga-women.jpg",
      featured: "false" as const,
      active: "true" as const,
    },
    {
      name: "Velocity Crop Top",
      slug: "velocity-crop-top",
      description: "Stylish crop top with neon green trim for women.",
      price: "1499.00",
      categoryId: womensId,
      image: "/product-crop-women.jpg",
      featured: "false" as const,
      active: "true" as const,
    },
    {
      name: "NightTrain Zip Hoodie",
      slug: "nighttrain-zip-hoodie",
      description: "Premium athletic hoodie with neon green zipper and logo detail.",
      price: "3499.00",
      categoryId: mensId,
      image: "/product-hoodie.jpg",
      featured: "true" as const,
      active: "true" as const,
    },
    {
      name: "Endurance Joggers",
      slug: "endurance-joggers",
      description: "Slim-fit gym joggers with neon green drawstring and ankle cuffs.",
      price: "2299.00",
      categoryId: mensId,
      image: "/product-joggers.jpg",
      featured: "false" as const,
      active: "true" as const,
    },
  ]);

  const prods = prodsResult as unknown as ResultSetHeader[];

  // Seed variants for each product
  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const colors = ["Black/Neon Green", "All Black", "Grey/Neon"];

  for (let i = 0; i < prods.length; i++) {
    const productId = prods[i]?.insertId || i + 1;
    for (const size of sizes) {
      for (const color of colors) {
        await db.insert(productVariants).values({
          productId: Number(productId),
          size,
          color,
          stock: Math.floor(Math.random() * 50) + 10,
          sku: `ATW-${productId}-${size}-${color.replace(/\//g, "-")}`,
        });
      }
    }
  }

  console.log("Seed complete!");
}

seed().catch(console.error);
