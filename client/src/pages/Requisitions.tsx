import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import RequisitionForm from "@/components/RequisitionForm";
import DigitalSignature from "@/components/DigitalSignature";
import { Plus, ClipboardList, Search, Filter, Eye, PenTool } from "lucide-react";

// todo: remove mock data when connecting to real backend
const mockEmployees = [
  { id: '1', name: 'João Silva', email: 'joao@empresa.com' },
  { id: '2', name: 'Maria Santos', email: 'maria@empresa.com' },
  { id: '3', name: 'Carlos Oliveira', email: 'carlos@empresa.com' },
  { id: '4', name: 'Ana Costa', email: 'ana@empresa.com' },
];

const mockMaterials = [
  { id: '1', name: 'Parafuso Phillips M6 x 50mm', code: 'PAR-M6-001', currentStock: 45, unit: 'un' },
  { id: '2', name: 'Chapa de Aço Inox 304', code: 'CHA-INOX-001', currentStock: 0, unit: 'm²' },
  { id: '3', name: 'Tinta Primer Branca', code: 'TIN-PRI-001', currentStock: 25, unit: 'l' },
  { id: '4', name: 'Cabo Flexível 2,5mm²', code: 'CAB-FLE-001', currentStock: 8, unit: 'm' },
];

const mockRequisitions = [
  {
    id: '1',
    employeeName: 'João Silva',
    materialName: 'Parafuso Phillips M6 x 50mm',
    materialCode: 'PAR-M6-001',
    quantity: 50,
    unit: 'un',
    observation: 'Material necessário para montagem do equipamento linha 3',
    status: 'PENDENTE' as const,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    employeeName: 'Maria Santos',
    materialName: 'Tinta Primer Branca',
    materialCode: 'TIN-PRI-001',
    quantity: 2,
    unit: 'l',
    observation: 'Repintura da área de recepção',
    status: 'ASSINADA' as const,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
  {
    id: '3',
    employeeName: 'Carlos Oliveira',
    materialName: 'Cabo Flexível 2,5mm²',
    materialCode: 'CAB-FLE-001',
    quantity: 10,
    unit: 'm',
    observation: 'Instalação elétrica setor B',
    status: 'PENDENTE' as const,
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: '4',
    employeeName: 'Ana Costa',
    materialName: 'Chapa de Aço Inox 304',
    materialCode: 'CHA-INOX-001',
    quantity: 1,
    unit: 'm²',
    observation: 'Reparação urgente equipamento principal',
    status: 'CANCELADA' as const,
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  }
];

export default function Requisitions() {
  const [requisitions, setRequisitions] = useState(mockRequisitions);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingRequisition, setViewingRequisition] = useState(null);
  const [signingRequisition, setSigningRequisition] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const filteredRequisitions = requisitions.filter(req => {
    const matchesSearch = req.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.materialCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateRequisition = async (data: any) => {
    setIsLoading(true);
    console.log('Creating requisition:', data);
    
    // todo: replace with actual API call
    setTimeout(() => {
      const employee = mockEmployees.find(e => e.id === data.employeeId);
      const material = mockMaterials.find(m => m.id === data.materialId);
      
      const newRequisition = {
        id: String(requisitions.length + 1),
        employeeName: employee?.name || '',
        materialName: material?.name || '',
        materialCode: material?.code || '',
        quantity: data.quantity,
        unit: material?.unit || '',
        observation: data.observation || '',
        status: 'PENDENTE' as const,
        createdAt: new Date().toISOString(),
      };
      
      setRequisitions([newRequisition, ...requisitions]);
      setIsLoading(false);
      setIsFormOpen(false);
      alert('Requisição criada com sucesso!');
    }, 1000);
  };

  const handleSignRequisition = async (password: string) => {
    if (!signingRequisition) return;
    
    setIsLoading(true);
    console.log('Signing requisition:', signingRequisition.id, 'with password verification');
    
    // todo: replace with actual API call
    setTimeout(() => {
      setRequisitions(requisitions.map(req => 
        req.id === signingRequisition.id 
          ? { ...req, status: 'ASSINADA' as const }
          : req
      ));
      setIsLoading(false);
      setSigningRequisition(null);
      alert('Requisição assinada com sucesso! Material liberado para retirada.');
    }, 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'ASSINADA':
        return <Badge variant="default">Assinada</Badge>;
      case 'CANCELADA':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingCount = requisitions.filter(r => r.status === 'PENDENTE').length;
  const signedCount = requisitions.filter(r => r.status === 'ASSINADA').length;
  const todayCount = requisitions.filter(r => {
    const today = new Date();
    const reqDate = new Date(r.createdAt);
    return reqDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-6" data-testid="page-requisitions">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Requisições
          </h1>
          <p className="text-muted-foreground">
            Gerencie requisições de materiais e assinaturas digitais
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-requisition">
              <Plus className="h-4 w-4 mr-2" />
              Nova Requisição
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Requisição</DialogTitle>
            </DialogHeader>
            <RequisitionForm 
              employees={mockEmployees}
              materials={mockMaterials}
              onSubmit={handleCreateRequisition}
              onCancel={() => setIsFormOpen(false)}
              isLoading={isLoading}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Requisições Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="text-pending-count">
              {pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando assinatura
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assinadas Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-signed-count">
              {signedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Materiais liberados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Criadas Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-count">
              {todayCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Total do dia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por funcionário, material ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-requisitions"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'PENDENTE', 'ASSINADA', 'CANCELADA'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  data-testid={`button-filter-${status.toLowerCase()}`}
                >
                  {status === 'all' ? 'Todas' : status.charAt(0) + status.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requisitions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Requisições
            <Badge variant="secondary" className="ml-2">
              {filteredRequisitions.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Lista de todas as requisições de materiais
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequisitions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-requisitions">
              {searchTerm || statusFilter !== "all" 
                ? 'Nenhuma requisição encontrada com os filtros aplicados' 
                : 'Nenhuma requisição cadastrada'
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequisitions.map((requisition) => (
                    <TableRow key={requisition.id} data-testid={`row-requisition-${requisition.id}`}>
                      <TableCell className="font-medium">
                        {requisition.employeeName}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{requisition.materialName}</div>
                          <div className="text-sm text-muted-foreground">
                            {requisition.materialCode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold">
                          {requisition.quantity} {requisition.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(requisition.status)}
                      </TableCell>
                      <TableCell>
                        {formatDate(requisition.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setViewingRequisition(requisition)}
                                data-testid={`button-view-requisition-${requisition.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes da Requisição</DialogTitle>
                              </DialogHeader>
                              {viewingRequisition && (
                                <DigitalSignature
                                  requisition={viewingRequisition}
                                  onSign={handleSignRequisition}
                                  isLoading={isLoading}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          {requisition.status === 'PENDENTE' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setSigningRequisition(requisition)}
                                  data-testid={`button-sign-requisition-${requisition.id}`}
                                >
                                  <PenTool className="h-4 w-4 text-primary" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle>Assinatura Digital</DialogTitle>
                                </DialogHeader>
                                {signingRequisition && (
                                  <DigitalSignature
                                    requisition={signingRequisition}
                                    onSign={handleSignRequisition}
                                    isLoading={isLoading}
                                  />
                                )}
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}