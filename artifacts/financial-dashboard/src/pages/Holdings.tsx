import { Layout } from "@/components/Layout";
import { useState } from "react";
import { 
  useGetHoldings, getGetHoldingsQueryKey, 
  useAnalyzeHoldings, useCreateHolding, useUpdateHolding, useDeleteHolding 
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, BrainCircuit, Plus, Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Holdings() {
  const queryClient = useQueryClient();
  const { data: holdings, isLoading } = useGetHoldings({ query: { queryKey: getGetHoldingsQueryKey() }});
  
  const analyzeMutation = useAnalyzeHoldings();
  const createMutation = useCreateHolding();
  const updateMutation = useUpdateHolding();
  const deleteMutation = useDeleteHolding();

  const [analysisReport, setAnalysisReport] = useState<any>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<any>(null);
  
  const [formData, setFormData] = useState({ symbol: '', name: '', shares: '', avgCost: '' });

  const handleAnalyze = async () => {
    if (!holdings?.length) return;
    const report = await analyzeMutation.mutateAsync({
      data: {
        holdings: holdings.map(h => ({ symbol: h.symbol, name: h.name, shares: h.shares }))
      }
    });
    setAnalysisReport(report);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        data: {
          symbol: formData.symbol,
          name: formData.name || formData.symbol,
          shares: Number(formData.shares),
          avgCost: Number(formData.avgCost)
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetHoldingsQueryKey() });
      setIsAddOpen(false);
      setFormData({ symbol: '', name: '', shares: '', avgCost: '' });
      toast.success("Holding added");
    } catch (err) {
      toast.error("Failed to add holding");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHolding) return;
    try {
      await updateMutation.mutateAsync({
        id: editingHolding.id as unknown as never, // hack for id type mismatch if any
        data: {
          shares: Number(formData.shares),
          avgCost: Number(formData.avgCost)
        }
      } as any);
      queryClient.invalidateQueries({ queryKey: getGetHoldingsQueryKey() });
      setIsEditOpen(false);
      setEditingHolding(null);
      toast.success("Holding updated");
    } catch (err) {
      toast.error("Failed to update holding");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this holding?")) return;
    try {
      await deleteMutation.mutateAsync({ id: id as unknown as never } as any);
      queryClient.invalidateQueries({ queryKey: getGetHoldingsQueryKey() });
      toast.success("Holding deleted");
    } catch (err) {
      toast.error("Failed to delete holding");
    }
  };

  const openEdit = (holding: any) => {
    setEditingHolding(holding);
    setFormData({
      symbol: holding.symbol,
      name: holding.name,
      shares: String(holding.shares),
      avgCost: String(holding.avgCost)
    });
    setIsEditOpen(true);
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Portfolio Holdings</h2>
            <p className="text-muted-foreground">Manage your positions and run macro analysis.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsAddOpen(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Holding
            </Button>
            <Button 
              onClick={handleAnalyze} 
              disabled={!holdings?.length || analyzeMutation.isPending}
              className="gap-2"
            >
              <BrainCircuit className="w-4 h-4" />
              {analyzeMutation.isPending ? "Analyzing..." : "Run Macro Analysis"}
            </Button>
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Return</TableHead>
                <TableHead>Geo Risk</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center"><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ) : holdings?.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No holdings found.</TableCell></TableRow>
              ) : (
                holdings?.map(h => (
                  <TableRow key={h.id} className="border-border">
                    <TableCell className="font-mono font-medium text-primary">{h.symbol}</TableCell>
                    <TableCell className="text-right font-mono">{h.shares}</TableCell>
                    <TableCell className="text-right font-mono">${h.avgCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">${h.currentPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">${h.totalValue.toFixed(2)}</TableCell>
                    <TableCell className={`text-right font-mono ${h.gainLossPercent >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                      {h.gainLossPercent > 0 ? "+" : ""}{h.gainLossPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      <Badge variant={h.geopoliticalRisk === 'High' || h.geopoliticalRisk === 'Critical' ? 'destructive' : 'secondary'} className="font-mono text-xs">
                        {h.geopoliticalRisk}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(h)}>
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(h.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="bg-card border-border">
            <form onSubmit={handleAdd}>
              <DialogHeader>
                <DialogTitle>Add Holding</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input required value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value.toUpperCase()})} placeholder="AAPL" />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Apple Inc." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Shares</Label>
                    <Input required type="number" step="0.0001" value={formData.shares} onChange={e => setFormData({...formData, shares: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Avg Cost</Label>
                    <Input required type="number" step="0.01" value={formData.avgCost} onChange={e => setFormData({...formData, avgCost: e.target.value})} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>Add Holding</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-card border-border">
            <form onSubmit={handleEdit}>
              <DialogHeader>
                <DialogTitle>Edit Holding: {formData.symbol}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Shares</Label>
                    <Input required type="number" step="0.0001" value={formData.shares} onChange={e => setFormData({...formData, shares: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Avg Cost</Label>
                    <Input required type="number" step="0.01" value={formData.avgCost} onChange={e => setFormData({...formData, avgCost: e.target.value})} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {analysisReport && (
          <Dialog open={!!analysisReport} onOpenChange={(o) => !o && setAnalysisReport(null)}>
            <DialogContent className="max-w-2xl bg-card border-border">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  Macro Analysis Report
                </DialogTitle>
                <DialogDescription>Generated by Gemini AI</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border text-sm leading-relaxed">
                  {analysisReport.summary}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-destructive">Macro Threats</h4>
                    <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                      {analysisReport.macroThreats.map((t: string, i: number) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-chart-2">Opportunities</h4>
                    <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                      {analysisReport.opportunities.map((o: string, i: number) => <li key={i}>{o}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}