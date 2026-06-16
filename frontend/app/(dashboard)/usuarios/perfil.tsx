// ── app/(dashboard)/perfil.tsx ────────────────────────────────────────
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
  UserResponse,
  UserRole,
} from "../../../services/userApi";

// ── Tu Paleta de Colores Idéntica ─────────────────────────────────────────────
const C = {
  navy: "#1b2257",
  navyMd: "#2d3a82",
  bg: "#f0f2f8",
  white: "#ffffff",
  muted: "#9099bb",
  sub: "#7b85b0",
  accent: "#e8a020",
  border: "#e4e8f4",
  danger: "#e05252",
  success: "#3ab5a0",
};

const ROLE_STYLES: Record<UserRole, { label: string; color: string }> = {
  ADMIN: { label: "Administrador", color: "#5DA15E" },
  DOCENTE: { label: "Docente", color: "#3ab5a0" },
  ESTUDIANTE: { label: "Estudiante", color: "#5b8dee" },
};

// ── Tu Hook de Toast Transitorio Reutilizado ──────────────────────────────────
function useToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (text: string, t: "success" | "error" | "info" = "success") => {
    if (timer.current) clearTimeout(timer.current);
    opacity.setValue(0);
    setMsg(text);
    setType(t);
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
    timer.current = setTimeout(() => setMsg(""), 2700);
  };

  const Toast = () =>
    msg ? (
      <Animated.View
        style={[
          s.toast,
          {
            opacity,
            backgroundColor:
              type === "success"
                ? C.success
                : type === "error"
                  ? C.danger
                  : C.navyMd,
          },
        ]}
        pointerEvents="none"
      >
        <Text style={s.toastText}>
          {type === "success" ? "✓  " : type === "error" ? "✕  " : "ℹ  "}
          {msg}
        </Text>
      </Animated.View>
    ) : null;

  return { show, Toast };
}

