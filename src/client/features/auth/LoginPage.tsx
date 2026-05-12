import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "./AuthContext";

type Props = {
  onSuccess: () => void;
};

export function LoginPage({ onSuccess }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
      onSuccess();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-card">
      <h2>Iniciar sesión</h2>

      <form onSubmit={onSubmit} className="form-stack">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {errorMsg ? <p className="error-text">{errorMsg}</p> : null}
    </section>
  );
}