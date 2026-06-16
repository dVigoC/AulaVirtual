// ── app/(dashboard)/usuarios/[id].tsx ────────────────────────────────────────
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  getUserById,
  resetUserPassword,
  updateUser,
  UserResponse,
  UserRole,
} from "../../../services/userApi";

// ── Paleta ────────────────────────────────────────────────────────────────────
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

const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: "ADMIN",      label: "Administrador", color: "#5DA15E" },
  { value: "DOCENTE",    label: "Docente",        color: "#3ab5a0" },
  { value: "ESTUDIANTE", label: "Estudiante",     color: "#5b8dee" },
];

// ── Hook: Toast transitorio ───────────────────────────────────────────────────
function useToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [msg,  setMsg]  = useState("");
  const [type, setType] = useState<"success" | "error">("success");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (text: string, t: "success" | "error" = "success") => {
    if (timer.current) clearTimeout(timer.current);
    // Reinicia opacidad por si el toast ya estaba visible
    opacity.setValue(0);
    setMsg(text);
    setType(t);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(() => setMsg(""), 2700);
  };

  const Toast = () =>
    msg ? (
      <Animated.View
        style={[
          s.toast,
          { opacity, backgroundColor: type === "success" ? C.success : C.danger },
        ]}
        pointerEvents="none"
      >
        <Text style={s.toastText}>
          {type === "success" ? "✓  " : "✕  "}{msg}
        </Text>
      </Animated.View>
    ) : null;

  return { show, Toast };
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function EditarUsuario() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { show: toast, Toast } = useToast();

  const [user,    setUser]    = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  // Campos generales
  const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");
  const [fullName, setFullName] = useState("");
  const [role,     setRole]     = useState<UserRole>("ESTUDIANTE");

  // Panel de contraseña
  const [pwdMode,    setPwdMode]    = useState(false);
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  // Indicadores de coincidencia (solo activos cuando ya escribió algo)
  const pwdMatch    = confirmPwd.length > 0 && newPwd === confirmPwd;
  const pwdMismatch = confirmPwd.length > 0 && newPwd !== confirmPwd;

  // ── Cargar usuario ────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await getUserById(id);
        setUser(data);
        setUsername(data.username);
        setEmail(data.email);
        setFullName(data.fullName ?? "");
        setRole(data.role);
      } catch {
        Alert.alert("Error", "No se pudo cargar el usuario.");
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Limpiar y cerrar panel de contraseña ─────────────────────────
  const handleCancelPwd = () => {
    setPwdMode(false);
    setNewPwd("");
    setConfirmPwd("");
  };

  // ── Guardar datos generales ───────────────────────────────────────
  const handleSave = async () => {
    if (!username.trim() || !email.trim()) {
      toast("Username y email son obligatorios", "error");
      return;
    }
    setSaving(true);
    try {
      await updateUser(id!, {
        username: username.trim().toLowerCase(),
        email:    email.trim(),
        fullName: fullName.trim(),
        role,
      });
      toast("Datos guardados correctamente");           // ✅ toast éxito
    } catch (err: any) {
      const msg = err.response?.data?.message ?? "No se pudo actualizar el usuario.";
      toast(msg, "error");                              // ✅ toast error
    } finally {
      setSaving(false);
    }
  };

  // ── Actualizar contraseña ─────────────────────────────────────────
  const handleResetPassword = async () => {
    if (newPwd.length < 8) {
      toast("La contraseña debe tener al menos 8 caracteres", "error");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast("Las contraseñas no coinciden", "error");
      return;
    }
    setSaving(true);
    try {
      await resetUserPassword(id!, newPwd);
      handleCancelPwd();                                // ① limpia y cierra panel
      toast("Contraseña actualizada correctamente");    // ② toast éxito
    } catch (err: any) {
      const msg = err.response?.data?.message ?? "No se pudo actualizar la contraseña.";
      toast(msg, "error");                              // ② toast error
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.navyMd} />
      </View>
    );
  }

  // ── UI ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Toast flota sobre todo el contenido */}
      <Toast />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cabecera ── */}
        <View style={s.pageHeader}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹ Usuarios</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>Editar usuario</Text>
          <Text style={s.pageSub}>{user?.email}</Text>
        </View>

        {/* ── Datos generales ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Datos generales</Text>

          <View style={s.field}>
            <Text style={s.label}>Nombre completo</Text>
            <TextInput
              style={s.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nombre y apellidos"
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
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={C.muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Selector de rol */}
          <View style={s.field}>
            <Text style={s.label}>Rol</Text>
            <View style={s.roleRow}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    s.roleChip,
                    role === r.value && {
                      backgroundColor: r.color + "20",
                      borderColor: r.color,
                    },
                  ]}
                  onPress={() => setRole(r.value)}
                >
                  <Text
                    style={[
                      s.roleChipText,
                      role === r.value && { color: r.color },
                    ]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.saveBtnText}>Guardar cambios</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Cambiar contraseña ── */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Contraseña</Text>
            <TouchableOpacity
              onPress={pwdMode ? handleCancelPwd : () => setPwdMode(true)}
            >
              <Text style={s.toggleLink}>
                {pwdMode ? "Cancelar" : "Cambiar"}
              </Text>
            </TouchableOpacity>
          </View>

          {pwdMode && (
            <>
              {/* Nueva contraseña */}
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

              {/* Confirmar contraseña + indicador */}
              <View style={s.field}>
                <Text style={s.label}>Confirmar contraseña</Text>
                <TextInput
                  style={[
                    s.input,
                    pwdMatch    && s.inputSuccess,
                    pwdMismatch && s.inputError,
                  ]}
                  value={confirmPwd}
                  onChangeText={setConfirmPwd}
                  placeholder="Repite la contraseña"
                  placeholderTextColor={C.muted}
                  secureTextEntry
                />
                {pwdMatch    && <Text style={s.matchText}>✓ Las contraseñas coinciden</Text>}
                {pwdMismatch && <Text style={s.mismatchText}>✕ Las contraseñas no coinciden</Text>}
              </View>

              <TouchableOpacity
                style={[
                  s.saveBtn,
                  { backgroundColor: C.accent },
                  saving && s.saveBtnDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.saveBtnText}>Actualizar contraseña</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Info de cuenta (solo lectura) ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Información de cuenta</Text>
          <View style={s.infoGrid}>
            {[
              ["Estado",           user?.active       ? "Activo"  : "Inactivo"],
              ["Email verificado", user?.emailVerified ? "Sí"      : "No"],
              ["Cuenta bloqueada", user?.accountLocked ? "Sí"      : "No"],
              [
                "Último acceso",
                user?.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString("es-PE")
                  : "—",
              ],
              [
                "Creado",
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

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:    { flex: 1, backgroundColor: C.bg },
  container: { padding: 20, paddingBottom: 60, gap: 16 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },

  // Cabecera
  pageHeader: { marginBottom: 4 },
  backBtn:    { marginBottom: 8 },
  backText:   { fontSize: 14, color: C.navyMd, fontWeight: "600" },
  pageTitle:  { fontSize: 24, fontWeight: "800", color: C.navy },
  pageSub:    { fontSize: 13, color: C.muted, marginTop: 2 },

  // Secciones
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

  // Campos
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
    ...Platform.select({
      web: { outlineStyle: "none" } as any,
    }),
  },
  inputSuccess: {
    borderColor: C.success,
    backgroundColor: "rgba(58,181,160,0.04)",
  },
  inputError: {
    borderColor: C.danger,
    backgroundColor: "rgba(224,82,82,0.04)",
  },
  matchText:    { fontSize: 11.5, color: C.success, fontWeight: "600" },
  mismatchText: { fontSize: 11.5, color: C.danger,  fontWeight: "600" },

  // Rol
  roleRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: "#f6f7fb",
  },
  roleChipText: { fontSize: 13, fontWeight: "600", color: C.sub },

  // Botón guardar
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

  // Info de cuenta
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

  // Toast
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