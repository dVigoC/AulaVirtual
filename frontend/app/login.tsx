import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import LoginForm from "../components/auth/LoginForm";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { login, loginLoading, error } = useAuth();
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    const role = await login(email, password);

    if (!role) return; // error ya visible en el formulario vía prop "error"

    /*const routes: Record<string, string> = {
      ADMIN: "/(dashboard)/admin",
      DOCENTE: "/(dashboard)/docente",
      ESTUDIANTE: "/(dashboard)/estudiante",
    };*/

    // Todos los roles van al módulo inicio por defecto
    router.replace("/(dashboard)/inicio" as any);
  };

  return (
    <>
      <StatusBar style="light" />
      <LoginForm onSubmit={handleLogin} loading={loginLoading} error={error} />
    </>
  );
}
