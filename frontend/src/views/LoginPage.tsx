import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Logo } from "@/components/Logo";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";

export function LoginPage() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (token) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSlow(false);
    setError(null);
    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== "/login" ? from : "/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{ backgroundImage: "url(/login-bg.png)" }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-background/80 via-background/50 to-background" />

      <div className="relative w-full max-w-sm">
        <Logo className="mx-auto mb-8 w-72 max-w-full" />

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/80 p-6 shadow-2xl backdrop-blur-md"
        >
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vos@mediaresma.com"
            />
          </Field>
          <Field label="Contraseña" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <ErrorBanner message={error} />}
          <Button type="submit" variant="dark" loading={loading} className="mt-2 h-11 w-full text-base">
            Ingresar
          </Button>
          {loading && slow && (
            <p className="text-center text-xs text-muted text-pretty" role="status">
              El servidor se está despertando, puede tardar hasta un minuto…
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
