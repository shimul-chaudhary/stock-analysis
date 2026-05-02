import { Layout } from "@/components/Layout";
import { useScreenStocks, getScreenStocksQueryKey, useGetMarketSummary, getGetMarketSummaryQueryKey, useGetMacroThemes, getGetMacroThemesQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useState as useReactState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Discovery() {
  const [, setLocation] = useLocation();
  const [riskValue, setRiskValue] = useReactState([1]);

  const riskProfiles = ["high_growth", "balanced", "value_stability"] as const;
  const currentRisk = riskProfiles[riskValue[0]];

  const { data: stocks, isLoading } = useScreenStocks(
    { riskProfile: currentRisk },
    { query: { queryKey: getScreenStocksQueryKey({ riskProfile: currentRisk }) } }
  );

  const { data: summary, isLoading: isSummaryLoading } = useGetMarketSummary({
    query: { queryKey: getGetMarketSummaryQueryKey() }
  });

  const { data: themes, isLoading: isThemesLoading } = useGetMacroThemes({
    query: { queryKey: getGetMacroThemesQueryKey() }
  });

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Market Discovery</h2>
          <p className="text-muted-foreground">Screening high-growth infrastructure opportunities.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Screened</CardTitle>
            </CardHeader>
            <CardContent>
              {isSummaryLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl font-mono">{summary?.totalScreened}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">New Discoveries</CardTitle>
            </CardHeader>
            <CardContent>
              {isSummaryLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl font-mono text-chart-2">+{summary?.newDiscoveries}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Macro Theme</CardTitle>
            </CardHeader>
            <CardContent>
              {isSummaryLoading ? <Skeleton className="h-8 w-full" /> : <div className="text-lg font-semibold truncate">{summary?.topMacroTheme}</div>}
            </CardContent>
          </Card>
        </div>

        {themes && themes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {themes.map(theme => (
              <Badge key={theme.id} variant="secondary" className="whitespace-nowrap font-mono">
                {theme.name} ({theme.momentum})
              </Badge>
            ))}
          </div>
        )}

        <div className="bg-card border border-border p-4 rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Risk Profile</span>
            <Badge variant="outline" className="font-mono uppercase">{currentRisk.replace("_", " ")}</Badge>
          </div>
          <Slider 
            value={riskValue} 
            onValueChange={setRiskValue} 
            max={2} 
            step={1} 
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>High Growth</span>
            <span>Balanced</span>
            <span>Value/Stability</span>
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="w-[150px]">Breakout</TableHead>
                <TableHead className="w-[150px]">Geopolitical</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : stocks?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No stocks found for this criteria.
                  </TableCell>
                </TableRow>
              ) : (
                stocks?.map(stock => (
                  <TableRow 
                    key={stock.symbol} 
                    className="border-border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setLocation(`/stock/${stock.symbol}`)}
                  >
                    <TableCell className="font-mono font-medium text-primary">{stock.symbol}</TableCell>
                    <TableCell className="truncate max-w-[200px]">{stock.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{stock.sector}</TableCell>
                    <TableCell className="text-right font-mono">${stock.price.toFixed(2)}</TableCell>
                    <TableCell className={`text-right font-mono ${stock.changePercent >= 0 ? "text-chart-2" : "text-destructive"}`}>
                      {stock.changePercent > 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-chart-1" 
                            style={{ width: `${stock.breakoutScore}%` }} 
                          />
                        </div>
                        <span className="text-xs font-mono">{stock.breakoutScore}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-chart-3" 
                            style={{ width: `${stock.geopoliticalScore}%` }} 
                          />
                        </div>
                        <span className="text-xs font-mono">{stock.geopoliticalScore}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
