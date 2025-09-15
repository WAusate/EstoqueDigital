import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Package, Plus } from "lucide-react";

const materialSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Código é obrigatório"),
  unit: z.string().min(1, "Unidade é obrigatória"),
  unitPrice: z.string().optional(),
  minimumStock: z.string().min(1, "Estoque mínimo é obrigatório"),
});

type MaterialFormData = z.infer<typeof materialSchema>;

interface MaterialFormProps {
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: any;
}

export default function MaterialForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  initialData 
}: MaterialFormProps) {
  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      unit: initialData?.unit || "",
      unitPrice: initialData?.unitPrice?.toString() || "",
      minimumStock: initialData?.minimumStock?.toString() || "0",
    },
  });

  const handleSubmit = (data: MaterialFormData) => {
    const formattedData = {
      ...data,
      unitPrice: data.unitPrice ? parseFloat(data.unitPrice) : undefined,
      minimumStock: parseInt(data.minimumStock),
    };
    onSubmit(formattedData);
    console.log('Material form submitted:', formattedData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="card-material-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {initialData ? 'Editar Material' : 'Novo Material'}
        </CardTitle>
        <CardDescription>
          {initialData 
            ? 'Atualize as informações do material' 
            : 'Preencha os dados para cadastrar um novo material'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Material</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Parafuso Phillips M6"
                        data-testid="input-material-name"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: PAR-M6-001"
                        data-testid="input-material-code"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: un, kg, l"
                        data-testid="input-material-unit"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Unitário (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        data-testid="input-material-price"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Mínimo</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="0"
                        data-testid="input-material-minimum-stock"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  data-testid="button-cancel-material"
                >
                  Cancelar
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isLoading}
                data-testid="button-save-material"
              >
                {isLoading ? "Salvando..." : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {initialData ? 'Atualizar' : 'Cadastrar'}
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