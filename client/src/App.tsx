import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useParams } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import { WatchRoomPage } from "./pages/WatchRoomPage";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import ActivePartiesPage from "./pages/ActivePartiesPage";
import HistoryPage from "./pages/HistoryPage";
import CreatePartyPage from "./pages/CreatePartyPage";
import FriendsPage from "./pages/FriendsPage";
import SettingsPage from "./pages/SettingsPage";
import { MobileBottomNav } from "./components/MobileBottomNav";

function PartyRoute() {
  const params = useParams<{ code: string }>();
  return <WatchRoomPage code={params.code || "DEMO"} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/login" component={LoginPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/parties" component={ActivePartiesPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/friends" component={FriendsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/diagnostics" component={DiagnosticsPage} />
      <Route path="/party/create" component={CreatePartyPage} />
      <Route path="/party/:code" component={PartyRoute} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster position="bottom-right" />
          <Router />
          <MobileBottomNav />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
