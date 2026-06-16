// ── app/(dashboard)/cursos.tsx ────────────────────────────────────────────────

import { useFocusEffect, useRouter } from "expo-router"; // useRouter ya debería estar
import { useCallback, useEffect, useRef, useState } from "react";
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
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import {
  asignarCursos,
  createCurso,
  CursoResponse,
  deleteCurso,
  DocenteConCursosResponse,
  getCursos,
  getDocentesConCursos,
  removerAsignacion,
  setCursoActive,
  updateCurso,
} from "../../services/cursoApi";
import { getUsers, UserResponse } from "../../services/userApi";
import { validarPeriodo } from "../../utils/validators";

// ── Paleta idéntica al resto del proyecto ─────────────────────────────────────
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
};

// ── Tabs del módulo ───────────────────────────────────────────────────────────
type Tab = "cursos" | "asignaciones";

// ── Hook Toast (idéntico al resto del proyecto) ────────────────────────────────
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

// ── Modal de Crear / Editar Curso ─────────────────────────────────────────────
function CursoFormModal({
  visible,
  curso,
  onClose,
  onSaved,
}: {
  visible: boolean;
  curso: CursoResponse | null;
  onClose: () => void;
  onSaved: (c: CursoResponse) => void;
}) {
  const [codigo, setCodigo] = useState(curso?.codigo ?? "");
  const [nombre, setNombre] = useState(curso?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(curso?.descripcion ?? "");
  const [creditos, setCreditos] = useState(String(curso?.creditos ?? "0"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Sincronizar cuando cambia el curso editado
  const prevCurso = useRef<CursoResponse | null>(null);
  if (prevCurso.current !== curso) {
    prevCurso.current = curso;
    setCodigo(curso?.codigo ?? "");
    setNombre(curso?.nombre ?? "");
    setDescripcion(curso?.descripcion ?? "");
    setCreditos(String(curso?.creditos ?? "0"));
    setError("");
  }

  const handleSave = async () => {
    if (!codigo.trim() || !nombre.trim()) {
      setError("El código y el nombre son obligatorios.");
      return;
    }
    const cred = parseInt(creditos, 10);
    if (isNaN(cred) || cred < 0 || cred > 20) {
      setError("Los créditos deben estar entre 0 y 20.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        creditos: cred,
      };
      const { data } = curso
        ? await updateCurso(curso.id, payload)
        : await createCurso(payload);
      onSaved(data);
      setCodigo("");
      setNombre("");
      setDescripcion("");
      setCreditos("0");
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo guardar el curso.");
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
            <Text style={ms.sheetTitle}>
              {curso ? "Editar curso" : "Nuevo curso"}
            </Text>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Text style={ms.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={ms.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {error ? (
              <View style={ms.errorBanner}>
                <Text style={ms.errorText}>✕ {error}</Text>
              </View>
            ) : null}

            <View style={ms.field}>
              <Text style={ms.label}>Código *</Text>
              <TextInput
                style={ms.input}
                value={codigo}
                onChangeText={(t) => setCodigo(t.toUpperCase())}
                placeholder="Ej: BIB-101"
                placeholderTextColor={C.muted}
                autoCapitalize="characters"
                maxLength={20}
              />
            </View>

            <View style={ms.field}>
              <Text style={ms.label}>Nombre *</Text>
              <TextInput
                style={ms.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre del curso"
                placeholderTextColor={C.muted}
                maxLength={150}
              />
            </View>

            <View style={ms.field}>
              <Text style={ms.label}>Descripción</Text>
              <TextInput
                style={[ms.input, ms.inputMultiline]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Descripción opcional..."
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={ms.field}>
              <Text style={ms.label}>Créditos (0 – 20)</Text>
              <TextInput
                style={ms.input}
                value={creditos}
                onChangeText={setCreditos}
                placeholder="0"
                placeholderTextColor={C.muted}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
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
                <Text style={ms.saveBtnText}>
                  {curso ? "Guardar cambios" : "Crear curso"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Modal de Asignar Cursos a Docente ─────────────────────────────────────────
function AsignacionModal({
  visible,
  docentes,
  cursos,
  onClose,
  onSaved,
}: {
  visible: boolean;
  docentes: UserResponse[];
  cursos: CursoResponse[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [docenteId, setDocenteId] = useState<string | null>(null);
  const [selectedCursos, setSelectedCursos] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [docenteSearch, setDocenteSearch] = useState("");
  const [cursoSearch, setCursoSearch] = useState("");
  const [anioPeriodo, setAnioPeriodo] = useState("");
  const [anioPeriodoError, setAnioPeriodoError] = useState<string | null>(null);

  const resetForm = () => {
    setDocenteId(null);
    setSelectedCursos(new Set());
    setError("");
    setDocenteSearch("");
    setCursoSearch("");
    setAnioPeriodo("");
    setAnioPeriodoError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleCurso = (id: string) => {
    setSelectedCursos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!docenteId) {
      setError("Selecciona un docente.");
      return;
    }
    if (selectedCursos.size === 0) {
      setError("Selecciona al menos un curso.");
      return;
    }
    // ← reemplaza la validación simple del periodo con esta
    const errorPeriodo = validarPeriodo(anioPeriodo.trim());
    if (errorPeriodo) {
      setAnioPeriodoError(errorPeriodo);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await asignarCursos({
        docenteId,
        cursoIds: Array.from(selectedCursos),
        anioPeriodo: anioPeriodo.trim(),
      });
      onSaved();
      handleClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? "No se pudo realizar la asignación.",
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredDocentes = docentes.filter(
    (d) =>
      (d.fullName ?? d.email)
        .toLowerCase()
        .includes(docenteSearch.toLowerCase()) ||
      d.email.toLowerCase().includes(docenteSearch.toLowerCase()),
  );

  const filteredCursos = cursos.filter(
    (c) =>
      c.active &&
      (c.nombre.toLowerCase().includes(cursoSearch.toLowerCase()) ||
        c.codigo.toLowerCase().includes(cursoSearch.toLowerCase())),
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={ms.overlay}>
        <View style={[ms.sheet, ms.sheetWide]}>
          <View style={ms.sheetHeader}>
            <Text style={ms.sheetTitle}>Asignar cursos a docente</Text>
            <TouchableOpacity onPress={handleClose} style={ms.closeBtn}>
              <Text style={ms.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={ms.body} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={ms.errorBanner}>
                <Text style={ms.errorText}>✕ {error}</Text>
              </View>
            ) : null}

            {/* LO MOVEMOS AQUÍ ARRIBA: Paso 1 */}
            {/* Paso 1 */}
            <Text style={ms.sectionLabel}>1. Año / Periodo académico</Text>
            <TextInput
              style={[
                ms.input,
                { marginBottom: anioPeriodoError ? 4 : 16 },
                anioPeriodoError ? { borderColor: C.danger } : null,
              ]}
              value={anioPeriodo}
              onChangeText={(v) => {
                setAnioPeriodo(v);
                setAnioPeriodoError(validarPeriodo(v));
              }}
              placeholder="Ej: 2026-I"
              placeholderTextColor={C.muted}
              maxLength={10}
              autoCapitalize="characters"
            />
            {anioPeriodoError && (
              <Text style={{ color: C.danger, fontSize: 12, marginBottom: 16 }}>
                ⚠ {anioPeriodoError}
              </Text>
            )}

            {/* Selección de docente */}
            <Text style={ms.sectionLabel}>2. Selecciona el docente</Text>
            <TextInput
              style={[ms.input, { marginBottom: 8 }]}
              value={docenteSearch}
              onChangeText={setDocenteSearch}
              placeholder="Buscar docente..."
              placeholderTextColor={C.muted}
            />
            <ScrollView
              style={ms.listBox}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {filteredDocentes.length === 0 ? (
                <Text style={ms.emptyListText}>
                  No hay docentes disponibles
                </Text>
              ) : (
                filteredDocentes.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      ms.listItem,
                      docenteId === d.id && ms.listItemActive,
                    ]}
                    onPress={() => setDocenteId(d.id)}
                  >
                    <View style={ms.listItemLeft}>
                      <View
                        style={[
                          ms.listAvatar,
                          {
                            backgroundColor:
                              docenteId === d.id
                                ? "rgba(45,58,130,0.15)"
                                : "rgba(58,181,160,0.12)",
                            borderColor:
                              docenteId === d.id ? C.navyMd : C.success,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            ms.listAvatarText,
                            {
                              color: docenteId === d.id ? C.navyMd : C.success,
                            },
                          ]}
                        >
                          {((d.fullName ?? d.email)[0] ?? "?").toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={ms.listItemName}>
                          {d.fullName ?? "Sin nombre"}
                        </Text>
                        <Text style={ms.listItemSub}>{d.email}</Text>
                      </View>
                    </View>
                    {docenteId === d.id && (
                      <Text style={[ms.checkIcon, { color: C.navyMd }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Selección de cursos */}
            <Text style={[ms.sectionLabel, { marginTop: 16 }]}>
              3. Selecciona los cursos{" "}
              {selectedCursos.size > 0 && (
                <Text style={ms.selectedCount}>
                  ({selectedCursos.size} seleccionados)
                </Text>
              )}
            </Text>
            <TextInput
              style={[ms.input, { marginBottom: 8 }]}
              value={cursoSearch}
              onChangeText={setCursoSearch}
              placeholder="Buscar curso..."
              placeholderTextColor={C.muted}
            />
            <ScrollView
              style={ms.listBox}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {filteredCursos.length === 0 ? (
                <Text style={ms.emptyListText}>
                  No hay cursos activos disponibles
                </Text>
              ) : (
                filteredCursos.map((c) => {
                  const sel = selectedCursos.has(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[ms.listItem, sel && ms.listItemActive]}
                      onPress={() => toggleCurso(c.id)}
                    >
                      <View style={ms.listItemLeft}>
                        <View
                          style={[
                            ms.cursoBadgeBox,
                            {
                              backgroundColor: sel
                                ? "rgba(45,58,130,0.12)"
                                : "rgba(124,92,191,0.10)",
                              borderColor: sel ? C.navyMd : C.purple,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              ms.cursoBadgeText,
                              { color: sel ? C.navyMd : C.purple },
                            ]}
                          >
                            {c.codigo}
                          </Text>
                        </View>
                        <View>
                          <Text style={ms.listItemName}>{c.nombre}</Text>
                          <Text style={ms.listItemSub}>
                            {c.creditos} créditos
                          </Text>
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
          </ScrollView>

          <View style={ms.footer}>
            <TouchableOpacity
              style={ms.cancelBtn}
              onPress={handleClose}
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
                <Text style={ms.saveBtnText}>Asignar cursos</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Cursos() {
  const { show: toast, Toast } = useToast();

  // ✅ Protección de rol — solo ADMIN puede acceder
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/(dashboard)/admin" as any);
    }
  }, [user]);

  const [tab, setTab] = useState<Tab>("cursos");

  // ── Estado: Cursos ────────────────────────────────────────────────────────
  const [cursos, setCursos] = useState<CursoResponse[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [totalCursos, setTotalCursos] = useState(0);
  const [totalPagesCursos, setTotalPagesCursos] = useState(0);
  const [pageCursos, setPageCursos] = useState(0);
  const [searchCursos, setSearchCursos] = useState("");
  const [activeFilterCursos, setActiveFilterCursos] = useState<boolean | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Estado: Asignaciones ──────────────────────────────────────────────────
  const [docentesConCursos, setDocentesConCursos] = useState<
    DocenteConCursosResponse[]
  >([]);
  const [loadingAsig, setLoadingAsig] = useState(true);
  const [searchAsig, setSearchAsig] = useState("");

  // ── Estado: Modales ───────────────────────────────────────────────────────
  const [showCursoModal, setShowCursoModal] = useState(false);
  const [editingCurso, setEditingCurso] = useState<CursoResponse | null>(null);
  const [showAsigModal, setShowAsigModal] = useState(false);

  // ── Docentes para el modal de asignación ─────────────────────────────────
  const [docentesList, setDocentesList] = useState<UserResponse[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  // ── Carga de cursos ───────────────────────────────────────────────────────
  const loadCursos = useCallback(
    async (p = 0) => {
      setLoadingCursos(true);
      try {
        const { data } = await getCursos({
          search: searchCursos.trim() || undefined,
          isActive: activeFilterCursos ?? undefined,
          page: p,
          size: 20,
        });
        setCursos(data.content);
        setTotalCursos(data.totalElements);
        setTotalPagesCursos(data.totalPages);
        setPageCursos(data.page);
      } catch {
        toast("No se pudieron cargar los cursos.", "error");
      } finally {
        setLoadingCursos(false);
      }
    },
    [searchCursos, activeFilterCursos],
  );

  // ── Carga de asignaciones ─────────────────────────────────────────────────
  const loadAsignaciones = useCallback(async () => {
    setLoadingAsig(true);
    try {
      const { data } = await getDocentesConCursos();
      setDocentesConCursos(data);
    } catch {
      toast("No se pudieron cargar las asignaciones.", "error");
    } finally {
      setLoadingAsig(false);
    }
  }, []);

  // ── Carga de docentes para el modal ──────────────────────────────────────
  const loadDocentes = useCallback(async () => {
    try {
      const { data } = await getUsers({
        role: "DOCENTE",
        isActive: true,
        size: 100,
      });
      setDocentesList(data.content);
    } catch {
      // silencioso
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isMounted.current) {
        isMounted.current = true;
        loadCursos(0);
        loadAsignaciones();
        loadDocentes();
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        loadCursos(0);
        loadAsignaciones();
      }, 350);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [loadCursos, loadAsignaciones, loadDocentes]),
  );

  // ── Acciones sobre cursos ─────────────────────────────────────────────────
  const handleToggleActive = async (curso: CursoResponse) => {
    const action = curso.active ? "Desactivar" : "Activar";
    const ok =
      Platform.OS === "web"
        ? window.confirm(`¿${action} el curso "${curso.nombre}"?`)
        : await new Promise<boolean>((resolve) =>
            Alert.alert(
              `¿${action} curso?`,
              `El curso "${curso.nombre}" será ${curso.active ? "desactivado" : "activado"}.`,
              [
                {
                  text: "Cancelar",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                { text: action, onPress: () => resolve(true) },
              ],
            ),
          );
    if (!ok) return;
    setActionLoading(`status-${curso.id}`);
    try {
      const { data } = await setCursoActive(curso.id, !curso.active);
      setCursos((prev) => prev.map((c) => (c.id === curso.id ? data : c)));
      toast(
        `Curso "${curso.nombre}" ${curso.active ? "desactivado" : "activado"}`,
      );
    } catch (err: any) {
      toast(
        err?.response?.data?.message ?? "Error al cambiar el estado.",
        "error",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (curso: CursoResponse) => {
    const ok =
      Platform.OS === "web"
        ? window.confirm(
            `¿Eliminar permanentemente el curso "${curso.nombre}"?\nEsta acción no se puede deshacer.`,
          )
        : await new Promise<boolean>((resolve) =>
            Alert.alert(
              "Eliminar curso",
              `¿Eliminar permanentemente "${curso.nombre}"?\nEsta acción no se puede deshacer.`,
              [
                {
                  text: "Cancelar",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "Eliminar",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ],
            ),
          );
    if (!ok) return;
    setActionLoading(`delete-${curso.id}`);
    try {
      await deleteCurso(curso.id);
      setCursos((prev) => prev.filter((c) => c.id !== curso.id));
      setTotalCursos((n) => n - 1);
      toast(`Curso "${curso.nombre}" eliminado`);
    } catch (err: any) {
      toast(
        err?.response?.data?.message ?? "No se pudo eliminar el curso.",
        "error",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoverAsignacion = async (
    asignacionId: string,
    cursoNombre: string,
    docenteNombre: string | null,
  ) => {
    const ok =
      Platform.OS === "web"
        ? window.confirm(
            `¿Remover "${cursoNombre}" de ${docenteNombre ?? "este docente"}?`,
          )
        : await new Promise<boolean>((resolve) =>
            Alert.alert(
              "Remover asignación",
              `¿Remover "${cursoNombre}" de ${docenteNombre ?? "este docente"}?`,
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
      await removerAsignacion(asignacionId);
      await loadAsignaciones();
      toast(`Asignación removida correctamente`);
    } catch (err: any) {
      toast(
        err?.response?.data?.message ?? "No se pudo remover la asignación.",
        "error",
      );
    }
  };

  // ── Render: tarjeta de curso ──────────────────────────────────────────────
  const renderCursoCard = (curso: CursoResponse) => {
    const isStatusLoading = actionLoading === `status-${curso.id}`;
    const isDeleteLoading = actionLoading === `delete-${curso.id}`;
    const anyLoading = isStatusLoading || isDeleteLoading;

    return (
      <View key={curso.id} style={s.card}>
        <View style={s.cardRow}>
          <View style={s.cursoIconBox}>
            <Text style={s.cursoIconText}>📚</Text>
          </View>
          <View style={s.cardInfo}>
            <View style={s.cardNameRow}>
              <Text style={s.cardName} numberOfLines={1}>
                {curso.nombre}
              </Text>
              <View
                style={[
                  s.codeBadge,
                  {
                    backgroundColor: "rgba(124,92,191,0.10)",
                    borderColor: C.purple,
                  },
                ]}
              >
                <Text style={[s.codeBadgeText, { color: C.purple }]}>
                  {curso.codigo}
                </Text>
              </View>
            </View>
            {curso.descripcion ? (
              <Text style={s.cardDesc} numberOfLines={2}>
                {curso.descripcion}
              </Text>
            ) : null}
            <Text style={s.cardMeta}>
              {curso.creditos} crédito{curso.creditos !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        <View style={s.statusRow}>
          <View
            style={[
              s.pill,
              curso.active
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
                { backgroundColor: curso.active ? C.success : C.danger },
              ]}
            />
            <Text
              style={[
                s.pillText,
                { color: curso.active ? C.success : C.danger },
              ]}
            >
              {curso.active ? "Activo" : "Inactivo"}
            </Text>
          </View>
          {curso.updatedAt && (
            <Text style={s.dateText}>
              Actualizado{" "}
              {new Date(curso.updatedAt).toLocaleDateString("es-PE", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          )}
        </View>

        <View style={s.actionsRow}>
          <TouchableOpacity
            style={[s.btn, s.btnPrimary, anyLoading && s.btnDisabled]}
            disabled={anyLoading}
            onPress={() => {
              setEditingCurso(curso);
              setShowCursoModal(true);
            }}
          >
            <Text style={s.btnPrimaryText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.btn,
              curso.active ? s.btnWarn : s.btnSuccess,
              anyLoading && s.btnDisabled,
            ]}
            disabled={anyLoading}
            onPress={() => handleToggleActive(curso)}
          >
            {isStatusLoading ? (
              <ActivityIndicator
                size="small"
                color={curso.active ? C.danger : C.success}
              />
            ) : (
              <Text style={curso.active ? s.btnWarnText : s.btnSuccessText}>
                {curso.active ? "Desactivar" : "Activar"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, s.btnDanger, anyLoading && s.btnDisabled]}
            disabled={anyLoading}
            onPress={() => handleDelete(curso)}
          >
            {isDeleteLoading ? (
              <ActivityIndicator size="small" color="#c04040" />
            ) : (
              <Text style={s.btnDangerText}>Eliminar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Render: tarjeta de docente con sus cursos ─────────────────────────────
  const filteredDocentes = docentesConCursos.filter((d) => {
    const q = searchAsig.toLowerCase();
    return (
      (d.docenteNombre ?? "").toLowerCase().includes(q) ||
      d.docenteEmail.toLowerCase().includes(q) ||
      d.docenteUsername.toLowerCase().includes(q)
    );
  });

  const renderDocenteCard = (d: DocenteConCursosResponse) => (
    <View key={d.docenteId} style={s.card}>
      <View style={s.cardRow}>
        <View
          style={[
            s.avatar,
            {
              backgroundColor: "rgba(58,181,160,0.14)",
              borderColor: C.success,
            },
          ]}
        >
          <Text style={[s.avatarText, { color: C.success }]}>
            {((d.docenteNombre ?? d.docenteEmail)[0] ?? "?").toUpperCase()}
          </Text>
        </View>
        <View style={s.cardInfo}>
          <Text style={s.cardName}>{d.docenteNombre ?? "Sin nombre"}</Text>
          <Text style={s.cardEmail}>{d.docenteEmail}</Text>
          <Text style={s.cardUsername}>@{d.docenteUsername}</Text>
        </View>
        <View
          style={[s.countBadge, { backgroundColor: "rgba(45,58,130,0.08)" }]}
        >
          <Text style={s.countBadgeNum}>{d.cursos.length}</Text>
          <Text style={s.countBadgeLabel}>
            curso{d.cursos.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {d.cursos.length > 0 ? (
        <View style={s.cursosGrid}>
          {d.cursos.map((c) => (
            <View key={c.id} style={s.cursoChip}>
              <View style={s.cursoChipLeft}>
                <Text style={s.cursoChipCode}>{c.codigo}</Text>
                <Text style={s.cursoChipName} numberOfLines={1}>
                  {c.nombre}
                </Text>
              </View>
              <TouchableOpacity
                style={s.cursoChipRemove}
                onPress={() =>
                  handleRemoverAsignacion(c.id, c.nombre, d.docenteNombre)
                }
              >
                <Text style={s.cursoChipRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <Text style={s.noCursosText}>Sin cursos asignados</Text>
      )}
    </View>
  );

  // ── UI principal ──────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <Toast />

      {/* Modales */}
      <CursoFormModal
        visible={showCursoModal}
        curso={editingCurso}
        onClose={() => {
          setShowCursoModal(false);
          setEditingCurso(null);
        }}
        onSaved={(saved) => {
          setCursos((prev) => {
            const idx = prev.findIndex((c) => c.id === saved.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = saved;
              return next;
            }
            return [saved, ...prev];
          });
          if (!editingCurso) setTotalCursos((n) => n + 1);
          setShowCursoModal(false);
          setEditingCurso(null);
          toast(
            editingCurso
              ? "Curso actualizado correctamente"
              : "Curso creado correctamente",
          );
        }}
      />

      <AsignacionModal
        visible={showAsigModal}
        docentes={docentesList}
        cursos={cursos}
        onClose={() => setShowAsigModal(false)}
        onSaved={() => {
          loadAsignaciones();
          toast("Cursos asignados correctamente");
        }}
      />

      {/* Cabecera */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Gestión de cursos</Text>
          <Text style={s.subtitle}>
            {totalCursos} curso{totalCursos !== 1 ? "s" : ""} registrados
          </Text>
        </View>
        <View style={s.headerBtns}>
          {tab === "cursos" ? (
            <TouchableOpacity
              style={s.newBtn}
              onPress={() => {
                setEditingCurso(null);
                setShowCursoModal(true);
              }}
            >
              <Text style={s.newBtnText}>+ Nuevo curso</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.newBtn, { backgroundColor: C.success }]}
              onPress={() => setShowAsigModal(true)}
            >
              <Text style={s.newBtnText}>+ Asignar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {(
          [
            ["cursos", "📚 Cursos"],
            ["asignaciones", "👨‍🏫 Asignaciones"],
          ] as const
        ).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.tab, tab === key && s.tabActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TAB: CURSOS ── */}
      {tab === "cursos" && (
        <>
          <View style={s.filters}>
            <View style={s.searchWrap}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Buscar por nombre o código..."
                placeholderTextColor={C.muted}
                value={searchCursos}
                onChangeText={setSearchCursos}
              />
              {searchCursos.length > 0 && (
                <Pressable onPress={() => setSearchCursos("")}>
                  <Text style={s.clearIcon}>✕</Text>
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.chipRow}
            >
              {(
                [
                  [null, "Todos"],
                  [true, "Activos"],
                  [false, "Inactivos"],
                ] as const
              ).map(([val, label]) => (
                <TouchableOpacity
                  key={String(val)}
                  style={[s.chip, activeFilterCursos === val && s.chipActive]}
                  onPress={() => setActiveFilterCursos(val)}
                >
                  <Text
                    style={[
                      s.chipText,
                      activeFilterCursos === val && s.chipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {loadingCursos ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={C.navyMd} />
            </View>
          ) : cursos.length === 0 ? (
            <View style={s.center}>
              <Text style={s.emptyIcon}>📚</Text>
              <Text style={s.emptyTitle}>No hay cursos registrados</Text>
              <Text style={s.emptyText}>
                Crea el primer curso con el botón "+ Nuevo curso".
              </Text>
            </View>
          ) : (
            <ScrollView
              style={s.list}
              contentContainerStyle={s.listContent}
              showsVerticalScrollIndicator={false}
            >
              {cursos.map(renderCursoCard)}
              {totalPagesCursos > 1 && (
                <View style={s.pagination}>
                  <TouchableOpacity
                    style={[s.pageBtn, pageCursos === 0 && s.pageBtnDisabled]}
                    disabled={pageCursos === 0}
                    onPress={() => loadCursos(pageCursos - 1)}
                  >
                    <Text style={s.pageBtnText}>‹ Anterior</Text>
                  </TouchableOpacity>
                  <Text style={s.pageInfo}>
                    {pageCursos + 1} / {totalPagesCursos}
                  </Text>
                  <TouchableOpacity
                    style={[
                      s.pageBtn,
                      pageCursos >= totalPagesCursos - 1 && s.pageBtnDisabled,
                    ]}
                    disabled={pageCursos >= totalPagesCursos - 1}
                    onPress={() => loadCursos(pageCursos + 1)}
                  >
                    <Text style={s.pageBtnText}>Siguiente ›</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* ── TAB: ASIGNACIONES ── */}
      {tab === "asignaciones" && (
        <>
          <View style={[s.filters, { marginBottom: 0 }]}>
            <View style={s.searchWrap}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Buscar docente..."
                placeholderTextColor={C.muted}
                value={searchAsig}
                onChangeText={setSearchAsig}
              />
              {searchAsig.length > 0 && (
                <Pressable onPress={() => setSearchAsig("")}>
                  <Text style={s.clearIcon}>✕</Text>
                </Pressable>
              )}
            </View>
          </View>

          {loadingAsig ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={C.navyMd} />
            </View>
          ) : filteredDocentes.length === 0 ? (
            <View style={s.center}>
              <Text style={s.emptyIcon}>👨‍🏫</Text>
              <Text style={s.emptyTitle}>No hay docentes registrados</Text>
              <Text style={s.emptyText}>
                Primero crea usuarios con rol Docente en la sección de usuarios.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={s.list}
              contentContainerStyle={s.listContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredDocentes.map(renderDocenteCard)}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Cabecera
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "800", color: C.navy },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 2 },
  headerBtns: { flexDirection: "row", gap: 8 },
  newBtn: {
    backgroundColor: C.navyMd,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      web: {
        boxShadow: "0 2px 10px rgba(27,34,87,0.25)",
        cursor: "pointer",
      } as any,
    }),
  },
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Tabs
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabActive: { backgroundColor: C.navyMd, borderColor: C.navyMd },
  tabText: { fontSize: 13, fontWeight: "600", color: C.sub },
  tabTextActive: { color: "#fff" },

  // Filtros
  filters: { paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.navy,
    ...Platform.select({ web: { outlineStyle: "none" } as any }),
  },
  clearIcon: { fontSize: 14, color: C.muted, padding: 4 },
  chipRow: { flexDirection: "row" as any },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: C.navyMd, borderColor: C.navyMd },
  chipText: { fontSize: 12, fontWeight: "600", color: C.sub },
  chipTextActive: { color: "#fff" },

  // Lista
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
    paddingTop: 4,
  },

  // Card compartido
  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      web: { boxShadow: "0 2px 12px rgba(27,34,87,0.09)" } as any,
    }),
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardInfo: { flex: 1, gap: 2 },
  cardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardName: { fontSize: 15, fontWeight: "700", color: C.navy, flexShrink: 1 },
  cardDesc: { fontSize: 12.5, color: C.sub, lineHeight: 17 },
  cardMeta: { fontSize: 11.5, color: C.muted },
  cardEmail: { fontSize: 12.5, color: C.sub },
  cardUsername: { fontSize: 11.5, color: C.muted },

  // Icono de curso
  cursoIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(124,92,191,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(124,92,191,0.25)",
  },
  cursoIconText: { fontSize: 22 },

  // Avatar de docente
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  avatarText: { fontWeight: "800", fontSize: 15 },

  // Badge código
  codeBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  codeBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  // Badge contador
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 52,
  },
  countBadgeNum: { fontSize: 18, fontWeight: "800", color: C.navyMd },
  countBadgeLabel: { fontSize: 10, color: C.sub, fontWeight: "600" },

  // Estado
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
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
  dateText: { fontSize: 11, color: C.muted, marginLeft: "auto" as any },

  // Cursos asignados (chips en tarjeta docente)
  cursosGrid: { gap: 6 },
  cursoChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f6f7fb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cursoChipLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  cursoChipCode: {
    fontSize: 10,
    fontWeight: "800",
    color: C.purple,
    backgroundColor: "rgba(124,92,191,0.10)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: "hidden",
  },
  cursoChipName: { fontSize: 13, fontWeight: "600", color: C.navy, flex: 1 },
  cursoChipRemove: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(224,82,82,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  cursoChipRemoveText: { fontSize: 10, color: C.danger, fontWeight: "700" },
  noCursosText: { fontSize: 13, color: C.muted, fontStyle: "italic" },

  // Botones de acción
  actionsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  btn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    minWidth: 36,
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
  btnDanger: {
    backgroundColor: "rgba(224,82,82,0.05)",
    borderColor: "#f0a0a0",
  },
  btnDangerText: { fontSize: 12, fontWeight: "700", color: "#c04040" },

  // Estado vacío / carga
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.navy,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    paddingHorizontal: 32,
  },

  // Paginación
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { fontSize: 13, fontWeight: "600", color: C.navyMd },
  pageInfo: { fontSize: 13, color: C.sub },

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
  sheetWide: { maxWidth: 560 },
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
  errorBanner: {
    backgroundColor: "rgba(224,82,82,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e05252",
    padding: 12,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, color: "#e05252", fontWeight: "600" },
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
  inputMultiline: { minHeight: 80, textAlignVertical: "top", paddingTop: 11 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1b2257",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  selectedCount: { fontWeight: "700", color: "#2d3a82" },
  listBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4e8f4",
    overflow: "hidden",
    marginBottom: 4,
    maxHeight: 200,
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
  cursoBadgeBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: "center",
  },
  cursoBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  checkIcon: { fontSize: 16, fontWeight: "700" },
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
});
