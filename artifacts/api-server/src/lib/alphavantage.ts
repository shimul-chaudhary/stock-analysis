const BASE_URL = "https://www.alphavantage.co/query";
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

export async function fetchFromAlphaVantage(params: Record<string, string>): Promise<unknown> {
  if (!API_KEY) throw new Error("ALPHA_VANTAGE_API_KEY not set");
  const url = new URL(BASE_URL);
  url.searchParams.set("apikey", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Alpha Vantage error: ${res.status}`);
  return res.json();
}

export async function getGlobalQuote(symbol: string) {
  const data = await fetchFromAlphaVantage({ function: "GLOBAL_QUOTE", symbol }) as Record<string, unknown>;
  const q = data["Global Quote"] as Record<string, string> | undefined;
  if (!q) return null;
  return {
    symbol: q["01. symbol"],
    price: parseFloat(q["05. price"] ?? "0"),
    open: parseFloat(q["02. open"] ?? "0"),
    high: parseFloat(q["03. high"] ?? "0"),
    low: parseFloat(q["04. low"] ?? "0"),
    volume: parseFloat(q["06. volume"] ?? "0"),
    change: parseFloat(q["09. change"] ?? "0"),
    changePercent: parseFloat((q["10. change percent"] ?? "0%").replace("%", "")),
    fiftyTwoWeekHigh: 0,
    fiftyTwoWeekLow: 0,
  };
}

export async function getCompanyOverview(symbol: string) {
  const data = await fetchFromAlphaVantage({ function: "OVERVIEW", symbol }) as Record<string, string>;
  if (!data.Symbol) return null;
  return {
    symbol: data.Symbol,
    name: data.Name,
    sector: data.Sector,
    peRatio: parseFloat(data.PERatio ?? "0") || 0,
    eps: parseFloat(data.EPS ?? "0") || 0,
    marketCap: parseFloat(data.MarketCapitalization ?? "0") || 0,
    dividendYield: parseFloat(data.DividendYield ?? "0") || 0,
    fiftyTwoWeekHigh: parseFloat(data["52WeekHigh"] ?? "0") || 0,
    fiftyTwoWeekLow: parseFloat(data["52WeekLow"] ?? "0") || 0,
    revenueGrowthTTM: parseFloat(data.QuarterlyRevenueGrowthYOY ?? "0") || 0,
    grossProfitTTM: parseFloat(data.GrossProfitTTM ?? "0") || 0,
    revenueTTM: parseFloat(data.RevenueTTM ?? "0") || 0,
  };
}

export async function getNewsAndSentiment(symbol: string, limit = 10) {
  const data = await fetchFromAlphaVantage({
    function: "NEWS_SENTIMENT",
    tickers: symbol,
    limit: String(limit),
  }) as Record<string, unknown>;
  const feed = (data.feed as unknown[]) ?? [];
  return feed.slice(0, limit).map((item: unknown) => {
    const a = item as Record<string, unknown>;
    const tickerSentiments = (a.ticker_sentiment as unknown[]) ?? [];
    const tickerSent = tickerSentiments.find((ts) => {
      const t = ts as Record<string, string>;
      return t.ticker === symbol;
    }) as Record<string, string> | undefined;
    const sentScore = parseFloat(tickerSent?.ticker_sentiment_score ?? "0");
    const relevance = parseFloat(tickerSent?.relevance_score ?? "0");
    let sentiment = "Neutral";
    if (sentScore >= 0.35) sentiment = "Bullish";
    else if (sentScore >= 0.15) sentiment = "Somewhat-Bullish";
    else if (sentScore <= -0.35) sentiment = "Bearish";
    else if (sentScore <= -0.15) sentiment = "Somewhat-Bearish";
    return {
      title: String(a.title ?? ""),
      summary: String(a.summary ?? ""),
      url: String(a.url ?? ""),
      source: String(a.source ?? ""),
      publishedAt: String(a.time_published ?? ""),
      sentiment,
      sentimentScore: sentScore,
      relevanceScore: relevance,
    };
  });
}
