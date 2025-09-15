import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Search, AlertTriangle, CheckCircle, Package } from "lucide-react";

interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
  unitPrice?: number;
  minimumStock: number;
  currentStock: number;
}

interface MaterialsTableProps {
  materials: Material[];
  onEdit?: (material: Material) => void;
  onDelete?: (materialId: string) => void;
  isLoading?: boolean;
}

export default function MaterialsTable({ 
  materials = [], 
  onEdit, 
  onDelete, 
  isLoading = false 
}: MaterialsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (current: number, minimum: number) => {
    if (current === 0) {
      return { 
        variant: "destructive" as const, 
        text: "Crítico", 
        icon: AlertTriangle 
      };
    } else if (current <= minimum) {
      return { 
        variant: "secondary" as const, 
        text: "Baixo", 
        icon: AlertTriangle 
      };
    }
    return { 
      variant: "default" as const, 
      text: "OK", 
      icon: CheckCircle 
    };
  };

  const formatPrice = (price?: number) => {
    if (!price) return "-";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Materiais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Carregando materiais...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-materials-table">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Materiais
          <Badge variant="secondary">{filteredMaterials.length}</Badge>
        </CardTitle>
        <CardDescription>
          Gerencie o cadastro de materiais e monitore os níveis de estoque
        </CardDescription>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              console.log('Searching materials:', e.target.value);
            }}
            className="pl-10"
            data-testid="input-search-materials"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredMaterials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-no-materials">
            {searchTerm ? 'Nenhum material encontrado' : 'Nenhum material cadastrado'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Preço Unit.</TableHead>
                  <TableHead>Estoque Atual</TableHead>
                  <TableHead>Estoque Mín.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => {
                  const status = getStockStatus(material.currentStock, material.minimumStock);
                  const StatusIcon = status.icon;
                  
                  return (
                    <TableRow key={material.id} data-testid={`row-material-${material.id}`}>
                      <TableCell className="font-medium">
                        <div>
                          <div data-testid={`text-material-name-${material.id}`}>
                            {material.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {material.code}
                        </code>
                      </TableCell>
                      <TableCell>{material.unit}</TableCell>
                      <TableCell>{formatPrice(material.unitPrice)}</TableCell>
                      <TableCell className="font-bold">
                        <span data-testid={`text-current-stock-${material.id}`}>
                          {material.currentStock}
                        </span>
                      </TableCell>
                      <TableCell>{material.minimumStock}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                          <StatusIcon className="h-3 w-3" />
                          {status.text}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {onEdit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                onEdit(material);
                                console.log('Edit material:', material.id);
                              }}
                              data-testid={`button-edit-material-${material.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm('Tem certeza que deseja excluir este material?')) {
                                  onDelete(material.id);
                                  console.log('Delete material:', material.id);
                                }
                              }}
                              data-testid={`button-delete-material-${material.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}