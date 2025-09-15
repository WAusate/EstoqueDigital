import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PenTool, Shield, Clock, User, Package, Hash, FileText } from "lucide-react";

const signatureSchema = z.object({
  password: z.string().min(1, "Senha é obrigatória para assinar"),
});

type SignatureFormData = z.infer<typeof signatureSchema>;

interface Requisition {
  id: string;
  employeeName: string;
  materialName: string;
  materialCode: string;
  quantity: number;
  unit: string;
  observation?: string;
  createdAt: string;
  status: 'PENDENTE' | 'ASSINADA' | 'CANCELADA';
}

interface DigitalSignatureProps {
  requisition: Requisition;
  onSign: (password: string) => void;
  isLoading?: boolean;
}

export default function DigitalSignature({ 
  requisition, 
  onSign, 
  isLoading = false 
}: DigitalSignatureProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const form = useForm<SignatureFormData>({
    resolver: zodResolver(signatureSchema),
    defaultValues: {
      password: "",
    },
  });

  const handleSubmit = (data: SignatureFormData) => {
    onSign(data.password);
    console.log('Digital signature requested for requisition:', requisition.id);
    setIsDialogOpen(false);
    form.reset();
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

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="card-digital-signature">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5" />
          Assinatura Digital da Requisição
        </CardTitle>
        <CardDescription>
          Confirme os dados e assine digitalmente para autorizar a retirada do material
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informações da Requisição */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm text-muted-foreground">Funcionário</Label>
                <p className="font-medium" data-testid="text-employee-name">
                  {requisition.employeeName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm text-muted-foreground">Material</Label>
                <p className="font-medium" data-testid="text-material-name">
                  {requisition.materialName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Código: {requisition.materialCode}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm text-muted-foreground">Quantidade</Label>
                <p className="font-medium text-lg" data-testid="text-quantity">
                  {requisition.quantity} {requisition.unit}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm text-muted-foreground">Data da Requisição</Label>
                <p className="font-medium">
                  {formatDate(requisition.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {requisition.observation && (
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-1" />
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground">Observação</Label>
              <p className="text-sm" data-testid="text-observation">
                {requisition.observation}
              </p>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <Label>Status da Requisição:</Label>
            {getStatusBadge(requisition.status)}
          </div>
        </div>

        {/* Botão de Assinatura */}
        {requisition.status === 'PENDENTE' && (
          <div className="pt-4">
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full" 
                  size="lg"
                  data-testid="button-sign-requisition"
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  Assinar Digitalmente
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Assinatura Digital</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ao assinar esta requisição, você confirma que:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Recebeu o material especificado</li>
                      <li>A quantidade está correta</li>
                      <li>O material está em boas condições</li>
                      <li>Esta assinatura tem validade legal</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirme sua senha</FormLabel>
                          <FormControl>
                            <Input 
                              type="password"
                              placeholder="Digite sua senha para assinar"
                              data-testid="input-signature-password"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel 
                        type="button"
                        data-testid="button-cancel-signature"
                      >
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        type="submit"
                        disabled={isLoading}
                        data-testid="button-confirm-signature"
                      >
                        {isLoading ? "Assinando..." : "Confirmar Assinatura"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </form>
                </Form>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {requisition.status === 'ASSINADA' && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Requisição Assinada Digitalmente</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Material liberado para retirada. A assinatura foi registrada com data, hora e dispositivo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}