import { useRouter } from "expo-router";
import { useRef, useState } from "react";
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
  View
} from "react-native";
import { createUser, UserRole } from "../../../services/userApi";

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
  success: "#3ab5a0", // <-- Color de éxito agregado para el toast
};

const ROLES: { value: UserRole; label: string; desc: string; color: string }[] =
  [
    {
      value: "ADMIN",
      label: "Administrador",
      desc: "Acceso total al sistema",
      color: "#5DA15E",
    },
    {
      value: "DOCENTE",
      label: "Docente",
      desc: "Gestión de clases y notas",
      color: "#3ab5a0",
    },
    {
      value: "ESTUDIANTE",
      label: "Estudiante",
      desc: "Acceso a calificaciones propias",
      color: "#5b8dee",
    },
  ];

// ── Hook: Toast transitorio ──
function useToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<"success" | "error">("success");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (text: string, t: "success" | "error" = "success") => {
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
            backgroundColor: type === "success" ? C.success : C.danger,
          },
        ]}
        pointerEvents="none"
      >
        <Text style={s.toastText}>
          {type === "success" ? "✓  " : "✕  "}
          {msg}
        </Text>
      </Animated.View>
    ) : null;

  return { show, Toast };
}

// ── 1. DEFINIR EL COMPONENTE FIELD AQUÍ AFUERA ──
interface FieldProps {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  keyboardType?: any;
  secureTextEntry?: boolean;
  error?: string;
  hint?: string;
}

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  secureTextEntry,
  error,
  hint,
}: FieldProps) => (
  <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      style={[s.input, !!error && s.inputError]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
    />
    {hint && !error && <Text style={s.hint}>{hint}</Text>}
    {error && <Text style={s.errorText}>{error}</Text>}
  </View>
);

// ── 2. TU COMPONENTE PRINCIPAL QUEDA LIMPIO ──
export default function NuevoUsuario() {
  const router = useRouter();
  const { show: toast, Toast } = useToast(); // <-- Inicializando el Toast
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("ESTUDIANTE");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "El nombre es obligatorio";
    if (!username.trim()) e.username = "El username es obligatorio";
    else if (username.length < 3) e.username = "Mínimo 3 caracteres";
    else if (!/^[a-z0-9_.]+$/.test(username))
      e.username = "Solo letras minúsculas, números, _ y .";
    if (!email.trim()) e.email = "El email es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Formato de email inválido";
    if (!password) e.password = "La contraseña es obligatoria";
    else if (password.length < 8) e.password = "Mínimo 8 caracteres";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Función para limpiar todos los campos
  const clearFields = () => {
    setUsername("");
    setEmail("");
    setFullName("");
    setPassword("");
    setRole("ESTUDIANTE");
    setErrors({});
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await createUser({ username, email, fullName, password, role });
      toast("Usuario creado correctamente"); // Notificación transitoria de éxito
      clearFields(); // Limpiar campos
    } catch (err: any) {
      const msg = err.response?.data?.message ?? "No se pudo crear el usuario.";
      toast(msg, "error"); // Notificación transitoria de error
    } finally {
      setSaving(false);
    }
  };

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
        <View style={s.pageHeader}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹ Usuarios</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>Nuevo usuario</Text>
          <Text style={s.pageSub}>Completar todos los campos requeridos</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Información personal</Text>

          <Field
            label="Nombre completo *"
            value={fullName}
            onChange={setFullName}
            placeholder="Ej. Juan Pérez García"
            error={errors.fullName}
          />
          <Field
            label="Email *"
            value={email}
            onChange={setEmail}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            error={errors.email}
          />
          <Field
            label="Username *"
            value={username}
            onChange={(t) => setUsername(t.toLowerCase())}
            placeholder="juan.perez"
            hint="Solo letras minúsculas, números, _ y ."
            error={errors.username}
          />
          <Field
            label="Contraseña *"
            value={password}
            onChange={setPassword}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            hint="Se enviará al usuario en el primer acceso"
            error={errors.password}
          />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Rol del usuario</Text>
          <View style={s.roleGrid}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  s.roleCard,
                  role === r.value && {
                    borderColor: r.color,
                    backgroundColor: r.color + "12",
                  },
                ]}
                onPress={() => setRole(r.value)}
              >
                <View style={[s.roleIndicator, { backgroundColor: r.color }]} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      s.roleLabel,
                      role === r.value && { color: r.color },
                    ]}
                  >
                    {r.label}
                  </Text>
                  <Text style={s.roleDesc}>{r.desc}</Text>
                </View>
                {role === r.value && (
                  <View style={[s.roleCheck, { backgroundColor: r.color }]}>
                    <Text style={s.roleCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.btnRow}>
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={s.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.createBtn, saving && s.createBtnDisabled]}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.createBtnText}>Crear usuario</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  container: { padding: 20, paddingBottom: 60, gap: 16 },
  pageHeader: { marginBottom: 4 },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 14, color: C.navyMd, fontWeight: "600" },
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.navy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
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
      web: {
        outlineStyle: "none",
      } as any,
    }),
  },
  inputError: {
    borderColor: C.danger,
    backgroundColor: "rgba(224,82,82,0.04)",
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
    }),
  },
  hint: { fontSize: 11.5, color: C.muted },
  errorText: { fontSize: 11.5, color: C.danger, fontWeight: "600" },
  roleGrid: { gap: 10 },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f8f9fc",
  },
  roleIndicator: { width: 4, height: 36, borderRadius: 2 },
  roleLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: C.navy,
    marginBottom: 2,
  },
  roleDesc: { fontSize: 11.5, color: C.muted },
  roleCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  roleCheckText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  btnRow: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: C.sub },
  createBtn: {
    flex: 2,
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
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // ── Estilos añadidos para el Toast ──
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
