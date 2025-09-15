import DashboardCard from '../DashboardCard';
import { Package, AlertTriangle, TrendingUp, Users } from 'lucide-react';

export default function DashboardCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <DashboardCard
        title="Total de Materiais"
        value="156"
        description="Materiais cadastrados"
        icon={Package}
      />
      <DashboardCard
        title="Estoque Baixo"
        value="8"
        description="Itens com estoque mínimo"
        icon={AlertTriangle}
        variant="warning"
      />
      <DashboardCard
        title="Requisições Hoje"
        value="24"
        description="Requisições criadas"
        icon={TrendingUp}
        trend={{ value: 12, label: "vs ontem" }}
      />
      <DashboardCard
        title="Usuários Ativos"
        value="32"
        description="Funcionários cadastrados"
        icon={Users}
        variant="default"
      />
    </div>
  );
}