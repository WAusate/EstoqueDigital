import { useState } from "react";
import DashboardCard from "@/components/DashboardCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Calendar,
  RefreshCw,
  FileText,
  ShoppingCart
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// todo: remove mock data when connecting to real backend
const mockStats = {
  totalMaterials: 156,
  lowStockItems: 8,
  criticalStockItems: 2,
  todayRequisitions: 24,
  activeUsers: 32,
  totalValue: 125000.50,
};

const mockChartData = [
  { name: 'Jan', entradas: 400, saidas: 240 },
  { name: 'Fev', entradas: 300, saidas: 139 },
  { name: 'Mar', entradas: 200, saidas: 980 },
  { name: 'Abr', entradas: 278, saidas: 390 },
  { name: 'Mai', entradas: 189, saidas: 480 },
  { name: 'Jun', entradas: 239, saidas: 380 },
];

const mockPieData = [
  { name: 'Parafusos', value: 30, color: '#0088FE' },
  { name: 'Chapas', value: 25, color: '#00C49F' },
  { name: 'Tintas', value: 20, color: '#FFBB28' },
  { name: 'Cabos', value: 15, color: '#FF8042' },
  { name: 'Outros', value: 10, color: '#8884d8' },
];

const mockCriticalItems = [
  { name: 'Chapa de Aço Inox 304', code: 'CHA-INOX-001', stock: 0, minimum: 5 },
  { name: 'Tinta Primer Vermelha', code: 'TIN-PRI-002', stock: 0, minimum: 10 },
  { name: 'Parafuso Phillips M6', code: 'PAR-M6-001', stock: 2, minimum: 50 },
];

export default function Dashboard() {
  const [timeFilter, setTimeFilter] = useState("month");
  
  const handleRefresh = () => {
    console.log('Refreshing dashboard data');
    // todo: refresh data from backend
  };

  const handleGeneratePurchaseOrder = (itemCode: string) => {
    console.log('Generate purchase order for:', itemCode);
    alert(`Pedido de compra gerado para ${itemCode}`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de gestão de estoque
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-40" data-testid="select-time-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh}
            data-testid="button-refresh-dashboard"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total de Materiais"
          value={mockStats.totalMaterials}
          description="Materiais cadastrados"
          icon={Package}
        />
        <DashboardCard
          title="Estoque Baixo"
          value={mockStats.lowStockItems}
          description="Itens com estoque mínimo"
          icon={AlertTriangle}
          variant="warning"
        />
        <DashboardCard
          title="Requisições Hoje"
          value={mockStats.todayRequisitions}
          description="Requisições criadas"
          icon={TrendingUp}
          trend={{ value: 12, label: "vs ontem" }}
        />
        <DashboardCard
          title="Valor Total"
          value={formatCurrency(mockStats.totalValue)}
          description="Valor do estoque"
          icon={Users}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Movimentações de Estoque
            </CardTitle>
            <CardDescription>
              Entradas vs Saídas por período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Bar dataKey="entradas" fill="hsl(var(--chart-1))" name="Entradas" />
                  <Bar dataKey="saidas" fill="hsl(var(--chart-2))" name="Saídas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Materiais Mais Utilizados
            </CardTitle>
            <CardDescription>
              Distribuição por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {mockPieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-sm">{entry.name} ({entry.value}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Items Alert */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Itens Críticos
            <Badge variant="destructive">{mockCriticalItems.length}</Badge>
          </CardTitle>
          <CardDescription>
            Materiais com estoque zero ou crítico que precisam de reposição urgente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockCriticalItems.map((item, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-background rounded-lg border"
                data-testid={`critical-item-${index}`}
              >
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Código: {item.code} • Estoque: {item.stock} • Mínimo: {item.minimum}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.stock === 0 && (
                    <Badge variant="destructive">CRÍTICO</Badge>
                  )}
                  <Button 
                    size="sm"
                    onClick={() => handleGeneratePurchaseOrder(item.code)}
                    data-testid={`button-purchase-order-${index}`}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Gerar Pedido
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}