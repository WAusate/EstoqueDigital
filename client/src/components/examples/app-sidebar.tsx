import { AppSidebar } from '../app-sidebar';
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar 
          userRole="ADMIN"
          userName="João Silva"
          userEmail="joao@empresa.com"
        />
        <main className="flex-1 p-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Sidebar Example</h1>
            <p className="text-muted-foreground">
              Este é um exemplo do sidebar do sistema de estoque. 
              O sidebar se adapta automaticamente baseado no perfil do usuário (Admin, Estoque, Funcionário).
            </p>
            <div className="mt-6 space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Perfil Administrador</h3>
                <p className="text-sm text-muted-foreground">
                  Acesso completo: Dashboard, Materiais, Requisições, Relatórios, Usuários, Auditoria e Configurações.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Perfil Estoque</h3>
                <p className="text-sm text-muted-foreground">
                  Acesso: Dashboard, Materiais, Movimentações, Requisições e Alertas.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Perfil Funcionário</h3>
                <p className="text-sm text-muted-foreground">
                  Acesso restrito: Apenas suas próprias requisições.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}