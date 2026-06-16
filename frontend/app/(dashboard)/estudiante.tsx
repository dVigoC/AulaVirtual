// ── app/(dashboard)/estudiante.tsx ───────────────────────────────────────────
import { validarPeriodo } from "../../utils/validators";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import {
  AsistenciaEstado,
  AsistenciaItem,
  AsistenciaResponse,
  ClaseConAsistenciasResponse,
  ClaseResponse,
  CursoConEstudiantesResponse,
  EstudianteResponse,
  crearClase,
  getAsistenciasByClase,
  getClasesByCurso,
  getCursosConEstudiantes,
  getMatriculasByCurso,
  marcarFin,
  marcarInicio,
  matricularEstudiantes,
  registrarAsistencias,
  removerMatricula,
} from "../../services/estudianteApi";
import { getUsers } from "../../services/userApi";

// ── Paleta idéntica al resto del proyecto ────────────────────────────────────
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
  purple: "#7c5cbf",
  orange: "#e8a020",
  info: "#5b8dee",
};

// ── Estado de asistencia → colores ───────────────────────────────────────────
const ESTADO_META: Record<
  AsistenciaEstado,
  { label: string; color: string; bg: string }
> = {
  PRESENTE: {
    label: "Presente",
    color: C.success,
    bg: "rgba(58,181,160,0.12)",
  },
  TARDANZA: { label: "Tardanza", color: C.orange, bg: "rgba(232,160,32,0.12)" },
  AUSENTE: { label: "Ausente", color: C.danger, bg: "rgba(224,82,82,0.12)" },
  JUSTIFICADO: {
    label: "Justificado",
    color: C.info,
    bg: "rgba(91,141,238,0.12)",
  },
};

const ESTADO_ORDEN: AsistenciaEstado[] = [
  "PRESENTE",
  "TARDANZA",
  "AUSENTE",
  "JUSTIFICADO",
];

// ── Tipo de tab ───────────────────────────────────────────────────────────────
type Tab = "estudiantes" | "clases";

// ══════════════════════════════════════════════════════════════════════════════
//  Hook Toast (idéntico al del resto del proyecto)
// ══════════════════════════════════════════════════════════════════════════════
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
      Animated.delay(2200),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
    timer.current = setTimeout(() => setMsg(""), 2900);
  };

  const Toast = useCallback(
    () =>
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
      ) : null,
    [msg, type, opacity],
  );

  return { show, Toast };
}

