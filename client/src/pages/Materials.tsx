import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import MaterialsTable from "@/components/MaterialsTable";
import MaterialForm from "@/components/MaterialForm";
import { Plus, Package, Upload, Download } from "lucide-react";

type Material = {
  id: string;
  name: string;
  code: string;
  unit: string;
  unitPrice?: number;
  minimumStock: number;
  currentStock: number;
};

type MaterialFormValues = {
  name: string;
  code: string;
  unit: string;
  unitPrice?: number;
  minimumStock: number;
};

// todo: remove mock data when connecting to real backend
const mockMaterials: Material[] = [
  {
    id: '1',
    name: 'Parafuso Phillips M6 x 50mm',
    code: 'PAR-M6-001',
    unit: 'un',
    unitPrice: 0.85,
    minimumStock: 100,
    currentStock: 45
  },
  {
    id: '2',
    name: 'Chapa de Aço Inox 304',
    code: 'CHA-INOX-001',
    unit: 'm²',
    unitPrice: 120.50,
    minimumStock: 5,
    currentStock: 0
  },
  {
    id: '3',
    name: 'Tinta Primer Branca',
    code: 'TIN-PRI-001',
    unit: 'l',
    unitPrice: 25.90,
    minimumStock: 10,
    currentStock: 25
  },
  {
    id: '4',
    name: 'Solda Eletrodo 2,5mm',
    code: 'SOL-ELE-001',
    unit: 'kg',
    unitPrice: 15.75,
    minimumStock: 20,
    currentStock: 30
  },
  {
    id: '5',
    name: 'Cabo Flexível 2,5mm²',
    code: 'CAB-FLE-001',
    unit: 'm',
    unitPrice: 4.20,
    minimumStock: 50,
    currentStock: 8
  }
];

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>(mockMaterials);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateMaterial = async (data: MaterialFormValues) => {
    setIsLoading(true);
    console.log('Creating material:', data);

    // todo: replace with actual API call
    setTimeout(() => {
      const newMaterial = {
        id: String(materials.length + 1),
        ...data,
        currentStock: 0
      };
      setMaterials([...materials, newMaterial]);
      setIsLoading(false);
      setIsFormOpen(false);
      alert('Material cadastrado com sucesso!');
    }, 1000);
  };

  const handleUpdateMaterial = async (data: MaterialFormValues) => {
    if (!editingMaterial) return;

    setIsLoading(true);
    console.log('Updating material:', editingMaterial.id, data);

    // todo: replace with actual API call
    setTimeout(() => {
      setMaterials(materials.map((material) =>
        material.id === editingMaterial.id ? { ...material, ...data } : material
      ));
      setIsLoading(false);
      setIsFormOpen(false);
      setEditingMaterial(null);
      alert('Material atualizado com sucesso!');
    }, 1000);
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setIsFormOpen(true);
    console.log('Editing material:', material.id);
  };

  const handleDeleteMaterial = async (materialId: string) => {
    console.log('Deleting material:', materialId);
    
    // todo: replace with actual API call
    setMaterials(materials.filter(m => m.id !== materialId));
    alert('Material excluído com sucesso!');
  };

  const handleExportData = () => {
    console.log('Exporting materials data');
    // todo: implement actual export functionality
    alert('Dados exportados com sucesso!');
  };

  const handleImportData = () => {
    console.log('Importing materials data');
    // todo: implement actual import functionality
    alert('Funcionalidade de importação será implementada');
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingMaterial(null);
  };

  const lowStockCount = materials.filter(m => m.currentStock <= m.minimumStock).length;
  const totalValue = materials.reduce((sum, m) => sum + (m.currentStock * (m.unitPrice || 0)), 0);

  return (
    <div className="space-y-6" data-testid="page-materials">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Materiais
          </h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro de materiais e monitore os níveis de estoque
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={handleImportData}
            data-testid="button-import-materials"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button 
            variant="outline"
            onClick={handleExportData}
            data-testid="button-export-materials"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-material">
                <Plus className="h-4 w-4 mr-2" />
                Novo Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMaterial ? 'Editar Material' : 'Novo Material'}
                </DialogTitle>
              </DialogHeader>
              <MaterialForm 
                initialData={editingMaterial}
                onSubmit={editingMaterial ? handleUpdateMaterial : handleCreateMaterial}
                onCancel={handleFormCancel}
                isLoading={isLoading}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Materiais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-materials">
              {materials.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Materiais cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="text-low-stock">
              {lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Itens com estoque mínimo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-value">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor do estoque atual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Materials Table */}
      <MaterialsTable 
        materials={materials}
        onEdit={handleEditMaterial}
        onDelete={handleDeleteMaterial}
        isLoading={false}
      />
    </div>
  );
}