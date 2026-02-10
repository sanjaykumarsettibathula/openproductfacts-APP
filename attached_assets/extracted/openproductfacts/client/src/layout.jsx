import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, User, ScanLine, List, Menu, History } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  const navigationItems = [
    { name: "Home", path: createPageUrl("Home"), icon: Home },
    { name: "History", path: createPageUrl("History"), icon: History },
    { name: "Scan", path: createPageUrl("Scan"), icon: ScanLine },
    { name: "Lists", path: createPageUrl("Lists"), icon: List },
    { name: "Profile", path: createPageUrl("Profile"), icon: User },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Custom dark theme styles */}
      <style>{`
        :root {
          --background: 10 10 10;
          --foreground: 255 255 255;
          --card: 15 15 15;
          --card-foreground: 255 255 255;
          --primary: 16 185 129;
          --primary-foreground: 255 255 255;
          --secondary: 30 30 30;
          --muted: 40 40 40;
          --accent: 59 130 246;
          --destructive: 239 68 68;
          --border: 30 30 30;
          --ring: 16 185 129;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
          background: #0A0A0A;
        }
        
        .scan-button-glow {
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
        }
        
        .nutri-score-a { background: linear-gradient(135deg, #15803d, #22c55e); }
        .nutri-score-b { background: linear-gradient(135deg, #84cc16, #a3e635); }
        .nutri-score-c { background: linear-gradient(135deg, #eab308, #fbbf24); }
        .nutri-score-d { background: linear-gradient(135deg, #f97316, #fb923c); }
        .nutri-score-e { background: linear-gradient(135deg, #dc2626, #ef4444); }
      `}</style>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to={createPageUrl("Home")} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <ScanLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">FoodScan AI</h1>
              <p className="text-xs text-gray-400">Smart Nutrition</p>
            </div>
          </Link>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-[#0F0F0F] border-white/5 text-white"
            >
              <div className="mt-8 space-y-4">
                <Link
                  to={createPageUrl("Home")}
                  className="block py-3 px-4 rounded-lg hover:bg-white/5"
                >
                  Home
                </Link>
                <Link
                  to={createPageUrl("Compare")}
                  className="block py-3 px-4 rounded-lg hover:bg-white/5"
                >
                  Compare Products
                </Link>
                <Link
                  to={createPageUrl("History")}
                  className="block py-3 px-4 rounded-lg hover:bg-white/5"
                >
                  Scan History
                </Link>
                <Link
                  to={createPageUrl("Lists")}
                  className="block py-3 px-4 rounded-lg hover:bg-white/5"
                >
                  My Lists
                </Link>
                <Link
                  to={createPageUrl("Profile")}
                  className="block py-3 px-4 rounded-lg hover:bg-white/5"
                >
                  Profile
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-16 lg:pt-0 pb-24 lg:pb-8 min-h-screen">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F0F0F]/95 backdrop-blur-xl border-t border-white/5" style={{ zIndex: 50, position: 'fixed' }}>
        <div className="max-w-screen-xl mx-auto px-2">
          <div className="flex items-center justify-around h-20">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              if (item.name === "Scan") {
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="flex flex-col items-center relative -mt-8"
                  >
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center transition-all duration-300 ${
                        active ? "scan-button-glow scale-110" : "scale-100"
                      }`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <span className="text-xs mt-2 font-medium text-emerald-400">
                      {item.name}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className="flex flex-col items-center gap-1 transition-all duration-200"
                >
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      active ? "text-emerald-400" : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-xs transition-colors ${
                      active ? "text-emerald-400 font-medium" : "text-gray-400"
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