// ══════════════════════════════════════════════════════════════════════════════
//  Modal: Crear Clase
// ══════════════════════════════════════════════════════════════════════════════
function CrearClaseModal({
  visible,
  cursoId,
  cursoNombre,
  anioPeriodo,
  onClose,
  onSaved,
}: {
  visible: boolean;
  cursoId: string;
  cursoNombre: string;
  anioPeriodo: string;
  onClose: () => void;
  onSaved: (c: ClaseResponse) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [titulo, setTitulo] = useState("");
  const [fecha, setFechaDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setTitulo("");
    setFechaDate(new Date());
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const tzOffset = fecha.getTimezoneOffset() * 60000;
      const fechaString = new Date(fecha.getTime() - tzOffset)
        .toISOString()
        .split("T")[0];
      const { data } = await crearClase({
        cursoId,
        titulo: titulo.trim() || undefined,
        fecha: fechaString,
        anioPeriodo,
      });
      onSaved(data);
      reset();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "No se pudo crear la clase.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.sheetHeader}>
            <View>
              <Text style={ms.sheetTitle}>Nueva clase</Text>
              <Text style={ms.sheetSub}>{cursoNombre}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                reset();
                onClose();
              }}
              style={ms.closeBtn}
            >
              <Text style={ms.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={ms.body} keyboardShouldPersistTaps="handled">
            {error ? (
              <View style={ms.errorBanner}>
                <Text style={ms.errorText}>✕ {error}</Text>
              </View>
            ) : null}

            <View style={ms.field}>
              <Text style={ms.label}>Tema / Título (opcional)</Text>
              <TextInput
                style={ms.input}
                value={titulo}
                onChangeText={setTitulo}
                placeholder="Ej: Introducción al libro de Génesis"
                placeholderTextColor={C.muted}
                maxLength={200}
              />
            </View>
            <View style={ms.field}>
              <Text style={ms.label}>Fecha *</Text>
              {Platform.OS === "web" ? (
                // ── Web: input date nativo del navegador ──────────────────────
                <input
                  type="date"
                  value={(() => {
                    const tzOffset = fecha.getTimezoneOffset() * 60000;
                    return new Date(fecha.getTime() - tzOffset)
                      .toISOString()
                      .split("T")[0];
                  })()}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Parsear la fecha sin desfase de zona horaria
                      const [y, m, d] = e.target.value.split("-").map(Number);
                      setFechaDate(new Date(y, m - 1, d));
                    }
                  }}
                  style={
                    {
                      backgroundColor: "#f6f7fb",
                      borderRadius: 10,
                      border: "1px solid #e4e8f4",
                      paddingLeft: 14,
                      paddingRight: 14,
                      paddingTop: 11,
                      paddingBottom: 11,
                      fontSize: 14,
                      color: "#1b2257",
                      width: "100%",
                      boxSizing: "border-box",
                      outline: "none",
                      cursor: "pointer",
                      minHeight: 48,
                      fontFamily: "inherit",
                    } as any
                  }
                />
              ) : (
                // ── iOS / Android: botón que abre DateTimePicker ──────────────
                <TouchableOpacity
                  style={[
                    ms.input,
                    { justifyContent: "center", minHeight: 48 },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: C.navy }}>
                    {fecha.toLocaleDateString("es-PE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {/* DateTimePicker solo para iOS / Android */}
            {Platform.OS !== "web" && showDatePicker && (
              <DateTimePicker
                value={fecha}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event: any, selectedDate?: Date) => {
                  if (Platform.OS === "android") {
                    setShowDatePicker(false);
                  }
                  if (selectedDate) {
                    setFechaDate(selectedDate);
                  }
                }}
              />
            )}
            <View style={ms.infoBanner}>
              <Text style={ms.infoText}>
                ℹ El inicio y fin de clase se marcan desde la tarjeta de clase.
              </Text>
            </View>
          </ScrollView>

          <View style={ms.footer}>
            <TouchableOpacity
              style={ms.cancelBtn}
              onPress={() => {
                reset();
                onClose();
              }}
              disabled={saving}
            >
              <Text style={ms.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ms.saveBtn, saving && ms.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={ms.saveBtnText}>Crear clase</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  Modal: Tomar Asistencia
// ══════════════════════════════════════════════════════════════════════════════
function AsistenciaModal({
  visible,
  clase,
  estudiantes,
  onClose,
  onSaved,
}: {
  visible: boolean;
  clase: ClaseResponse | null;
  estudiantes: EstudianteResponse[];
  onClose: () => void;
  onSaved: (r: ClaseConAsistenciasResponse) => void;
}) {
  const [map, setMap] = useState<Record<string, AsistenciaEstado>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Inicializar al abrir
  const prevVisible = useRef(false);
  if (visible && !prevVisible.current) {
    const init: Record<string, AsistenciaEstado> = {};
    estudiantes.forEach((e) => {
      init[e.id] = "PRESENTE";
    });
    setMap(init);
    setObs({});
    setError("");
  }
  prevVisible.current = visible;

  const toggleEstado = (id: string) => {
    setMap((prev) => {
      const idx = ESTADO_ORDEN.indexOf(prev[id] ?? "PRESENTE");
      const next = ESTADO_ORDEN[(idx + 1) % ESTADO_ORDEN.length];
      return { ...prev, [id]: next };
    });
  };

  const marcarTodos = (estado: AsistenciaEstado) => {
    const all: Record<string, AsistenciaEstado> = {};
    estudiantes.forEach((e) => {
      all[e.id] = estado;
    });
    setMap(all);
  };

  const handleSave = async () => {
    if (!clase) return;
    setSaving(true);
    setError("");
    try {
      const items: AsistenciaItem[] = estudiantes.map((e) => ({
        estudianteId: e.id,
        estado: map[e.id] ?? "AUSENTE",
        observacion: obs[e.id]?.trim() || undefined,
      }));
      const { data } = await registrarAsistencias({
        claseId: clase.id,
        asistencias: items,
      });
      onSaved(data);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? "No se pudo registrar la asistencia.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!clase) return null;

  const presentes = Object.values(map).filter((v) => v === "PRESENTE").length;
  const tardanzas = Object.values(map).filter((v) => v === "TARDANZA").length;
  const ausentes = Object.values(map).filter((v) => v === "AUSENTE").length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        <View style={[ms.sheet, ms.sheetWide]}>
          {/* Header */}
          <View style={ms.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={ms.sheetTitle}>Tomar asistencia</Text>
              <Text style={ms.sheetSub}>
                {clase.cursoCodigo} · {clase.titulo ?? clase.fecha}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Text style={ms.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Resumen rápido */}
          <View style={ms.asistSummary}>
            {[
              { label: "Presentes", val: presentes, color: C.success },
              { label: "Tardanzas", val: tardanzas, color: C.orange },
              { label: "Ausentes", val: ausentes, color: C.danger },
            ].map((item) => (
              <View key={item.label} style={ms.asistSummaryItem}>
                <Text style={[ms.asistSummaryNum, { color: item.color }]}>
                  {item.val}
                </Text>
                <Text style={ms.asistSummaryLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Acciones masivas */}
          <View style={ms.masiveRow}>
            <Text style={ms.masiveLabel}>Marcar todos:</Text>
            {ESTADO_ORDEN.map((e) => {
              const m = ESTADO_META[e];
              return (
                <TouchableOpacity
                  key={e}
                  style={[
                    ms.masiveBtn,
                    { borderColor: m.color, backgroundColor: m.bg },
                  ]}
                  onPress={() => marcarTodos(e)}
                >
                  <Text style={[ms.masiveBtnText, { color: m.color }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView style={ms.body} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={ms.errorBanner}>
                <Text style={ms.errorText}>✕ {error}</Text>
              </View>
            ) : null}

            {estudiantes.length === 0 ? (
              <Text style={ms.emptyListText}>
                No hay estudiantes matriculados.
              </Text>
            ) : (
              estudiantes.map((e) => {
                const estado = map[e.id] ?? "PRESENTE";
                const meta = ESTADO_META[estado];
                return (
                  <View key={e.id} style={ms.asistRow}>
                    <View
                      style={[
                        ms.asistAvatar,
                        { backgroundColor: meta.bg, borderColor: meta.color },
                      ]}
                    >
                      <Text style={[ms.asistAvatarText, { color: meta.color }]}>
                        {(e.fullName ?? e.email)[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={ms.asistName}>
                        {e.fullName ?? "Sin nombre"}
                      </Text>
                      <Text style={ms.asistEmail}>{e.email}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        ms.estadoBtn,
                        { backgroundColor: meta.bg, borderColor: meta.color },
                      ]}
                      onPress={() => toggleEstado(e.id)}
                    >
                      <Text style={[ms.estadoBtnText, { color: meta.color }]}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={ms.footer}>
            <TouchableOpacity
              style={ms.cancelBtn}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={ms.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ms.saveBtn, saving && ms.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || estudiantes.length === 0}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={ms.saveBtnText}>Guardar asistencia</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  Modal: Ver asistencia de una clase
// ══════════════════════════════════════════════════════════════════════════════
function VerAsistenciaModal({
  visible,
  claseId,
  onClose,
}: {
  visible: boolean;
  claseId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<ClaseConAsistenciasResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const prevId = useRef<string | null>(null);
  if (visible && claseId && claseId !== prevId.current) {
    prevId.current = claseId;
    setLoading(true);
    getAsistenciasByClase(claseId)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }
  if (!visible && prevId.current) {
    prevId.current = null;
    setData(null);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        <View style={[ms.sheet, ms.sheetWide]}>
          <View style={ms.sheetHeader}>
            <Text style={ms.sheetTitle}>Asistencia registrada</Text>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Text style={ms.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={ms.loadingBox}>
              <ActivityIndicator size="large" color={C.navyMd} />
            </View>
          ) : !data ? (
            <View style={ms.loadingBox}>
              <Text style={ms.emptyListText}>No hay datos de asistencia.</Text>
            </View>
          ) : (
            <>
              {/* Resumen */}
              <View style={ms.asistSummary}>
                {[
                  {
                    label: "Presentes",
                    val: data.totalPresentes,
                    color: C.success,
                  },
                  {
                    label: "Tardanzas",
                    val: data.totalTardanzas,
                    color: C.orange,
                  },
                  {
                    label: "Ausentes",
                    val: data.totalAusentes,
                    color: C.danger,
                  },
                  {
                    label: "Justificados",
                    val: data.totalJustificados,
                    color: C.info,
                  },
                ].map((item) => (
                  <View key={item.label} style={ms.asistSummaryItem}>
                    <Text style={[ms.asistSummaryNum, { color: item.color }]}>
                      {item.val}
                    </Text>
                    <Text style={ms.asistSummaryLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <ScrollView style={ms.body} showsVerticalScrollIndicator={false}>
                {data.asistencias.map((a: AsistenciaResponse) => {
                  const meta = ESTADO_META[a.estado];
                  return (
                    <View key={a.id} style={ms.asistRow}>
                      <View
                        style={[
                          ms.asistAvatar,
                          { backgroundColor: meta.bg, borderColor: meta.color },
                        ]}
                      >
                        <Text
                          style={[ms.asistAvatarText, { color: meta.color }]}
                        >
                          {(a.estudiante.fullName ??
                            a.estudiante.email)[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={ms.asistName}>
                          {a.estudiante.fullName ?? "Sin nombre"}
                        </Text>
                        {a.observacion ? (
                          <Text style={ms.asistObs}>{a.observacion}</Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          ms.estadoBtn,
                          { backgroundColor: meta.bg, borderColor: meta.color },
                        ]}
                      >
                        <Text style={[ms.estadoBtnText, { color: meta.color }]}>
                          {meta.label}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={ms.footer}>
            <TouchableOpacity
              style={[ms.saveBtn, { flex: 1 }]}
              onPress={onClose}
            >
              <Text style={ms.saveBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  Modal: Matricular estudiantes
// ══════════════════════════════════════════════════════════════════════════════
function MatricularModal({
  visible,
  cursoId,
  cursoNombre,
  onClose,
  onSaved,
}: {
  visible: boolean;
  cursoId: string;
  cursoNombre: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [todos, setTodos] = useState<any[]>([]);
  const [matriculados, setMatriculados] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [periodo, setPeriodo] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errorPeriodo, setErrorPeriodo] = useState<string | null>(null);

  const prevVisible = useRef(false);
  if (visible && !prevVisible.current && cursoId) {
    setLoading(true);
    setError("");
    setErrorPeriodo(null);
    setSelected(new Set());
    setPeriodo("");
    setSearch("");
    Promise.all([
      getUsers({ role: "ESTUDIANTE", isActive: true, size: 200 }),
      getMatriculasByCurso(cursoId),
    ])
      .then(([usersRes, matRes]) => {
        setTodos(usersRes.data.content);
        setMatriculados(new Set(matRes.data.map((m: any) => m.estudiante.id)));
      })
      .catch(() => setError("No se pudo cargar la lista."))
      .finally(() => setLoading(false));
  }
  prevVisible.current = visible;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleSave = async () => {

    const valError = validarPeriodo(periodo);
    if (valError) {
      setErrorPeriodo(valError);
      return;
    }

    if (selected.size === 0) {
      setError("Selecciona al menos un estudiante.");
      return;
    }
    if (!periodo.trim()) {
      setError("El año/periodo es obligatorio.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await matricularEstudiantes({
        cursoId,
        estudianteIds: Array.from(selected),
        anioPeriodo: periodo.trim(),
      });
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "No se pudo matricular.");
    } finally {
      setSaving(false);
    }
  };

  const filtrados = todos.filter((u) => {
    const q = search.toLowerCase();
    return (
      !matriculados.has(u.id) &&
      ((u.fullName ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q))
    );
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        <View style={[ms.sheet, ms.sheetWide]}>
          <View style={ms.sheetHeader}>
            <View>
              <Text style={ms.sheetTitle}>Matricular estudiantes</Text>
              <Text style={ms.sheetSub}>{cursoNombre}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Text style={ms.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={ms.body} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={ms.errorBanner}>
                <Text style={ms.errorText}>✕ {error}</Text>
              </View>
            ) : null}

            <Text style={ms.sectionLabel}>1. Año / Periodo académico</Text>
            <TextInput
              style={[
                ms.input, 
                { marginBottom: errorPeriodo ? 4 : 16 },
                errorPeriodo ? { borderColor: 'red', borderWidth: 1 } : null
              ]}
              value={periodo}
              onChangeText={(text) => {
                setPeriodo(text.toUpperCase());
                if (errorPeriodo) setErrorPeriodo(null);
              }}
              placeholder="Ej: 2026-I"
              placeholderTextColor={C.muted}
              maxLength={10}
              autoCapitalize="characters"
            />
            {errorPeriodo && (
              <Text style={{ color: 'red', fontSize: 12, marginBottom: 16, marginLeft: 4 }}>
                {errorPeriodo}
              </Text>)}

            <Text style={ms.sectionLabel}>
              2. Selecciona estudiantes{" "}
              {selected.size > 0 && (
                <Text style={{ color: C.navyMd, fontWeight: "800" }}>
                  ({selected.size} seleccionados)
                </Text>
              )}
            </Text>
            <TextInput
              style={[ms.input, { marginBottom: 8 }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar estudiante..."
              placeholderTextColor={C.muted}
            />

            {loading ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator color={C.navyMd} />
              </View>
            ) : (
              <ScrollView style={ms.listBox}>
                {filtrados.length === 0 ? (
                  <Text style={ms.emptyListText}>
                    No hay estudiantes disponibles.
                  </Text>
                ) : (
                  filtrados.map((u) => {
                    const sel = selected.has(u.id);
                    return (
                      <TouchableOpacity
                        key={u.id}
                        style={[ms.listItem, sel && ms.listItemActive]}
                        onPress={() => toggle(u.id)}
                      >
                        <View style={ms.listItemLeft}>
                          <View
                            style={[
                              ms.listAvatar,
                              {
                                backgroundColor: sel
                                  ? "rgba(45,58,130,0.12)"
                                  : "rgba(91,141,238,0.10)",
                                borderColor: sel ? C.navyMd : C.info,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                ms.listAvatarText,
                                { color: sel ? C.navyMd : C.info },
                              ]}
                            >
                              {(
                                (u.fullName ?? u.email)[0] ?? "?"
                              ).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={ms.listItemName}>
                              {u.fullName ?? "Sin nombre"}
                            </Text>
                            <Text style={ms.listItemSub}>{u.email}</Text>
                          </View>
                        </View>
                        <View
                          style={[
                            ms.checkbox,
                            sel && {
                              backgroundColor: C.navyMd,
                              borderColor: C.navyMd,
                            },
                          ]}
                        >
                          {sel && <Text style={ms.checkboxCheck}>✓</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}
          </ScrollView>

          <View style={ms.footer}>
            <TouchableOpacity
              style={ms.cancelBtn}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={ms.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ms.saveBtn, saving && ms.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={ms.saveBtnText}>Matricular</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function Estudiante() {
  const { user } = useAuth();
  const router = useRouter();
  const { show: toast, Toast } = useToast();
  const isAdmin = user?.role === "ADMIN";

  // ── Estado principal ──────────────────────────────────────────────────────
  const [cursos, setCursos] = useState<CursoConEstudiantesResponse[]>([]);
  const [loadingMain, setLoadingMain] = useState(true);
  const [searchCurso, setSearchCurso] = useState("");
  const [cursoActivo, setCursoActivo] =
    useState<CursoConEstudiantesResponse | null>(null);
  const [tab, setTab] = useState<Tab>("estudiantes");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Clases ────────────────────────────────────────────────────────────────
  const [clases, setClases] = useState<ClaseResponse[]>([]);
  const [loadingClases, setLoadingClases] = useState(false);

  // ── Modales ───────────────────────────────────────────────────────────────
  const [showCrearClase, setShowCrearClase] = useState(false);
  const [showAsistencia, setShowAsistencia] = useState(false);
  const [showVerAsistencia, setShowVerAsistencia] = useState(false);
  const [showMatricular, setShowMatricular] = useState(false);
  const [claseSeleccionada, setClaseSeleccionada] =
    useState<ClaseResponse | null>(null);
  const [claseIdVer, setClaseIdVer] = useState<string | null>(null);

  // ── Detección móvil ───────────────────────────────────────────────────────
  const { width } = useWindowDimensions();
  const isMobile = width < 768; // Punto de quiebre para considerar pantalla móvil
  const [showSidebarMobile, setShowSidebarMobile] = useState(true);

  // loadCursos → para refresh manual (matrícula, remover)
  const loadCursos = useCallback(async () => {
    setLoadingMain(true);
    try {
      const { data } = await getCursosConEstudiantes();
      setCursos(data);
      setCursoActivo((prev) =>
        prev
          ? (data.find((c) => c.cursoId === prev.cursoId) ?? data[0] ?? null)
          : (data[0] ?? null),
      );
    } catch {
      toast("No se pudieron cargar los cursos.", "error");
    } finally {
      setLoadingMain(false);
    }
  }, []);

  // ── Carga de clases del curso activo ──────────────────────────────────────
  const loadClases = useCallback(async (cursoId: string) => {
    setLoadingClases(true);
    try {
      const { data } = await getClasesByCurso(cursoId);
      setClases(data);
    } catch {
      toast("No se pudieron cargar las clases.", "error");
    } finally {
      setLoadingClases(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoadingMain(true);
      getCursosConEstudiantes()
        .then(({ data }) => {
          if (!activo) return;
          setCursos(data);
          setCursoActivo((prev) =>
            prev
              ? (data.find((c) => c.cursoId === prev.cursoId) ??
                data[0] ??
                null)
              : (data[0] ?? null),
          );
        })
        .catch(() => {
          if (activo) toast("No se pudieron cargar los cursos.", "error");
        })
        .finally(() => {
          if (activo) setLoadingMain(false);
        });

      return () => {
        activo = false;
      };
    }, []),
  );

  // Al cambiar curso activo → cargar sus clases
  const seleccionarCurso = (curso: CursoConEstudiantesResponse) => {
    setCursoActivo(curso);
    setTab("estudiantes");
    loadClases(curso.cursoId);

    // Si estamos en móvil, ocultamos la lista de cursos para ver el detalle
    if (isMobile) {
      setShowSidebarMobile(false);
    }
  };

  // ── Acción: Iniciar clase ────────────────────────────────────────────────
  const handleMarcarInicio = async (clase: ClaseResponse) => {
    setActionLoading(`inicio-${clase.id}`);
    try {
      const { data } = await marcarInicio(clase.id);
      setClases((prev) => prev.map((c) => (c.id === clase.id ? data : c)));
      toast("Clase iniciada — hora de inicio registrada ✓");
    } catch (e: any) {
      toast(
        e?.response?.data?.message ?? "No se pudo marcar el inicio.",
        "error",
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ── Acción: Finalizar clase ──────────────────────────────────────────────
  const handleMarcarFin = async (clase: ClaseResponse) => {
    const ok =
      Platform.OS === "web"
        ? window.confirm(
            `¿Finalizar la clase "${clase.titulo ?? clase.fecha}"?`,
          )
        : await new Promise<boolean>((resolve) =>
            Alert.alert("¿Finalizar clase?", `Se registrará la hora de fin.`, [
              {
                text: "Cancelar",
                style: "cancel",
                onPress: () => resolve(false),
              },
              { text: "Finalizar", onPress: () => resolve(true) },
            ]),
          );
    if (!ok) return;
    setActionLoading(`fin-${clase.id}`);
    try {
      const { data } = await marcarFin(clase.id);
      setClases((prev) => prev.map((c) => (c.id === clase.id ? data : c)));
      toast(`Clase finalizada — ${data.horasDictadas}h dictadas ✓`);
    } catch (e: any) {
      toast(e?.response?.data?.message ?? "No se pudo marcar el fin.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Acción: Remover matrícula ─────────────────────────────────────────────
  const handleRemoverMatricula = async (
    matriculaId: string,
    nombre: string,
  ) => {
    const ok =
      Platform.OS === "web"
        ? window.confirm(`¿Remover a ${nombre} de este curso?`)
        : await new Promise<boolean>((resolve) =>
            Alert.alert(
              "¿Remover matrícula?",
              `${nombre} ya no estará matriculado.`,
              [
                {
                  text: "Cancelar",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "Remover",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ],
            ),
          );
    if (!ok) return;
    try {
      await removerMatricula(matriculaId);
      await loadCursos();
      toast("Matrícula removida correctamente");
    } catch (e: any) {
      toast(
        e?.response?.data?.message ?? "No se pudo remover la matrícula.",
        "error",
      );
    }
  };

  // ── Helpers de formato ───────────────────────────────────────────────────
  const fmtHora = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const fmtFecha = (str: string) => {
    const [y, m, d] = str.split("-");
    const months = [
      "ene",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
      "jul",
      "ago",
      "sep",
      "oct",
      "nov",
      "dic",
    ];
    return `${d} ${months[parseInt(m) - 1]} ${y}`;
  };

  // ── Cursos filtrados ──────────────────────────────────────────────────────
  const cursosFiltrados = cursos.filter(
    (c) =>
      c.cursoNombre.toLowerCase().includes(searchCurso.toLowerCase()) ||
      c.cursoCodigo.toLowerCase().includes(searchCurso.toLowerCase()),
  );

  // ── Render tarjeta de clase ──────────────────────────────────────────────
  const renderClaseCard = (clase: ClaseResponse) => {
    const esInicio = actionLoading === `inicio-${clase.id}`;
    const esFin = actionLoading === `fin-${clase.id}`;
    const anyLoad = esInicio || esFin;

    const estadoColor =
      clase.estado === "FINALIZADA"
        ? C.success
        : clase.estado === "EN_CURSO"
          ? C.orange
          : C.muted;
    const estadoBg =
      clase.estado === "FINALIZADA"
        ? "rgba(58,181,160,0.10)"
        : clase.estado === "EN_CURSO"
          ? "rgba(232,160,32,0.10)"
          : "rgba(144,153,187,0.10)";
    const estadoLabel =
      clase.estado === "FINALIZADA"
        ? "Finalizada"
        : clase.estado === "EN_CURSO"
          ? "En curso"
          : "Sin iniciar";

    return (
      <View key={clase.id} style={s.card}>
        {/* Cabecera de tarjeta */}
        <View style={s.claseCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.claseTitle} numberOfLines={1}>
              {clase.titulo ?? `Clase del ${fmtFecha(clase.fecha)}`}
            </Text>
            <Text style={s.claseFecha}>{fmtFecha(clase.fecha)}</Text>
          </View>
          <View
            style={[
              s.estadoPill,
              { backgroundColor: estadoBg, borderColor: estadoColor },
            ]}
          >
            <View style={[s.dot, { backgroundColor: estadoColor }]} />
            <Text style={[s.estadoPillText, { color: estadoColor }]}>
              {estadoLabel}
            </Text>
          </View>
        </View>

        {/* Horas */}
        <View style={s.claseHorasRow}>
          <View style={s.horaBox}>
            <Text style={s.horaLabel}>Inicio</Text>
            <Text
              style={[
                s.horaValor,
                { color: clase.horaInicio ? C.success : C.muted },
              ]}
            >
              {fmtHora(clase.horaInicio)}
            </Text>
          </View>
          <View style={s.horaSep}>
            <Text style={s.horaSepText}>→</Text>
          </View>
          <View style={s.horaBox}>
            <Text style={s.horaLabel}>Fin</Text>
            <Text
              style={[
                s.horaValor,
                { color: clase.horaFin ? C.success : C.muted },
              ]}
            >
              {fmtHora(clase.horaFin)}
            </Text>
          </View>
          {clase.estado !== "SIN_INICIAR" && (
            <View style={s.horasBox}>
              <Text style={s.horasValor}>{clase.horasDictadas}h</Text>
              <Text style={s.horasLabel}>dictadas</Text>
            </View>
          )}
        </View>

        {/* Acciones */}
        <View style={s.actionsRow}>
          {clase.estado === "SIN_INICIAR" && (
            <TouchableOpacity
              style={[s.btn, s.btnSuccess, anyLoad && s.btnDisabled]}
              disabled={anyLoad}
              onPress={() => handleMarcarInicio(clase)}
            >
              {esInicio ? (
                <ActivityIndicator size="small" color={C.success} />
              ) : (
                <Text style={s.btnSuccessText}>▶ Iniciar clase</Text>
              )}
            </TouchableOpacity>
          )}
          {clase.estado === "EN_CURSO" && (
            <TouchableOpacity
              style={[s.btn, s.btnWarn, anyLoad && s.btnDisabled]}
              disabled={anyLoad}
              onPress={() => handleMarcarFin(clase)}
            >
              {esFin ? (
                <ActivityIndicator size="small" color={C.danger} />
              ) : (
                <Text style={s.btnWarnText}>⬛ Finalizar clase</Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.btn, s.btnPrimary, anyLoad && s.btnDisabled]}
            disabled={anyLoad}
            onPress={() => {
              setClaseSeleccionada(clase);
              setShowAsistencia(true);
            }}
          >
            <Text style={s.btnPrimaryText}>📋 Asistencia</Text>
          </TouchableOpacity>
          {clase.estado === "FINALIZADA" && (
            <TouchableOpacity
              style={[s.btn, s.btnInfo, anyLoad && s.btnDisabled]}
              disabled={anyLoad}
              onPress={() => {
                setClaseIdVer(clase.id);
                setShowVerAsistencia(true);
              }}
            >
              <Text style={s.btnInfoText}>👁 Ver registro</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ── UI principal ────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <Toast />

      {/* ── Modales ─────────────────────────────────────────────── */}
      {cursoActivo && (
        <>
          <CrearClaseModal
            visible={showCrearClase}
            cursoId={cursoActivo.cursoId}
            cursoNombre={cursoActivo.cursoNombre}
            anioPeriodo={cursoActivo.anioPeriodo}
            onClose={() => setShowCrearClase(false)}
            onSaved={(clase) => {
              setClases((prev) => [clase, ...prev]);
              setShowCrearClase(false);
              toast("Clase creada correctamente ✓");
            }}
          />
          <MatricularModal
            visible={showMatricular}
            cursoId={cursoActivo.cursoId}
            cursoNombre={cursoActivo.cursoNombre}
            onClose={() => setShowMatricular(false)}
            onSaved={() => {
              setShowMatricular(false);
              loadCursos();
              toast("Estudiantes matriculados correctamente ✓");
            }}
          />
        </>
      )}
      <AsistenciaModal
        visible={showAsistencia}
        clase={claseSeleccionada}
        estudiantes={cursoActivo?.estudiantes ?? []}
        onClose={() => setShowAsistencia(false)}
        onSaved={(result) => {
          setShowAsistencia(false);
          setClases((prev) =>
            prev.map((c) => (c.id === result.clase.id ? result.clase : c)),
          );
          toast(`Asistencia guardada — ${result.totalPresentes} presentes ✓`);
        }}
      />
      <VerAsistenciaModal
        visible={showVerAsistencia}
        claseId={claseIdVer}
        onClose={() => setShowVerAsistencia(false)}
      />

      {/* ── Layout principal ─────────────────────────────────────── */}
      <View style={s.layout}>
        {/* ══ COLUMNA IZQUIERDA: lista de cursos ══ */}
        {(!isMobile || showSidebarMobile) && (
          <View
            style={[
              s.sidebar,
              isMobile && { width: "100%", borderRightWidth: 0 },
            ]}
          >
            {/* Header sidebar */}
            <View style={s.sidebarHeader}>
              <Text style={s.sidebarTitle}>Mis Cursos</Text>
              <Text style={s.sidebarSub}>
                {cursos.length} curso{cursos.length !== 1 ? "s" : ""}
              </Text>
            </View>

            {/* Búsqueda */}
            <View style={s.sidebarSearch}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchInput}
                value={searchCurso}
                onChangeText={setSearchCurso}
                placeholder="Buscar curso..."
                placeholderTextColor={C.muted}
              />
              {searchCurso.length > 0 && (
                <Pressable onPress={() => setSearchCurso("")}>
                  <Text style={s.clearIcon}>✕</Text>
                </Pressable>
              )}
            </View>

            {/* Lista de cursos */}
            {loadingMain ? (
              <View style={s.centerBox}>
                <ActivityIndicator color={C.navyMd} />
              </View>
            ) : cursosFiltrados.length === 0 ? (
              <View style={s.centerBox}>
                <Text style={s.emptyIcon}>📚</Text>
                <Text style={s.emptySub}>No hay cursos</Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
              >
                {cursosFiltrados.map((curso) => {
                  const activo = cursoActivo?.cursoId === curso.cursoId;
                  return (
                    <TouchableOpacity
                      key={curso.cursoId}
                      style={[s.cursoItem, activo && s.cursoItemActive]}
                      onPress={() => seleccionarCurso(curso)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          s.cursoItemIcon,
                          {
                            backgroundColor: activo
                              ? "rgba(45,58,130,0.15)"
                              : "rgba(124,92,191,0.10)",
                            borderColor: activo ? C.navyMd : C.purple,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.cursoItemIconText,
                            { color: activo ? C.navyMd : C.purple },
                          ]}
                        >
                          {curso.cursoCodigo.slice(0, 3)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            s.cursoItemName,
                            activo && { color: C.navyMd },
                          ]}
                          numberOfLines={1}
                        >
                          {curso.cursoNombre}
                        </Text>
                        <Text style={s.cursoItemMeta}>
                          {curso.totalEstudiantes} estudiante
                          {curso.totalEstudiantes !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      {activo && !isMobile && <View style={s.activeDot} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* ══ COLUMNA DERECHA: detalle del curso ══ */}
        {(!isMobile || !showSidebarMobile) && (
          <View style={s.main}>
            {!cursoActivo ? (
              <View style={s.centerBox}>
                {isMobile && (
                  <TouchableOpacity
                    style={[
                      s.btn,
                      s.btnPrimary,
                      { position: "absolute", top: 20, left: 20 },
                    ]}
                    onPress={() => setShowSidebarMobile(true)}
                  >
                    <Text style={s.btnPrimaryText}>☰ Ver Mis Cursos</Text>
                  </TouchableOpacity>
                )}
                <Text style={s.emptyIcon}>👈</Text>
                <Text style={s.emptyTitle}>Selecciona un curso</Text>
                <Text style={s.emptySub}>
                  para ver sus estudiantes y clases
                </Text>
              </View>
            ) : (
              <>
                {/* Header del curso activo */}
                <View style={s.cursoHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={s.cursoHeaderTop}>
                      {/* BOTÓN MÓVIL PARA REGRESAR A LA LISTA */}
                      {isMobile && (
                        <TouchableOpacity
                          style={s.mobileMenuBtn}
                          onPress={() => setShowSidebarMobile(true)}
                        >
                          <Text style={s.mobileMenuBtnText}>☰ Cursos</Text>
                        </TouchableOpacity>
                      )}

                      <View style={s.cursoBadge}>
                        <Text style={s.cursoBadgeText}>
                          {cursoActivo.cursoCodigo}
                        </Text>
                      </View>
                      <Text style={s.cursoHeaderName} numberOfLines={1}>
                        {cursoActivo.cursoNombre}
                      </Text>
                    </View>
                    <View style={s.cursoMeta}>
                      {cursoActivo.docenteNombre && (
                        <Text style={s.cursoMetaItem}>
                          👨‍🏫 {cursoActivo.docenteNombre}
                        </Text>
                      )}
                      <Text style={s.cursoMetaItem}>
                        📅 {cursoActivo.anioPeriodo}
                      </Text>
                      <Text style={s.cursoMetaItem}>
                        👤 {cursoActivo.totalEstudiantes} matriculados
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Tabs */}
                <View style={s.tabsRow}>
                  {(
                    [
                      ["estudiantes", "👥 Estudiantes"],
                      ["clases", "📅 Clases"],
                    ] as const
                  ).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[s.tab, tab === key && s.tabActive]}
                      onPress={() => {
                        setTab(key as typeof tab); // <--- OJO: Asegúrate de que TS entienda el tipo aquí si falla
                        if (key === "clases" && cursoActivo)
                          loadClases(cursoActivo.cursoId);
                      }}
                    >
                      <Text style={[s.tabText, tab === key && s.tabTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {/* Botones de acción contextuales */}
                  <View style={{ flex: 1 }} />
                  {tab === "estudiantes" && isAdmin && (
                    <TouchableOpacity
                      style={s.actionBtn}
                      onPress={() => setShowMatricular(true)}
                    >
                      <Text style={s.actionBtnText}>+ Matricular</Text>
                    </TouchableOpacity>
                  )}
                  {tab === "clases" && (
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: C.success }]}
                      onPress={() => setShowCrearClase(true)}
                    >
                      <Text style={s.actionBtnText}>+ Nueva clase</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* ── TAB: ESTUDIANTES ── */}
                {tab === "estudiantes" && (
                  <ScrollView
                    style={s.list}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {cursoActivo.estudiantes.length === 0 ? (
                      <View style={s.centerBox}>
                        <Text style={s.emptyIcon}>👥</Text>
                        <Text style={s.emptyTitle}>Sin estudiantes</Text>
                        <Text style={s.emptySub}>
                          {isAdmin
                            ? "Usa '+ Matricular' para agregar estudiantes."
                            : "No hay estudiantes matriculados aún."}
                        </Text>
                      </View>
                    ) : (
                      cursoActivo.estudiantes.map((est, idx) => (
                        <View key={est.id} style={s.card}>
                          <View style={s.cardRow}>
                            <View
                              style={[
                                s.avatar,
                                {
                                  backgroundColor: "rgba(91,141,238,0.10)",
                                  borderColor: C.info,
                                },
                              ]}
                            >
                              <Text style={[s.avatarText, { color: C.info }]}>
                                {(est.fullName ?? est.email)[0].toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={s.cardName}>
                                {est.fullName ?? "Sin nombre"}
                              </Text>
                              <Text style={s.cardEmail}>{est.email}</Text>
                              <Text style={s.cardUsername}>
                                @{est.username}
                              </Text>
                            </View>
                            <View style={[s.numBadge]}>
                              <Text style={s.numBadgeText}>#{idx + 1}</Text>
                            </View>
                          </View>
                          <View style={s.statusRow}>
                            <View
                              style={[
                                s.pill,
                                est.active
                                  ? {
                                      backgroundColor: "rgba(58,181,160,0.12)",
                                      borderColor: C.success,
                                    }
                                  : {
                                      backgroundColor: "rgba(224,82,82,0.12)",
                                      borderColor: C.danger,
                                    },
                              ]}
                            >
                              <View
                                style={[
                                  s.dot,
                                  {
                                    backgroundColor: est.active
                                      ? C.success
                                      : C.danger,
                                  },
                                ]}
                              />
                              <Text
                                style={[
                                  s.pillText,
                                  { color: est.active ? C.success : C.danger },
                                ]}
                              >
                                {est.active ? "Activo" : "Inactivo"}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </ScrollView>
                )}

                {/* ── TAB: CLASES ── */}
                {tab === "clases" &&
                  (loadingClases ? (
                    <View style={s.centerBox}>
                      <ActivityIndicator size="large" color={C.navyMd} />
                    </View>
                  ) : clases.length === 0 ? (
                    <View style={s.centerBox}>
                      <Text style={s.emptyIcon}>📅</Text>
                      <Text style={s.emptyTitle}>Sin clases registradas</Text>
                      <Text style={s.emptySub}>
                        Crea la primera clase con "+ Nueva clase".
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={s.list}
                      contentContainerStyle={s.listContent}
                      showsVerticalScrollIndicator={false}
                    >
                      {clases.map(renderClaseCard)}
                    </ScrollView>
                  ))}
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  layout: { flex: 1, flexDirection: "row" },

  // ── Sidebar izquierdo ────────────────────────────────────────────
  sidebar: {
    width: 260,
    backgroundColor: C.white,
    borderRightWidth: 1,
    borderRightColor: C.border,
    ...Platform.select({
      ios: {
        shadowColor: C.navy,
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      web: { boxShadow: "2px 0 12px rgba(27,34,87,0.07)" } as any,
    }),
  },
  sidebarHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sidebarTitle: { fontSize: 16, fontWeight: "800", color: C.navy },
  sidebarSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  sidebarSearch: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginVertical: 10,
    backgroundColor: "#f6f7fb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: { fontSize: 12, marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: C.navy,
    ...Platform.select({ web: { outlineStyle: "none" } as any }),
  },
  clearIcon: { fontSize: 12, color: C.muted, padding: 2 },

  // ── Items de curso en sidebar ────────────────────────────────────
  cursoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginHorizontal: 6,
    marginVertical: 2,
    borderRadius: 10,
  },
  cursoItemActive: { backgroundColor: "rgba(45,58,130,0.06)" },
  cursoItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cursoItemIconText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  cursoItemName: { fontSize: 13, fontWeight: "600", color: C.navy },
  cursoItemMeta: { fontSize: 11, color: C.muted, marginTop: 1 },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.navyMd,
  },

  // ── Panel principal ──────────────────────────────────────────────
  main: { flex: 1, backgroundColor: C.bg },

  // ── Header del curso seleccionado ────────────────────────────────
  cursoHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    ...Platform.select({
      web: { boxShadow: "0 2px 8px rgba(27,34,87,0.06)" } as any,
    }),
  },
  cursoHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cursoBadge: {
    backgroundColor: "rgba(124,92,191,0.10)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.purple,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cursoBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.purple,
    letterSpacing: 0.5,
  },
  cursoHeaderName: {
    fontSize: 17,
    fontWeight: "800",
    color: C.navy,
    flexShrink: 1,
  },
  cursoMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 6 },
  cursoMetaItem: { fontSize: 12, color: C.sub, fontWeight: "500" },

  // ── Tabs ─────────────────────────────────────────────────────────
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabActive: { backgroundColor: C.navyMd, borderColor: C.navyMd },
  tabText: { fontSize: 13, fontWeight: "600", color: C.sub },
  tabTextActive: { color: "#fff" },
  actionBtn: {
    backgroundColor: C.navyMd,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  actionBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // ── Lista / contenido ────────────────────────────────────────────
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },

  // ── Card compartida ──────────────────────────────────────────────
  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      web: { boxShadow: "0 2px 12px rgba(27,34,87,0.08)" } as any,
    }),
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  avatarText: { fontWeight: "800", fontSize: 15 },
  cardName: { fontSize: 14, fontWeight: "700", color: C.navy },
  cardEmail: { fontSize: 12, color: C.sub },
  cardUsername: { fontSize: 11, color: C.muted },
  numBadge: {
    backgroundColor: "#f0f2f8",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  numBadgeText: { fontSize: 11, fontWeight: "700", color: C.sub },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: "700" },

  // ── Tarjeta de clase ─────────────────────────────────────────────
  claseCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  claseTitle: { fontSize: 14, fontWeight: "700", color: C.navy },
  claseFecha: { fontSize: 11.5, color: C.muted, marginTop: 2 },
  estadoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  estadoPillText: { fontSize: 11, fontWeight: "700" },
  claseHorasRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  horaBox: { alignItems: "center", flex: 1 },
  horaLabel: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  horaValor: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  horaSep: { alignItems: "center" },
  horaSepText: { fontSize: 18, color: C.muted },
  horasBox: { alignItems: "center", paddingHorizontal: 12 },
  horasValor: { fontSize: 20, fontWeight: "800", color: C.navyMd },
  horasLabel: { fontSize: 10, color: C.muted, fontWeight: "600" },

  // ── Botones ──────────────────────────────────────────────────────
  actionsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  btn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.45 },
  btnPrimary: {
    backgroundColor: "rgba(45,58,130,0.08)",
    borderColor: C.navyMd,
  },
  btnPrimaryText: { fontSize: 12, fontWeight: "700", color: C.navyMd },
  btnWarn: { backgroundColor: "rgba(224,82,82,0.08)", borderColor: C.danger },
  btnWarnText: { fontSize: 12, fontWeight: "700", color: C.danger },
  btnSuccess: {
    backgroundColor: "rgba(58,181,160,0.08)",
    borderColor: C.success,
  },
  btnSuccessText: { fontSize: 12, fontWeight: "700", color: C.success },
  btnInfo: { backgroundColor: "rgba(91,141,238,0.08)", borderColor: C.info },
  btnInfoText: { fontSize: 12, fontWeight: "700", color: C.info },

  // ── Estado vacío ─────────────────────────────────────────────────
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  emptyIcon: { fontSize: 42, marginBottom: 10 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.navy,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  // ── Toast ────────────────────────────────────────────────────────
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
  mobileMenuBtn: {
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(45,58,130,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2d3a82",
  },
  mobileMenuBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2d3a82",
  },
});

// ── Estilos de modales ────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,15,40,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
      web: { boxShadow: "0 8px 40px rgba(0,0,0,0.18)" } as any,
    }),
  },
  sheetWide: { maxWidth: 580 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e8f4",
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: "#1b2257" },
  sheetSub: { fontSize: 12, color: "#9099bb", marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f2f8",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 12, color: "#7b85b0", fontWeight: "700" },
  body: { padding: 20, flexGrow: 1 },
  loadingBox: { height: 160, alignItems: "center", justifyContent: "center" },

  errorBanner: {
    backgroundColor: "rgba(224,82,82,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e05252",
    padding: 12,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, color: "#e05252", fontWeight: "600" },

  infoBanner: {
    backgroundColor: "rgba(91,141,238,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#5b8dee",
    padding: 12,
    marginTop: 4,
  },
  infoText: { fontSize: 12, color: "#5b8dee", fontWeight: "500" },

  field: { gap: 6, marginBottom: 14 },
  label: { fontSize: 12.5, fontWeight: "600", color: "#7b85b0" },
  input: {
    backgroundColor: "#f6f7fb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e4e8f4",
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#1b2257",
    ...Platform.select({ web: { outlineStyle: "none" } as any }),
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1b2257",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Resumen asistencia
  asistSummary: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e8f4",
    paddingVertical: 12,
  },
  asistSummaryItem: { flex: 1, alignItems: "center" },
  asistSummaryNum: { fontSize: 22, fontWeight: "800" },
  asistSummaryLabel: {
    fontSize: 10,
    color: "#9099bb",
    fontWeight: "600",
    marginTop: 2,
  },

  // Acciones masivas
  masiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e8f4",
    flexWrap: "wrap",
  },
  masiveLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7b85b0",
    marginRight: 4,
  },
  masiveBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  masiveBtnText: { fontSize: 11, fontWeight: "700" },

  // Fila de asistencia por estudiante
  asistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f8",
  },
  asistAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  asistAvatarText: { fontWeight: "800", fontSize: 13 },
  asistName: { fontSize: 13, fontWeight: "700", color: "#1b2257" },
  asistEmail: { fontSize: 11.5, color: "#9099bb" },
  asistObs: { fontSize: 11.5, color: "#9099bb", fontStyle: "italic" },
  estadoBtn: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 88,
    alignItems: "center",
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  estadoBtnText: { fontSize: 11, fontWeight: "800" },

  // Lista box
  listBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4e8f4",
    overflow: "hidden",
    marginBottom: 4,
    maxHeight: 140,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e8f4",
    backgroundColor: "#fff",
  },
  listItemActive: { backgroundColor: "rgba(45,58,130,0.04)" },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  listAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  listAvatarText: { fontWeight: "800", fontSize: 13 },
  listItemName: { fontSize: 13, fontWeight: "700", color: "#1b2257" },
  listItemSub: { fontSize: 11.5, color: "#9099bb" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#e4e8f4",
    backgroundColor: "#f6f7fb",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCheck: { fontSize: 12, color: "#fff", fontWeight: "800" },
  emptyListText: {
    padding: 16,
    textAlign: "center",
    color: "#9099bb",
    fontSize: 13,
  },

  // Footer
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e4e8f4",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#f0f2f8",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e4e8f4",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: "#7b85b0" },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#2d3a82",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#1b2257",
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

  mobileMenuBtn: {
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(45,58,130,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2d3a82", // o C.navyMd
  },
  mobileMenuBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2d3a82", // o C.navyMd
  },
});
