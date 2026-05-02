import { Router } from "express";
import { db } from "@workspace/db";
import { holdingsTable, insertHoldingSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getGlobalQuote } from "../../lib/alphavantage";
import { CreateHoldingBody, UpdateHoldingBody } from "@workspace/api-zod";

const router = Router();

async function enrichHolding(h: typeof holdingsTable.$inferSelect) {
  let currentPrice = h.avgCost;
  let geopoliticalRisk: "Low" | "Medium" | "High" | "Critical" = "Medium";
  try {
    const quote = await getGlobalQuote(h.symbol);
    if (quote?.price) currentPrice = quote.price;
  } catch {
    // fall back to avgCost
  }
  const HIGH_GEO = ["NVDA", "MRVL", "SMCI", "ONTO", "IONQ", "QUBT", "RGTI"];
  const CRITICAL_GEO = ["NVDA", "SMCI"];
  if (CRITICAL_GEO.includes(h.symbol)) geopoliticalRisk = "Critical";
  else if (HIGH_GEO.includes(h.symbol)) geopoliticalRisk = "High";
  else geopoliticalRisk = "Low";

  const totalValue = currentPrice * h.shares;
  const gainLoss = (currentPrice - h.avgCost) * h.shares;
  const gainLossPercent = h.avgCost > 0 ? ((currentPrice - h.avgCost) / h.avgCost) * 100 : 0;
  return {
    ...h,
    currentPrice,
    totalValue,
    gainLoss,
    gainLossPercent,
    geopoliticalRisk,
    notes: h.notes ?? undefined,
  };
}

router.get("/holdings", async (req, res) => {
  try {
    const rows = await db.select().from(holdingsTable).orderBy(holdingsTable.addedAt);
    const enriched = await Promise.all(rows.map(enrichHolding));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch holdings" });
  }
});

router.post("/holdings", async (req, res) => {
  const parsed = CreateHoldingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  try {
    const [holding] = await db.insert(holdingsTable).values({
      symbol: parsed.data.symbol.toUpperCase(),
      name: parsed.data.name,
      shares: parsed.data.shares,
      avgCost: parsed.data.avgCost,
      notes: parsed.data.notes,
    }).returning();
    const enriched = await enrichHolding(holding);
    res.status(201).json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create holding" });
  }
});

router.put("/holdings/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateHoldingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  try {
    const updates: Partial<{ shares: number; avgCost: number; notes: string }> = {};
    if (parsed.data.shares !== undefined) updates.shares = parsed.data.shares;
    if (parsed.data.avgCost !== undefined) updates.avgCost = parsed.data.avgCost;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    const [holding] = await db.update(holdingsTable).set(updates).where(eq(holdingsTable.id, id)).returning();
    if (!holding) { res.status(404).json({ error: "Not found" }); return; }
    const enriched = await enrichHolding(holding);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update holding" });
  }
});

router.delete("/holdings/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(holdingsTable).where(eq(holdingsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete holding" });
  }
});

export default router;
