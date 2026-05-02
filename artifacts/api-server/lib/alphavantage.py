import os
import httpx

BASE_URL = "https://www.alphavantage.co/query"
API_KEY = os.environ.get("ALPHA_VANTAGE_API_KEY")


async def fetch_from_alphavantage(params: dict) -> dict:
    if not API_KEY:
        raise ValueError("ALPHA_VANTAGE_API_KEY not set")
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(BASE_URL, params={"apikey": API_KEY, **params})
        resp.raise_for_status()
        return resp.json()


async def get_global_quote(symbol: str) -> dict | None:
    try:
        data = await fetch_from_alphavantage({"function": "GLOBAL_QUOTE", "symbol": symbol})
        q = data.get("Global Quote", {})
        if not q:
            return None
        return {
            "symbol": q.get("01. symbol"),
            "price": float(q.get("05. price", 0)),
            "open": float(q.get("02. open", 0)),
            "high": float(q.get("03. high", 0)),
            "low": float(q.get("04. low", 0)),
            "volume": float(q.get("06. volume", 0)),
            "change": float(q.get("09. change", 0)),
            "changePercent": float(q.get("10. change percent", "0%").replace("%", "")),
        }
    except Exception:
        return None


async def get_company_overview(symbol: str) -> dict | None:
    try:
        data = await fetch_from_alphavantage({"function": "OVERVIEW", "symbol": symbol})
        if not data.get("Symbol"):
            return None
        return {
            "symbol": data.get("Symbol"),
            "name": data.get("Name"),
            "sector": data.get("Sector"),
            "peRatio": float(data.get("PERatio") or 0),
            "eps": float(data.get("EPS") or 0),
            "marketCap": float(data.get("MarketCapitalization") or 0),
            "dividendYield": float(data.get("DividendYield") or 0),
            "fiftyTwoWeekHigh": float(data.get("52WeekHigh") or 0),
            "fiftyTwoWeekLow": float(data.get("52WeekLow") or 0),
        }
    except Exception:
        return None


async def get_news_and_sentiment(symbol: str, limit: int = 10) -> list:
    try:
        data = await fetch_from_alphavantage({
            "function": "NEWS_SENTIMENT",
            "tickers": symbol,
            "limit": str(limit),
        })
        feed = data.get("feed", [])
        results = []
        for item in feed[:limit]:
            ticker_sentiments = item.get("ticker_sentiment", [])
            ticker_sent = next(
                (ts for ts in ticker_sentiments if ts.get("ticker") == symbol), {}
            )
            sent_score = float(ticker_sent.get("ticker_sentiment_score", 0))
            relevance = float(ticker_sent.get("relevance_score", 0))
            if sent_score >= 0.35:
                sentiment = "Bullish"
            elif sent_score >= 0.15:
                sentiment = "Somewhat-Bullish"
            elif sent_score <= -0.35:
                sentiment = "Bearish"
            elif sent_score <= -0.15:
                sentiment = "Somewhat-Bearish"
            else:
                sentiment = "Neutral"
            results.append({
                "title": item.get("title", ""),
                "summary": item.get("summary", ""),
                "url": item.get("url", ""),
                "source": item.get("source", ""),
                "publishedAt": item.get("time_published", ""),
                "sentiment": sentiment,
                "sentimentScore": sent_score,
                "relevanceScore": relevance,
            })
        return results
    except Exception:
        return []
