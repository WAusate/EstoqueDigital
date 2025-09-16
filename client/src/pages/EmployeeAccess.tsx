import { useState, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

interface EmployeeProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: "FUNCIONARIO";
}

interface EmployeeRequisition {
  id: string;
  materialId: string;
  quantity: number;
  observation: string | null;
  status: "PENDENTE" | "ASSINADA" | "CANCELADA";
  createdAt: string;
  signedAt: string | null;
  material: {
    id: string;
    name: string;
    code: string;
    unit: string;
  };
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}

const statusLabels: Record<EmployeeRequisition["status"], string> = {
  PENDENTE: "Pendente",
  ASSINADA: "Assinada",
  CANCELADA: "Cancelada",
};

const statusBadgeVariant: Record<
  EmployeeRequisition["status"],
  "default" | "secondary" | "destructive"
> = {
  PENDENTE: "secondary",
  ASSINADA: "default",
  CANCELADA: "destructive",
};

function formatDate(date: string) {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDisplayName(profile: EmployeeProfile) {
  const name = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  return name || profile.email || "Funcionário";
}

function extractErrorMessage(error: Error) {
  const cleaned = error.message.replace(/^\d{3}:\s*/, "");
  return cleaned || "Ocorreu um erro inesperado.";
}

export default function EmployeeAccess() {
  const queryClient = useQueryClient();
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [signingId, setSigningId] = useState<string | null>(null);

  const employeeQuery = useQuery<EmployeeProfile | null>({
    queryKey: ["/api/employee/me"],
    queryFn: getQueryFn<EmployeeProfile | null>({ on401: "returnNull" }),
  });

  const requisitionsQuery = useQuery<EmployeeRequisition[]>({
    queryKey: ["/api/employee/requisitions"],
    enabled: Boolean(employeeQuery.data),
  });

  const registerMutation = useMutation({
    mutationFn: async (data: typeof registerData) => {
      const response = await apiRequest("POST", "/api/employee/register", data);
      return await response.json();
    },
    onSuccess: async (_result, variables) => {
      toast({
        title: "Cadastro realizado com sucesso",
        description: "Agora você pode realizar o login para acessar suas requisições.",
      });
      setRegisterData({ name: "", email: "", password: "" });
      setLoginData((prev) => ({ ...prev, email: variables.email }));
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Não foi possível concluir o cadastro",
        description: extractErrorMessage(error),
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: typeof loginData) => {
      const response = await apiRequest("POST", "/api/employee/login", data);
      return await response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Login realizado",
        description: "Bem-vindo ao portal do funcionário.",
      });
      setLoginData({ email: "", password: "" });
      await queryClient.invalidateQueries({ queryKey: ["/api/employee/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/employee/requisitions"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Não foi possível entrar",
        description: extractErrorMessage(error),
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/employee/logout");
    },
    onSuccess: async () => {
      toast({
        title: "Sessão encerrada",
        description: "Você saiu do portal do funcionário.",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/employee/me"] });
      queryClient.removeQueries({ queryKey: ["/api/employee/requisitions"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Não foi possível encerrar a sessão",
        description: extractErrorMessage(error),
      });
    },
  });

  const signMutation = useMutation({
    mutationFn: async (requisitionId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/employee/requisitions/${requisitionId}/sign`,
      );
      return await response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Requisição assinada",
        description: "A administração será notificada sobre a retirada.",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/employee/requisitions"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Não foi possível assinar a requisição",
        description: extractErrorMessage(error),
      });
    },
    onSettled: () => {
      setSigningId(null);
    },
  });

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    registerMutation.mutate(registerData);
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleSign = (id: string) => {
    setSigningId(id);
    signMutation.mutate(id);
  };

  if (employeeQuery.isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Carregando portal do funcionário...</p>
      </div>
    );
  }

  const employee = employeeQuery.data;

  return (
    <div className="min-h-screen bg-muted/40 p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Portal do Funcionário</h1>
          <p className="text-muted-foreground">
            Cadastre-se, acesse suas requisições e confirme a retirada dos materiais
            liberados pela administração.
          </p>
        </div>

        {!employee ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cadastro de funcionário</CardTitle>
                <CardDescription>
                  Informe seus dados para receber acesso ao portal exclusivo de
                  funcionários.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleRegister}>
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nome completo</Label>
                    <Input
                      id="register-name"
                      value={registerData.name}
                      onChange={(event) =>
                        setRegisterData((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Digite seu nome"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">E-mail corporativo</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerData.email}
                      onChange={(event) =>
                        setRegisterData((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }))
                      }
                      placeholder="exemplo@empresa.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerData.password}
                      onChange={(event) =>
                        setRegisterData((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Crie uma senha segura"
                      minLength={6}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Cadastrar funcionário
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acesso ao portal</CardTitle>
                <CardDescription>
                  Utilize suas credenciais para acompanhar e assinar as requisições
                  destinadas a você.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginData.email}
                      onChange={(event) =>
                        setLoginData((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }))
                      }
                      placeholder="exemplo@empresa.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginData.password}
                      onChange={(event) =>
                        setLoginData((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Digite sua senha"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Entrar no portal
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Requisições destinadas a você</CardTitle>
              <CardDescription>
                Confirme a retirada das requisições pendentes para liberar os materiais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-foreground">Olá, {getDisplayName(employee)}!</p>
                  <p>
                    Requisitar materiais somente após confirmação garante o controle do estoque
                    e mantém o histórico atualizado.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  Sair do portal
                </Button>
              </div>

              {requisitionsQuery.isLoading ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Carregando suas requisições...</span>
                </div>
              ) : requisitionsQuery.isError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  Não foi possível carregar suas requisições. Atualize a página para tentar
                  novamente.
                </div>
              ) : requisitionsQuery.data && requisitionsQuery.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Observação</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requisitionsQuery.data.map((requisition) => {
                        const isSigning = signingId === requisition.id && signMutation.isPending;
                        return (
                          <TableRow key={requisition.id}>
                            <TableCell>
                              <div className="font-medium">{requisition.material.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Código: {requisition.material.code}
                              </div>
                              {requisition.createdBy && (
                                <div className="text-xs text-muted-foreground">
                                  Criada por: {[requisition.createdBy.firstName, requisition.createdBy.lastName]
                                    .filter(Boolean)
                                    .join(" ") || requisition.createdBy.email}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {requisition.quantity} {requisition.material.unit}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusBadgeVariant[requisition.status]}>
                                {statusLabels[requisition.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(requisition.createdAt)}</TableCell>
                            <TableCell className="max-w-xs">
                              {requisition.observation ? (
                                <span className="text-sm text-muted-foreground">
                                  {requisition.observation}
                                </span>
                              ) : (
                                <span className="text-xs italic text-muted-foreground">
                                  Sem observações
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => handleSign(requisition.id)}
                                disabled={
                                  requisition.status !== "PENDENTE" ||
                                  signMutation.isPending ||
                                  signingId === requisition.id
                                }
                              >
                                {isSigning ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                )}
                                Assinar retirada
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                  <CheckCircle className="h-8 w-8" />
                  <p className="font-medium text-foreground">Nenhuma requisição pendente no momento.</p>
                  <p className="text-sm">
                    Assim que houver um novo material disponível para retirada, ele aparecerá aqui
                    para confirmação.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
