import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";

const schema = z.object({
  email: z.string().min(1, "El email es obligatorio").email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSubmit: (email: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export default function LoginForm({ onSubmit, loading, error }: Props) {
  const [showPass, setShowPass] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const submit = (data: FormData) => onSubmit(data.email, data.password);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.emoji}>🎓</Text>
          <Text style={s.title}>Aula Virtual</Text>
          <Text style={s.subtitle}>Inicia sesión para continuar</Text>
        </View>

        <View style={s.card}>
          {/* EMAIL */}
          <View style={s.field}>
            <Text style={s.label}>Correo electrónico</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[s.input, errors.email && s.inputError]}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  placeholder="tucorreo@example.com"
                  placeholderTextColor="#aaa"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              )}
            />
            {errors.email && (
              <Text style={s.errorMsg}>{errors.email.message}</Text>
            )}
          </View>

          {/* PASSWORD */}
          <View style={s.field}>
            <Text style={s.label}>Contraseña</Text>
            <View style={s.passWrapper}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      s.input,
                      s.passInput,
                      errors.password && s.inputError,
                    ]}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                    placeholder="••••••••"
                    placeholderTextColor="#aaa"
                    secureTextEntry={!showPass}
                    autoComplete="password"
                  />
                )}
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowPass((p) => !p)}
              >
                <Text style={s.eyeIcon}>{showPass ? "🙈" : "👁"}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={s.errorMsg}>{errors.password.message}</Text>
            )}
          </View>

          {/* Error del servidor */}
          {error && (
            <View style={s.serverError}>
              <Text style={s.serverErrorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* Botón */}
          <TouchableOpacity
            style={[s.button, loading && s.buttonDisabled]}
            onPress={handleSubmit(submit)}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.buttonText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Reemplaza todo el objeto "styles" al final del archivo por este:

const s = StyleSheet.create({
  // ── Contenedor exterior (fondo oscuro pantalla completa) ──
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center", // ← centra horizontalmente
    padding: 24,
    backgroundColor: "#0f1b35",
  },

  // ── Header (logo + título) ────────────────────────────────
  header: {
    alignItems: "center",
    marginBottom: 28,
    width: "100%",
    maxWidth: 400, // ← mismo ancho que el card
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", marginTop: 8 },
  subtitle: { fontSize: 13, color: "#8fa3c0", marginTop: 4 },

  // ── Card blanco centrado y reducido ───────────────────────
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 400, // ← ancho máximo del card
    alignSelf: "center", // ← centrado en web y móvil
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },

  // ── Campos del formulario ─────────────────────────────────
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "600", color: "#334", marginBottom: 6 },
  input: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: "#222",
    backgroundColor: "#fafafa",
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
    }),
  },
  inputError: { borderColor: "#e53935", 
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
    }),
  },
  passWrapper: { position: "relative" },
  passInput: { paddingRight: 48 },
  eyeBtn: { position: "absolute", right: 12, top: 12 },
  eyeIcon: { fontSize: 18 },
  errorMsg: { color: "#e53935", fontSize: 12, marginTop: 4 },

  // ── Error del servidor ────────────────────────────────────
  serverError: {
    backgroundColor: "#fdecea",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  serverErrorText: { color: "#c62828", fontSize: 13 },

  // ── Botón ─────────────────────────────────────────────────
  button: {
    backgroundColor: "#0f3460",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
