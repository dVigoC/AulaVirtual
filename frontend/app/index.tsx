import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../hooks/useAuth";

export default function Index() {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/login" as any);
      return;
    }

    const routes: Record<string, any> = {
      ADMIN:      "/(dashboard)/admin",
      DOCENTE:    "/(dashboard)/docente",
      ESTUDIANTE: "/(dashboard)/estudiante",
    };

    router.replace(routes[user!.role] as any);
  }, [loading, isAuthenticated, user]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f1b35" }}>
      <ActivityIndicator size="large" color="#4a90e2" />
    </View>
  );
}