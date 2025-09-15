import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Shield, BarChart3, Users, CheckCircle, ArrowRight } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    console.log('Login button clicked');
    window.location.href = "/api/login";
  };

  const features = [
    {
      icon: Package,
      title: "Controle de Estoque",
      description: "Gerencie materiais, controle entradas e saídas com facilidade"
    },
    {
      icon: Shield,
      title: "Assinatura Digital",
      description: "Sistema seguro de assinatura digital para todas as requisições"
    },
    {
      icon: BarChart3,
      title: "Dashboard Completo",
      description: "Visualize dados em tempo real com gráficos e relatórios detalhados"
    },
    {
      icon: Users,
      title: "Controle de Acesso",
      description: "Diferentes níveis de permissão para administradores, estoque e funcionários"
    }
  ];

  const benefits = [
    "Substitui planilhas manuais por sistema digital",
    "Controle automático de estoque mínimo",
    "Alertas em tempo real para materiais críticos",
    "Trilha de auditoria completa",
    "Interface responsiva para PC e mobile",
    "Relatórios exportáveis em Excel e PDF"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5" data-testid="page-landing">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold">Sistema de Gestão de Estoque</span>
          </div>
          <Button onClick={handleLogin} data-testid="button-login-header">
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Gestão de Estoque
            <span className="text-primary block">com Assinatura Digital</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sistema completo para controle de materiais, requisições digitais e dashboard administrativo. 
            Substitua planilhas manuais por uma solução moderna e segura.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleLogin}
              data-testid="button-login-hero"
            >
              Começar Agora
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline">
              Saiba Mais
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Funcionalidades Principais</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tudo que você precisa para modernizar o controle de estoque da sua empresa
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover-elevate" data-testid={`feature-card-${index}`}>
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Por que escolher nosso sistema?</h2>
              <p className="text-muted-foreground">
                Modernize sua gestão de estoque com tecnologia segura e eficiente
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 p-4 bg-background rounded-lg border"
                  data-testid={`benefit-item-${index}`}
                >
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Pronto para começar?</CardTitle>
            <CardDescription>
              Faça login com sua conta para acessar o sistema de gestão de estoque
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Button 
              size="lg" 
              className="w-full sm:w-auto"
              onClick={handleLogin}
              data-testid="button-login-cta"
            >
              <Shield className="h-4 w-4 mr-2" />
              Fazer Login
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Sistema seguro com autenticação e controle de acesso por perfis
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-background">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Sistema de Gestão de Estoque. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}