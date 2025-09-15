import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

// Pages
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Materials from "@/pages/Materials";
import Requisitions from "@/pages/Requisitions";
import NotFound from "@/pages/not-found";

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDark(isDarkMode);
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    document.documentElement.classList.toggle('dark', newDarkMode);
    console.log('Theme toggled to:', newDarkMode ? 'dark' : 'light');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Custom sidebar width for inventory management application
  const style = {
    "--sidebar-width": "20rem",       // 320px for better content
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} /> {/* Redirect all routes to landing when not authenticated */}
      </Switch>
    );
  }

  // Authenticated user interface with sidebar
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar 
          userRole={user?.role}
          userName={user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.email || 'Usuário'
          }
          userEmail={user?.email}
          userImage={user?.profileImageUrl}
        />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/materials" component={Materials} />
              <Route path="/materiais" component={Materials} />
              <Route path="/requisicoes" component={Requisitions} />
              <Route path="/requisitions" component={Requisitions} />
              <Route path="/my-requisitions" component={Requisitions} />
              <Route path="/movements" component={Dashboard} /> {/* todo: create Movements page */}
              <Route path="/reports" component={Dashboard} /> {/* todo: create Reports page */}
              <Route path="/users" component={Dashboard} /> {/* todo: create Users page */}
              <Route path="/audit" component={Dashboard} /> {/* todo: create Audit page */}
              <Route path="/alerts" component={Dashboard} /> {/* todo: create Alerts page */}
              <Route path="/settings" component={Dashboard} /> {/* todo: create Settings page */}
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthenticatedApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
