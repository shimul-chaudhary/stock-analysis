from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from lib.alphavantage import get_global_quote
from lib.database import get_conn

router = APIRouter()

HIGH_GEO = {"MRVL", "SMCI", "ONTO", "IONQ", "QUBT", "RGTI"}
CRITICAL_GEO = {"NVDA", "SMCI"}


def geo_risk(symbol: str) -> str:
    if symbol in CRITICAL_GEO:
        return "Critical"
    if symbol in HIGH_GEO:
        return "High"
    return "Low"


async def enrich_holding(row: dict) -> dict:
    current_price = float(row["avgCost"])
    try:
        quote = await get_global_quote(row["symbol"])
        if quote and quote["price"]:
            current_price = quote["price"]
    except Exception:
        pass

    shares = float(row["shares"])
    avg_cost = float(row["avgCost"])
    total_value = current_price * shares
    gain_loss = (current_price - avg_cost) * shares
    gain_loss_pct = ((current_price - avg_cost) / avg_cost * 100) if avg_cost > 0 else 0.0

    return {
        "id": row["id"],
        "symbol": row["symbol"],
        "name": row["name"],
        "shares": shares,
        "avgCost": avg_cost,
        "notes": row.get("notes"),
        "addedAt": row["addedAt"].isoformat() if isinstance(row["addedAt"], datetime) else str(row["addedAt"]),
        "currentPrice": current_price,
        "totalValue": total_value,
        "gainLoss": gain_loss,
        "gainLossPercent": gain_loss_pct,
        "geopoliticalRisk": geo_risk(row["symbol"]),
    }


class CreateHolding(BaseModel):
    symbol: str
    name: str
    shares: float
    avgCost: float
    notes: Optional[str] = None


class UpdateHolding(BaseModel):
    shares: Optional[float] = None
    avgCost: Optional[float] = None
    notes: Optional[str] = None


@router.get("/holdings")
async def list_holdings():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM holdings ORDER BY "addedAt" ASC')
            rows = cur.fetchall()
    import asyncio
    enriched = await asyncio.gather(*[enrich_holding(dict(r)) for r in rows])
    return list(enriched)


@router.post("/holdings", status_code=201)
async def create_holding(body: CreateHolding):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'INSERT INTO holdings (symbol, name, shares, "avgCost", notes, "addedAt") '
                'VALUES (%s, %s, %s, %s, %s, %s) RETURNING *',
                (body.symbol.upper(), body.name, body.shares, body.avgCost, body.notes,
                 datetime.now(timezone.utc)),
            )
            row = dict(cur.fetchone())
    return await enrich_holding(row)


@router.put("/holdings/{holding_id}")
async def update_holding(holding_id: int, body: UpdateHolding):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(
        f'"{k if k != "avgCost" else "avgCost"}" = %s' if k == "avgCost"
        else f"{k} = %s"
        for k in updates
    )
    values = list(updates.values()) + [holding_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f'UPDATE holdings SET {set_clause} WHERE id = %s RETURNING *',
                values,
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Not found")
            row = dict(row)
    return await enrich_holding(row)


@router.delete("/holdings/{holding_id}", status_code=204)
async def delete_holding(holding_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM holdings WHERE id = %s", (holding_id,))
    return None