export default function MiPerfil() {
  const router = useRouter();
  const { show: toast, Toast } = useToast();

  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Campos del formulario
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("ESTUDIANTE");

  // Sección de seguridad interna
  const [pwdMode, setPwdMode] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const pwdMatch = confirmPwd.length > 0 && newPwd === confirmPwd;
  const pwdMismatch = confirmPwd.length > 0 && newPwd !== confirmPwd;

  // ── Cargar datos desde el endpoint del token /api/profile ──
  useEffect(() => {
    (async () => {
      try {
        const response = await getMyProfile();

        const data: UserResponse = response.data;

        if (!data) {
          throw new Error("La respuesta del perfil regresó vacía");
        }

        // Ahora TypeScript sabe con 100% de certeza que estas propiedades existen en 'UserResponse'
        setUser(data);
        setUsername(data.username || "");
        setEmail(data.email || "");
        setFullName(data.fullName ?? "");
        setRole(data.role || "ESTUDIANTE");
      } catch (err) {
        toast("No se pudo estructurar tu información de perfil", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCancelPwd = () => {
    setPwdMode(false);
    setNewPwd("");
    setConfirmPwd("");
  };

  const handleSaveProfile = async () => {
    if (!username.trim() || !email.trim()) {
      toast("Username y email son campos obligatorios", "error");
      return;
    }
    
    setSaving(true);
    try {
      // Envia el payload limpio tal como lo espera la interfaz de updateMyProfile
      const response = await updateMyProfile({
        username: username.trim().toLowerCase(),
        email: email.trim(),
        fullName: fullName.trim(),
      });

      // Sincronizamos la respuesta fresca del servidor con los estados de React
      if (response && response.data) {
        const dataFresh = response.data; // TypeScript sabe que es tipo UserResponse
        
        setUser(dataFresh);
        setUsername(dataFresh.username || "");
        setEmail(dataFresh.email || "");
        setFullName(dataFresh.fullName || ""); // ✨ Corregido: Usamos solo fullName
      }

      toast("Tu perfil fue actualizado correctamente");
    } catch (err: any) {
      const msg =
        err.response?.data?.message ??
        "Error al actualizar los datos corporativos.";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPwd.length < 8) {
      toast("La contraseña requiere un mínimo de 8 caracteres", "error");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast("Las contraseñas ingresadas no coinciden", "error");
      return;
    }
    setSaving(true);
    try {
      await changeMyPassword(newPwd);
      handleCancelPwd();
      toast("Contraseña modificada con éxito");
    } catch (err: any) {
      const msg =
        err.response?.data?.message ?? "Error al modificar las credenciales.";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.navyMd} />
      </View>
    );
  }

  const currentRoleStyle = ROLE_STYLES[role] || ROLE_STYLES.ESTUDIANTE;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Toast />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera limpia */}
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>Mi Perfil</Text>
          <Text style={s.pageSub}>
            Gestiona tu información personal dentro del aula
          </Text>
        </View>

        {/* Datos generales */}
        <View style={s.section}>
          <View style={s.profileHeaderRow}>
            <Text style={s.sectionTitle}>Datos Personales</Text>
            {/* Badge de Rol Estático */}
            <View
              style={[
                s.badge,
                {
                  backgroundColor: currentRoleStyle.color + "15",
                  borderColor: currentRoleStyle.color,
                },
              ]}
            >
              <Text style={[s.badgeText, { color: currentRoleStyle.color }]}>
                {currentRoleStyle.label}
              </Text>
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Nombre completo</Text>
            <TextInput
              style={s.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Tu nombre completo"
              placeholderTextColor={C.muted}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Username</Text>
            <TextInput
              style={s.input}
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase())}
              placeholder="nombre_usuario"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Email institucional</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="correo@aula.com"
              placeholderTextColor={C.muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.saveBtnText}>Actualizar perfil</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Seguridad / Contraseña */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Seguridad de la cuenta</Text>
            <TouchableOpacity
              onPress={pwdMode ? handleCancelPwd : () => setPwdMode(true)}
            >
              <Text style={s.toggleLink}>
                {pwdMode ? "Cancelar" : "Modificar contraseña"}
              </Text>
            </TouchableOpacity>
          </View>

          {pwdMode && (
            <>
              <View style={s.field}>
                <Text style={s.label}>Nueva contraseña</Text>
                <TextInput
                  style={s.input}
                  value={newPwd}
                  onChangeText={setNewPwd}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor={C.muted}
                  secureTextEntry
                />
              </View>

              <View style={s.field}>
                <Text style={s.label}>Confirmar nueva contraseña</Text>
                <TextInput
                  style={[
                    s.input,
                    pwdMatch && s.inputSuccess,
                    pwdMismatch && s.inputError,
                  ]}
                  value={confirmPwd}
                  onChangeText={setConfirmPwd}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor={C.muted}
                  secureTextEntry
                />
                {pwdMatch && (
                  <Text style={s.matchText}>✓ Las contraseñas coinciden</Text>
                )}
                {pwdMismatch && (
                  <Text style={s.mismatchText}>
                    ✕ Las contraseñas no coinciden
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  s.saveBtn,
                  { backgroundColor: C.accent },
                  saving && s.saveBtnDisabled,
                ]}
                onPress={handleUpdatePassword}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.saveBtnText}>Guardar credenciales</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Metadatos informativos (Solo lectura) */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Actividad de ingreso</Text>
          <View style={s.infoGrid}>
            {[
              [
                "Último acceso al sistema",
                user?.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString("es-PE")
                  : "—",
              ],
              [
                "Miembro desde",
                user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("es-PE")
                  : "—",
              ],
            ].map(([key, val]) => (
              <View key={key} style={s.infoRow}>
                <Text style={s.infoKey}>{key}</Text>
                <Text style={s.infoVal}>{val}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Tu Estructura de Estilos Clonada ──────────────────────────────────────────
const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  container: { padding: 20, paddingBottom: 60, gap: 16 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
  pageHeader: { marginBottom: 4, marginTop: Platform.OS === "ios" ? 10 : 0 },
  pageTitle: { fontSize: 24, fontWeight: "800", color: C.navy },
  pageSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  section: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 18,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 10px rgba(27,34,87,0.08)" } as any,
    }),
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.navy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLink: { fontSize: 13, color: C.navyMd, fontWeight: "600" },
  field: { gap: 6 },
  label: { fontSize: 12.5, fontWeight: "600", color: C.sub },
  input: {
    backgroundColor: "#f6f7fb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: C.navy,
    ...Platform.select({ web: { outlineStyle: "none" } as any }),
  },
  inputSuccess: {
    borderColor: C.success,
    backgroundColor: "rgba(58,181,160,0.04)",
  },
  inputError: {
    borderColor: C.danger,
    backgroundColor: "rgba(224,82,82,0.04)",
  },
  matchText: { fontSize: 11.5, color: C.success, fontWeight: "600" },
  mismatchText: { fontSize: 11.5, color: C.danger, fontWeight: "600" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  saveBtn: {
    backgroundColor: C.navyMd,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      web: {
        boxShadow: "0 2px 8px rgba(27,34,87,0.2)",
        cursor: "pointer",
      } as any,
    }),
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  infoGrid: { gap: 0 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoKey: { fontSize: 13, color: C.sub },
  infoVal: { fontSize: 13, fontWeight: "600", color: C.navy },
  toast: {
    position: "absolute",
    bottom: 36,
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    zIndex: 999,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
      web: { boxShadow: "0 4px 16px rgba(0,0,0,0.18)" } as any,
    }),
  },
  toastText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
