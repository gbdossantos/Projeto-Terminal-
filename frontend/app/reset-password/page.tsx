"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    // O link do email autentica via hash da URL — supabase-js detecta e cria a
    // sessão automaticamente antes deste efeito rodar.
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setPronto(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (novaSenha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setLoading(false);

    if (error) {
      setErro("Não foi possível atualizar a senha. Solicite um novo link.");
      return;
    }
    setSucesso(true);
    setTimeout(() => router.push("/"), 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div className="flex justify-center" style={{ marginBottom: 28 }}>
          <span
            className="uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--ink-3)",
            }}
          >
            TERMINAL · BOI GORDO
          </span>
        </div>

        <div
          style={{
            background: "var(--paper-2)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-card)",
            padding: "28px 24px",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: 4,
            }}
          >
            Nova senha
          </h1>

          {!pronto ? (
            <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 12 }}>
              Abra esta página a partir do link enviado por email.
            </p>
          ) : sucesso ? (
            <p style={{ fontSize: 13, color: "var(--gain-2)", marginTop: 12 }}>
              Senha atualizada. Redirecionando...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 14, marginTop: 16 }}>
              <div className="flex flex-col" style={{ gap: 6 }}>
                <Label htmlFor="nova-senha">Nova senha</Label>
                <Input
                  id="nova-senha"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex flex-col" style={{ gap: 6 }}>
                <Label htmlFor="confirmacao">Confirmar senha</Label>
                <Input
                  id="confirmacao"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {erro && <p style={{ fontSize: 13, color: "var(--loss)" }}>{erro}</p>}

              <Button type="submit" size="lg" disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
