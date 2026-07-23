"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Campos sobre o card de vidro: fundo sólido (--paper) pra o texto digitado
// não competir com a foto que atravessa o blur.
const campoSolido: React.CSSProperties = { background: "var(--paper)" };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoReset, setEnviandoReset] = useState(false);
  const [resetEnviado, setResetEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    setLoading(false);

    if (error) {
      setErro("Email ou senha incorretos.");
      return;
    }

    const redirect = searchParams.get("redirect") || "/";
    router.push(redirect);
    router.refresh();
  }

  async function handleEsqueciSenha() {
    if (!email) {
      setErro("Digite seu email acima antes de solicitar o link de recuperação.");
      return;
    }
    setErro(null);
    setEnviandoReset(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setEnviandoReset(false);

    if (error) {
      setErro("Não foi possível enviar o email de recuperação.");
      return;
    }
    setResetEnviado(true);
  }

  return (
    <AuthShell>
      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--ink)",
          marginBottom: 4,
        }}
      >
        Entrar
      </h1>
      <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 20 }}>
        Acesso restrito a contas autorizadas.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 14 }}>
        <div className="flex flex-col" style={{ gap: 6 }}>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@fazenda.com.br"
            style={campoSolido}
          />
        </div>

        <div className="flex flex-col" style={{ gap: 6 }}>
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            style={campoSolido}
          />
        </div>

        {erro && <p style={{ fontSize: 13, color: "var(--loss)" }}>{erro}</p>}

        {resetEnviado && (
          <p style={{ fontSize: 13, color: "var(--gain-2)" }}>
            Se o email existir, enviamos um link de recuperação.
          </p>
        )}

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? "Entrando..." : "Entrar"}
        </Button>

        <button
          type="button"
          onClick={handleEsqueciSenha}
          disabled={enviandoReset}
          style={{
            fontSize: 12,
            color: "var(--ink-2)",
            textAlign: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          {enviandoReset ? "Enviando..." : "Esqueci minha senha"}
        </button>
      </form>
    </AuthShell>
  );
}
