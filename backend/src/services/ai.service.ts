import Groq from "groq-sdk";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import dayjs from "dayjs";

const client = env.groqApiKey ? new Groq({ apiKey: env.groqApiKey }) : null;

const ACTIVE = ["SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const;

interface BusinessContext {
  todaySales: number;
  monthRevenue: number;
  lastMonthRevenue: number;
  inventoryValue: number;
  pendingOrders: number;
  lowStockItems: { name: string; sku: string; qty: number; threshold: number }[];
  outOfStockItems: { name: string; sku: string }[];
  topProducts: { name: string; qty: number; revenue: number }[];
}

// 60-second per-business cache to avoid re-querying DB on every chat message
const contextCache = new Map<string, { data: BusinessContext; expiresAt: number }>();

function getCached(businessId: string): BusinessContext | null {
  const entry = contextCache.get(businessId);
  if (!entry || Date.now() > entry.expiresAt) {
    contextCache.delete(businessId);
    return null;
  }
  return entry.data;
}

function setCache(businessId: string, data: BusinessContext) {
  contextCache.set(businessId, { data, expiresAt: Date.now() + 60_000 });
}

/** Shared: resolves product names for a groupBy result (reused across services) */
export async function resolveProductNames(
  rows: { productId: string; _sum: { quantity?: number | null; total?: string | null } }[],
): Promise<{ name: string; qty: number; revenue: number }[]> {
  const ids = rows.map((r) => r.productId);
  if (ids.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(products.map((p) => [p.id, p.name]));
  return rows.map((r) => ({
    name: nameMap.get(r.productId) ?? "Unknown",
    qty: r._sum.quantity ?? 0,
    revenue: Number(r._sum.total ?? 0),
  }));
}

export async function getBusinessContext(businessId: string): Promise<BusinessContext> {
  const cached = getCached(businessId);
  if (cached) return cached;

  const startOfToday = dayjs().startOf("day").toDate();
  const startOfMonth = dayjs().startOf("month").toDate();
  const lastMonthStart = dayjs().subtract(1, "month").startOf("month").toDate();
  const lastMonthEnd = dayjs().startOf("month").toDate();

  const [todaySalesAgg, monthRevenueAgg, lastMonthRevenueAgg, products, pendingOrders, stocks, topSellingRaw] =
    await Promise.all([
      prisma.invoice.aggregate({
        where: { businessId, status: { in: [...ACTIVE] }, issueDate: { gte: startOfToday } },
        _sum: { grandTotal: true },
      }),
      prisma.invoice.aggregate({
        where: { businessId, status: { in: [...ACTIVE] }, issueDate: { gte: startOfMonth } },
        _sum: { grandTotal: true },
      }),
      prisma.invoice.aggregate({
        where: { businessId, status: { in: [...ACTIVE] }, issueDate: { gte: lastMonthStart, lt: lastMonthEnd } },
        _sum: { grandTotal: true },
      }),
      prisma.product.findMany({
        where: { businessId, isActive: true },
        select: { id: true, name: true, sku: true, lowStockThreshold: true, stocks: { select: { quantity: true } } },
      }),
      prisma.salesOrder.count({
        where: { businessId, status: { in: ["DRAFT", "CONFIRMED", "PARTIALLY_FULFILLED"] } },
      }),
      prisma.stock.findMany({
        where: { product: { businessId } },
        select: { quantity: true, product: { select: { purchasePrice: true } } },
      }),
      prisma.invoiceItem.groupBy({
        by: ["productId"],
        where: { invoice: { businessId, status: { in: [...ACTIVE] } } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
    ]);

  const totalQty = (s: { quantity: number }[]) => s.reduce((a, b) => a + b.quantity, 0);

  const lowStockItems = products
    .filter((p) => {
      const qty = totalQty(p.stocks);
      return qty > 0 && qty <= p.lowStockThreshold;
    })
    .map((p) => ({ name: p.name, sku: p.sku, qty: totalQty(p.stocks), threshold: p.lowStockThreshold }));

  const outOfStockItems = products
    .filter((p) => totalQty(p.stocks) === 0)
    .map((p) => ({ name: p.name, sku: p.sku }));

  const inventoryValue = stocks.reduce((sum, s) => sum + s.quantity * Number(s.product.purchasePrice), 0);

  const topProducts = await resolveProductNames(
    topSellingRaw.map((r) => ({ productId: r.productId, _sum: { quantity: r._sum.quantity, total: String(r._sum.total ?? 0) } })),
  );

  const context: BusinessContext = {
    todaySales: Number(todaySalesAgg._sum.grandTotal ?? 0),
    monthRevenue: Number(monthRevenueAgg._sum.grandTotal ?? 0),
    lastMonthRevenue: Number(lastMonthRevenueAgg._sum.grandTotal ?? 0),
    inventoryValue,
    pendingOrders,
    lowStockItems,
    outOfStockItems,
    topProducts,
  };

  setCache(businessId, context);
  return context;
}

function buildSystemPrompt(ctx: BusinessContext): string {
  const trend =
    ctx.monthRevenue > ctx.lastMonthRevenue * 1.05
      ? "📈 UP vs last month"
      : ctx.monthRevenue < ctx.lastMonthRevenue * 0.95
        ? "📉 DOWN vs last month"
        : "➡️ STABLE vs last month";

  return `You are NEXSRA's AI Business Analyst — a smart assistant embedded in an inventory management platform. You analyze live business data and give specific, actionable advice.

## Live Business Snapshot
- Today's Sales: ${ctx.todaySales.toFixed(2)}
- Monthly Revenue: ${ctx.monthRevenue.toFixed(2)} (${trend})
- Inventory Value: ${ctx.inventoryValue.toFixed(2)}
- Pending Sales Orders: ${ctx.pendingOrders}

## ⚠️ Stock Alerts
Low Stock (${ctx.lowStockItems.length} items):
${ctx.lowStockItems.length > 0 ? ctx.lowStockItems.map((i) => `- ${i.name} [${i.sku}]: ${i.qty} left (reorder at ${i.threshold})`).join("\n") : "None — all good!"}

Out of Stock (${ctx.outOfStockItems.length} items):
${ctx.outOfStockItems.length > 0 ? ctx.outOfStockItems.map((i) => `- ${i.name} [${i.sku}]`).join("\n") : "None — all good!"}

## 🔥 Top Selling Products
${ctx.topProducts.length > 0 ? ctx.topProducts.map((p, i) => `${i + 1}. ${p.name}: ${p.qty} units sold, revenue ${p.revenue.toFixed(2)}`).join("\n") : "No sales data yet"}

## Your Role
- Give specific, data-driven recommendations (not generic advice)
- Highlight urgent items first (out of stock → reorder immediately)
- Suggest specific quantities to reorder based on sales velocity
- Identify revenue opportunities from top-selling products
- Keep responses concise and actionable with bullet points
- Use emojis sparingly for visual scanning
- Respond in the same language the user writes in`;
}

export async function streamChatResponse(
  businessId: string,
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  onText: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
) {
  if (!client) {
    onError("AI assistant is not configured. Add GROQ_API_KEY to enable it.");
    return;
  }

  try {
    const context = await getBusinessContext(businessId);
    const systemPrompt = buildSystemPrompt(context);

    const stream = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: message },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) onText(delta);
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : "An error occurred");
  }
}
