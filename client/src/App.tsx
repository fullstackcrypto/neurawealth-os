import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense } from "react";
import AppLayout from "./components/AppLayout";

const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Signals = lazy(() => import("./pages/Signals"));
const Telegram = lazy(() => import("./pages/Telegram"));
const Bot = lazy(() => import("./pages/Bot"));
const Mining = lazy(() => import("./pages/Mining"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Revenue = lazy(() => import("./pages/Revenue"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const NotFound = lazy(() => import("./pages/NotFound"));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
        <span className="text-[#00ff88] font-mono text-sm">
          Loading module...
        </span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard">
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </Route>
        <Route path="/signals">
          <AppLayout>
            <Signals />
          </AppLayout>
        </Route>
        <Route path="/telegram">
          <AppLayout>
            <Telegram />
          </AppLayout>
        </Route>
        <Route path="/bot">
          <AppLayout>
            <Bot />
          </AppLayout>
        </Route>
        <Route path="/mining">
          <AppLayout>
            <Mining />
          </AppLayout>
        </Route>
        <Route path="/marketplace">
          <AppLayout>
            <Marketplace />
          </AppLayout>
        </Route>
        <Route path="/revenue">
          <AppLayout>
            <Revenue />
          </AppLayout>
        </Route>
        <Route path="/pipeline">
          <AppLayout>
            <Pipeline />
          </AppLayout>
        </Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
