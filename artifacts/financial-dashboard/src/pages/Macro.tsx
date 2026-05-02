import { Layout } from "@/components/Layout";
import { useGetMacroHeatmap, getGetMacroHeatmapQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Macro() {
  const { data: events, isLoading } = useGetMacroHeatmap({
    query: { queryKey: getGetMacroHeatmapQueryKey() }
  });

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Macro Heatmap</h2>
          <p className="text-muted-foreground">Geopolitical events driving the market.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-border bg-card">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))
          ) : events?.length === 0 ? (
             <div className="col-span-full py-8 text-center text-muted-foreground">No macro events active.</div>
          ) : (
            events?.map(event => {
              const isBullish = event.direction === "Bullish";
              const isBearish = event.direction === "Bearish";
              const colorClass = isBullish ? "border-chart-2 bg-chart-2/5" : isBearish ? "border-destructive bg-destructive/5" : "border-border bg-card";

              return (
                <Card key={event.id} className={`border ${colorClass}`}>
                  <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {event.title}
                    </CardTitle>
                    <div className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${isBullish ? 'bg-chart-2 text-chart-2-foreground' : isBearish ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {event.impactScore}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-3">
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{event.category}</span>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{event.region}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {event.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1">
                      {event.affectedSectors.map(s => (
                        <span key={s} className="text-[10px] uppercase tracking-wider text-primary bg-primary/10 px-1 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}