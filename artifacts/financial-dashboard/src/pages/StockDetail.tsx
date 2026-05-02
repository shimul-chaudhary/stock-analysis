import { Layout } from "@/components/Layout";
import { useParams } from "wouter";
import { 
  useGetStockQuote, getGetStockQuoteQueryKey,
  useGetStockNews, getGetStockNewsQueryKey,
  useDeepDiveAnalysis 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BrainCircuit } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function StockDetail() {
  const params = useParams();
  const symbol = params.symbol?.toUpperCase() || "";

  const { data: quote, isLoading: isLoadingQuote } = useGetStockQuote(symbol, {
    query: { enabled: !!symbol, queryKey: getGetStockQuoteQueryKey(symbol) }
  });

  const { data: news, isLoading: isLoadingNews } = useGetStockNews(symbol, {}, {
    query: { enabled: !!symbol, queryKey: getGetStockNewsQueryKey(symbol, {}) }
  });

  const deepDiveMutation = useDeepDiveAnalysis();
  const [report, setReport] = useState<any>(null);

  const runDeepDive = async () => {
    if (!quote) return;
    const res = await deepDiveMutation.mutateAsync({
      data: {
        symbol: quote.symbol,
        name: quote.name,
        peRatio: quote.peRatio,
        revenueGrowth: quote.revenueGrowth,
        marketCap: quote.marketCap,
        headlines: news?.slice(0, 5).map(n => n.title) || []
      }
    });
    setReport(res);
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {isLoadingQuote ? (
          <Skeleton className="h-32 w-full" />
        ) : quote ? (
          <div className="flex flex-col md:flex-row justify-between gap-4 p-6 bg-card border border-border rounded-lg items-start md:items-center">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-bold font-mono tracking-tight text-primary">{quote.symbol}</h2>
                <span className="text-xl text-muted-foreground">{quote.name}</span>
              </div>
              <div className="flex items-center gap-4 mt-2 font-mono">
                <span className="text-2xl">${quote.price.toFixed(2)}</span>
                <span className={`text-lg ${quote.price >= quote.open ? 'text-chart-2' : 'text-destructive'}`}>
                  {quote.price >= quote.open ? "+" : ""}{((quote.price - quote.open)/quote.open * 100).toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <div><span className="block text-xs uppercase opacity-70">P/E</span><span className="font-mono font-medium text-foreground">{quote.peRatio}</span></div>
              <div><span className="block text-xs uppercase opacity-70">Rev Growth</span><span className="font-mono font-medium text-foreground">{quote.revenueGrowth}%</span></div>
              <div><span className="block text-xs uppercase opacity-70">Mkt Cap</span><span className="font-mono font-medium text-foreground">${(quote.marketCap/1e9).toFixed(1)}B</span></div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground bg-card rounded-lg">Stock not found.</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Gemini Deep Dive</h3>
              <Button 
                onClick={runDeepDive} 
                disabled={!quote || deepDiveMutation.isPending}
                className="gap-2"
              >
                <BrainCircuit className="w-4 h-4" />
                {deepDiveMutation.isPending ? "Generating..." : "Run Deep Dive"}
              </Button>
            </div>

            {deepDiveMutation.isPending && (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}

            {report && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-muted/30 border border-border rounded-lg">
                  <span className="font-semibold text-lg">Verdict:</span>
                  <Badge 
                    className={`font-mono text-sm px-2 py-1 ${report.verdict === 'Accumulate' ? 'bg-chart-2 text-chart-2-foreground' : report.verdict === 'Avoid' ? 'bg-destructive text-destructive-foreground' : 'bg-chart-3 text-primary-foreground'}`}
                  >
                    {report.verdict}
                  </Badge>
                  <span className="text-sm text-muted-foreground ml-auto">Confidence: {report.confidenceScore}%</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-chart-2 bg-chart-2/5">
                    <CardHeader className="pb-2"><CardTitle className="text-chart-2 text-base">Bull Case</CardTitle></CardHeader>
                    <CardContent className="text-sm">{report.bullCase}</CardContent>
                  </Card>
                  <Card className="border-destructive bg-destructive/5">
                    <CardHeader className="pb-2"><CardTitle className="text-destructive text-base">Bear Case</CardTitle></CardHeader>
                    <CardContent className="text-sm">{report.bearCase}</CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Latest News</h3>
            <div className="space-y-3">
              {isLoadingNews ? (
                Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
              ) : news?.length === 0 ? (
                <div className="text-muted-foreground text-sm">No recent news.</div>
              ) : (
                news?.map((article, i) => (
                  <a key={i} href={article.url} target="_blank" rel="noreferrer" className="block p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="text-sm font-medium line-clamp-2">{article.title}</h4>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-2">
                      <span className="text-muted-foreground">{article.source}</span>
                      <span className={`px-1.5 py-0.5 rounded ${article.sentiment.includes('Bullish') ? 'text-chart-2 bg-chart-2/10' : article.sentiment.includes('Bearish') ? 'text-destructive bg-destructive/10' : 'text-muted-foreground bg-muted'}`}>
                        {article.sentiment}
                      </span>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}