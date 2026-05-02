import { Link, useLocation } from "wouter";
import { Activity, BarChart2, Briefcase, Globe } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Discovery", icon: Activity },
    { href: "/macro", label: "Macro Heatmap", icon: Globe },
    { href: "/holdings", label: "Holdings", icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <nav className="w-full md:w-64 border-b md:border-r border-border bg-card/50 flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <BarChart2 className="text-primary w-6 h-6" />
          <h1 className="font-bold text-foreground font-mono tracking-tight">DEEP_ANALYSIS</h1>
        </div>
        <div className="p-2 flex-1 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
