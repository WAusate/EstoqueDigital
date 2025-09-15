import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ClipboardList, Send } from "lucide-react";

const requisitionSchema = z.object({
  employeeId: z.string().min(1, "Funcionário é obrigatório"),
  materialId: z.string().min(1, "Material é obrigatório"),
  quantity: z.string().min(1, "Quantidade é obrigatória"),
  observation: z.string().optional(),
});

type RequisitionFormData = z.infer<typeof requisitionSchema>;

interface Employee {
  id: string;
  name: string;
  email?: string;
}

interface Material {
  id: string;
  name: string;
  code: string;
  currentStock: number;
  unit: string;
}

interface RequisitionFormProps {
  employees: Employee[];
  materials: Material[];
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function RequisitionForm({ 
  employees = [], 
  materials = [], 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: RequisitionFormProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const form = useForm<RequisitionFormData>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      employeeId: "",
      materialId: "",
      quantity: "",
      observation: "",
    },
  });

  const handleSubmit = (data: RequisitionFormData) => {
    const formattedData = {
      ...data,
      quantity: parseInt(data.quantity),
    };
    onSubmit(formattedData);
    console.log('Requisition form submitted:', formattedData);
  };

  const handleMaterialChange = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    setSelectedMaterial(material || null);
    form.setValue('materialId', materialId);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="card-requisition-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Nova Requisição
        </CardTitle>
        <CardDescription>
          Crie uma nova requisição de material para um funcionário
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funcionário</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    data-testid="select-employee"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o funcionário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem 
                          key={employee.id} 
                          value={employee.id}
                          data-testid={`option-employee-${employee.id}`}
                        >
                          {employee.name}
                          {employee.email && (
                            <span className="text-muted-foreground ml-2">
                              ({employee.email})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="materialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material</FormLabel>
                  <Select 
                    onValueChange={handleMaterialChange} 
                    defaultValue={field.value}
                    data-testid="select-material"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o material" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {materials.map((material) => (
                        <SelectItem 
                          key={material.id} 
                          value={material.id}
                          data-testid={`option-material-${material.id}`}
                        >
                          <div>
                            <div>{material.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {material.code} - Estoque: {material.currentStock} {material.unit}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedMaterial && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm">
                  <strong>Material selecionado:</strong> {selectedMaterial.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  Estoque atual: {selectedMaterial.currentStock} {selectedMaterial.unit}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quantidade
                    {selectedMaterial && ` (${selectedMaterial.unit})`}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      placeholder="Ex: 10"
                      data-testid="input-quantity"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Informações adicionais sobre a requisição..."
                      data-testid="textarea-observation"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  data-testid="button-cancel-requisition"
                >
                  Cancelar
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isLoading}
                data-testid="button-create-requisition"
              >
                {isLoading ? "Criando..." : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Criar Requisição
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}