import {
  BarChart3,
  Package,
  ClipboardList,
  Users,
  Settings,
  Shield,
  AlertTriangle,
  LayoutDashboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "wouter";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: number;
};

// Menu items for different roles
const adminMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Requisições",
    url: "/requisicoes",
    icon: ClipboardList,
    badge: 5, // todo: get real count from backend
  },
  {
    title: "Materiais",
    url: "/materiais",
    icon: Package,
  },
  {
    title: "Relatórios",
    url: "/reports",
    icon: BarChart3,
  },
  {
    title: "Usuários",
    url: "/users",
    icon: Users,
  },
  {
    title: "Auditoria",
    url: "/audit",
    icon: Shield,
  },
];

const stockMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Requisições",
    url: "/requisicoes",
    icon: ClipboardList,
    badge: 5,
  },
  {
    title: "Materiais",
    url: "/materiais",
    icon: Package,
  },
  {
    title: "Movimentações",
    url: "/movements",
    icon: BarChart3,
  },
  {
    title: "Alertas",
    url: "/alerts",
    icon: AlertTriangle,
    badge: 3, // todo: get real count from backend
  },
];

const employeeMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Requisições",
    url: "/my-requisitions",
    icon: ClipboardList,
  },
  {
    title: "Materiais",
    url: "/materiais",
    icon: Package,
  },
];

interface AppSidebarProps {
  userRole?: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
}

export function AppSidebar({
  userRole = "ADMIN",
  userName = "Usuário",
  userEmail,
  userImage
}: AppSidebarProps) {
  const [location] = useLocation();

  const formatTestId = (title: string) =>
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");

  const getMenuItems = () => {
    switch (userRole) {
      case "ADMIN":
        return adminMenuItems;
      case "ESTOQUE":
        return stockMenuItems;
      case "FUNCIONARIO":
        return employeeMenuItems;
      default:
        return adminMenuItems;
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case "ADMIN":
        return "Administrador";
      case "ESTOQUE":
        return "Estoque";
      case "FUNCIONARIO":
        return "Funcionário";
      default:
        return "Usuário";
    }
  };

  const menuItems = getMenuItems();

  return (
    <Sidebar data-testid="sidebar-main">
      {/* Header só com a logo */}
      <SidebarHeader className="py-2">
        <div className="flex justify-center w-full">
          <img 
            src="/Logo RV.png" 
            alt="Logo RV" 
            className="block h-12 w-auto"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs px-2">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${formatTestId(item.title)}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-3.5 w-3.5" />
                      <span className="text-sm">{item.title}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center"
                          data-testid={`badge-${formatTestId(item.title)}`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {userRole === "ADMIN" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs px-2">Config</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === "/settings"}
                    data-testid="nav-settings"
                  >
                    <Link href="/settings">
                      <Settings className="h-3.5 w-3.5" />
                      <span className="text-sm">Configurações</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="px-2 py-2">
        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-sidebar-accent/50">
          <Avatar className="h-6 w-6">
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" data-testid="text-user-name">
              {userName}
            </p>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                {getRoleLabel()}
              </Badge>
            </div>
          </div>
        </div>
        <div className="pt-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full h-7 text-xs"
            onClick={() => {
              console.log('Logout clicked');
              window.location.href = "/api/logout";
            }}
            data-testid="button-logout"
          >
            Sair
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
