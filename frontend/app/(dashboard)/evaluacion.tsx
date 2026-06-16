// ── app/(dashboard)/evaluacion.tsx ───────────────────────────────────────────
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
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
    CursoEvaluacionResponse,
    EstudianteNotaItem,
    PublicacionConNotasResponse,
    PublicacionResumenItem,
    eliminarNota,
    getCursosEvaluacion,
    getPublicacionConNotas,
    registrarNota,
} from "../../services/evaluacionApi";

// ── Paleta idéntica al resto del proyecto ────────────────────────────────────
const C = {
  navy:    "#1b2257",
  navyMd:  "#2d3a82",
  bg:      "#f0f2f8",
  white:   "#ffffff",
  muted:   "#9099bb",
  sub:     "#7b85b0",
  accent:  "#e8a020",
  border:  "#e4e8f4",
  danger:  "#e05252",
  success: "#3ab5a0",
  purple:  "#7c5cbf",
  info:    "#5b8dee",
  orange:  "#e8a020",
};

// ── Colores por tipo de publicación ──────────────────────────────────────────
const TIPO_META: Record<string, { label: string; color: string; bg: string }> = {
  TAREA:      { label: "Tarea",      color: C.info,    bg: "rgba(91,141,238,0.10)"  },
  EVALUACION: { label: "Evaluación", color: C.purple,  bg: "rgba(124,92,191,0.10)"  },
};

// ── Color de nota vigesimal ───────────────────────────────────────────────────
function notaColor(nota: number | null): string {
  if (nota === null) return C.muted;
  if (nota >= 14) return C.success;
  if (nota >= 11) return C.orange;
  return C.danger;
}

// ══════════════════════════════════════════════════════════════════════════════
//  Hook Toast
// ══════════════════════════════════════════════════════════════════════════════
function useToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [msg, setMsg]   = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (text: string, t: "success" | "error" | "info" = "success") => {
    if (timer.current) clearTimeout(timer.current);
    opacity.setValue(0);
    setMsg(text); setType(t);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(() => setMsg(""), 2900);
  };

  const Toast = useCallback(() =>
    msg ? (
      <Animated.View style={[s.toast, { opacity,
        backgroundColor: type === "success" ? C.success : type === "error" ? C.danger : C.navyMd }]}
        pointerEvents="none">
        <Text style={s.toastText}>
          {type === "success" ? "✓  " : type === "error" ? "✕  " : "ℹ  "}{msg}
        </Text>
      </Animated.View>
    ) : null,
  [msg, type, opacity]);

  return { show, Toast };
}

// ══════════════════════════════════════════════════════════════════════════════
//  Modal: Registrar / editar nota de un estudiante
// ══════════════════════════════════════════════════════════════════════════════
function NotaModal({
  visible,
  publicacionTitulo,
  estudiante,
  onClose,
  onSaved,
}: {
  visible:          boolean;
  publicacionTitulo: string | null;
  estudiante:       EstudianteNotaItem | null;
  onClose:          () => void;
  onSaved:          (nota: number, comentario: string) => void;
}) {
  const [notaStr,    setNotaStr]    = useState("");
  const [comentario, setComentario] = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  // Inicializar con nota existente
  const prevVisible = useRef(false);
  if (visible && !prevVisible.current && estudiante) {
    setNotaStr(estudiante.nota !== null ? String(estudiante.nota) : "");
    setComentario(estudiante.comentario ?? "");
    setError("");
  }
  prevVisible.current = visible;

  const handleSave = async () => {
    const val = parseFloat(notaStr.replace(",", "."));
    if (isNaN(val) || val < 0 || val > 20) {
      setError("La nota debe ser un número entre 0 y 20.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      onSaved(val, comentario.trim());
    } catch {
      setError("No se pudo guardar la nota.");
    } finally {
      setSaving(false);
    }
  };

  if (!estudiante) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          {/* Header */}
          <View style={ms.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={ms.sheetTitle}>
                {estudiante.notaId ? "Editar nota" : "Registrar nota"}
              </Text>
              <Text style={ms.sheetSub} numberOfLines={1}>
                {estudiante.estudianteNombre ?? estudiante.estudianteEmail}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Text style={ms.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={ms.body}>
            {/* Info publicación */}
            <View style={ms.infoBanner}>
              <Text style={ms.infoText}>📋 {publicacionTitulo ?? "Sin título"}</Text>
            </View>

            {/* Estado entrega */}
            <View style={[ms.infoBanner,
              { backgroundColor: estudiante.entregado
                  ? "rgba(58,181,160,0.08)" : "rgba(224,82,82,0.08)",
                borderColor: estudiante.entregado ? C.success : C.danger,
                marginTop: 8 }]}>
              <Text style={[ms.infoText,
                { color: estudiante.entregado ? C.success : C.danger }]}>
                {estudiante.entregado ? "✓ El estudiante entregó" : "✕ Sin entrega"}
              </Text>
            </View>

            {/* Campo nota */}
            <View style={[ms.field, { marginTop: 16 }]}>
              <Text style={ms.label}>Nota (0 – 20) *</Text>
              <TextInput
                style={[ms.input, { fontSize: 22, fontWeight: "800",
                  color: C.navy, textAlign: "center" }]}
                value={notaStr}
                onChangeText={(t) => { setNotaStr(t); setError(""); }}
                placeholder="0.00"
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
                maxLength={5}
              />
            </View>

            {/* Campo comentario */}
            <View style={ms.field}>
              <Text style={ms.label}>Comentario al estudiante (opcional)</Text>
              <TextInput
                style={[ms.input, { minHeight: 72, textAlignVertical: "top" }]}
                value={comentario}
                onChangeText={setComentario}
                placeholder="Observaciones, retroalimentación..."
                placeholderTextColor={C.muted}
                multiline
                maxLength={500}
              />
            </View>

            {error ? (
              <View style={ms.errorBanner}>
                <Text style={ms.errorText}>✕ {error}</Text>
              </View>
            ) : null}
          </View>

          <View style={ms.footer}>
            <TouchableOpacity style={ms.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={ms.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ms.saveBtn, saving && ms.saveBtnDisabled]}
              onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={ms.saveBtnText}>Guardar nota</Text>}
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
export default function Evaluacion() {
  const { user } = useAuth();
  const { show: toast, Toast } = useToast();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // ── Estado principal ──────────────────────────────────────────────────────
  const [cursos,       setCursos]       = useState<CursoEvaluacionResponse[]>([]);
  const [loadingMain,  setLoadingMain]  = useState(true);
  const [searchCurso,  setSearchCurso]  = useState("");
  const [cursoActivo,  setCursoActivo]  = useState<CursoEvaluacionResponse | null>(null);
  const [pubActiva,    setPubActiva]    = useState<PublicacionResumenItem | null>(null);
  const [detalle,      setDetalle]      = useState<PublicacionConNotasResponse | null>(null);
  const [loadingDet,   setLoadingDet]   = useState(false);
  const [savingId,     setSavingId]     = useState<string | null>(null);

  // Responsive: en mobile mostramos: lista cursos → lista pubs → detalle
  const [mobileStep,   setMobileStep]   = useState<"cursos" | "pubs" | "notas">("cursos");

  // Modal nota
  const [modalEst,     setModalEst]     = useState<EstudianteNotaItem | null>(null);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoadingMain(true);
    getCursosEvaluacion()
      .then(({ data }) => {
        if (!active) return;
        setCursos(data);
        if (data.length > 0 && !cursoActivo) setCursoActivo(data[0]);
      })
      .catch(() => { if (active) toast("No se pudieron cargar los cursos.", "error"); })
      .finally(() => { if (active) setLoadingMain(false); });
    return () => { active = false; };
  }, []));

  // ── Seleccionar publicación → cargar detalle ──────────────────────────────
  const seleccionarPublicacion = async (pub: PublicacionResumenItem) => {
    setPubActiva(pub);
    setDetalle(null);
    setLoadingDet(true);
    if (isMobile) setMobileStep("notas");
    try {
      const { data } = await getPublicacionConNotas(pub.publicacionId);
      setDetalle(data);
    } catch {
      toast("No se pudo cargar el detalle.", "error");
    } finally {
      setLoadingDet(false);
    }
  };

  // ── Guardar nota desde el modal ───────────────────────────────────────────
  const handleGuardarNota = async (nota: number, comentario: string) => {
    if (!modalEst || !pubActiva) return;
    setSavingId(modalEst.estudianteId);
    try {
      await registrarNota({
        publicacionId: pubActiva.publicacionId,
        estudianteId:  modalEst.estudianteId,
        nota,
        comentario: comentario || undefined,
      });
      // Refrescar detalle
      const { data } = await getPublicacionConNotas(pubActiva.publicacionId);
      setDetalle(data);
      // Actualizar resumen en la lista de publicaciones
      setCursos(prev => prev.map(c =>
        c.cursoId !== cursoActivo?.cursoId ? c : {
          ...c,
          publicaciones: c.publicaciones.map(p =>
            p.publicacionId !== pubActiva.publicacionId ? p : {
              ...p, totalCalificados: data.totalCalificados
            }
          )
        }
      ));
      setModalEst(null);
      toast("Nota guardada correctamente ✓");
    } catch (e: any) {
      toast(e?.response?.data?.message ?? "Error al guardar la nota.", "error");
    } finally {
      setSavingId(null);
    }
  };

  // ── Eliminar nota ─────────────────────────────────────────────────────────
  const handleEliminarNota = async (est: EstudianteNotaItem) => {
    if (!est.notaId) return;
    const ok = Platform.OS === "web"
      ? window.confirm(`¿Eliminar la nota de ${est.estudianteNombre ?? est.estudianteEmail}?`)
      : true;
    if (!ok) return;
    setSavingId(est.estudianteId);
    try {
      await eliminarNota(est.notaId);
      const { data } = await getPublicacionConNotas(pubActiva!.publicacionId);
      setDetalle(data);
      toast("Nota eliminada.");
    } catch (e: any) {
      toast(e?.response?.data?.message ?? "Error al eliminar.", "error");
    } finally {
      setSavingId(null);
    }
  };

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const cursosFiltrados = cursos.filter(c =>
    c.cursoNombre.toLowerCase().includes(searchCurso.toLowerCase()) ||
    c.cursoCodigo.toLowerCase().includes(searchCurso.toLowerCase())
  );

  // ── Render: barra de progreso de calificados ──────────────────────────────
  const renderProgreso = (calificados: number, total: number) => {
    const pct = total > 0 ? Math.round((calificados / total) * 100) : 0;
    return (
      <View style={{ gap: 4 }}>
        <View style={s.progressBar}>
          <View style={[s.progressFill,
            { width: `${pct}%` as any,
              backgroundColor: pct === 100 ? C.success : pct >= 50 ? C.orange : C.navyMd }]} />
        </View>
        <Text style={s.progressLabel}>{calificados}/{total} calificados ({pct}%)</Text>
      </View>
    );
  };

  // ── Render: tarjeta de publicación en la lista central ────────────────────
  const renderPubItem = (pub: PublicacionResumenItem) => {
    const meta  = TIPO_META[pub.tipo] ?? TIPO_META.TAREA;
    const activa = pubActiva?.publicacionId === pub.publicacionId;
    const pct = pub.totalMatriculados > 0
      ? Math.round((pub.totalCalificados / pub.totalMatriculados) * 100) : 0;

    return (
      <TouchableOpacity
        key={pub.publicacionId}
        style={[s.pubItem, activa && s.pubItemActive]}
        onPress={() => seleccionarPublicacion(pub)}
        activeOpacity={0.8}>
        <View style={s.pubItemTop}>
          <View style={[s.tipoBadge, { backgroundColor: meta.bg, borderColor: meta.color }]}>
            <Text style={[s.tipoBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <View style={[s.pctBadge,
            { backgroundColor: pct === 100
                ? "rgba(58,181,160,0.12)" : "rgba(232,160,32,0.10)" }]}>
            <Text style={[s.pctBadgeText,
              { color: pct === 100 ? C.success : C.orange }]}>{pct}%</Text>
          </View>
        </View>
        <Text style={[s.pubItemName, activa && { color: C.navyMd }]} numberOfLines={2}>
          {pub.titulo ?? "Sin título"}
        </Text>
        <View style={s.pubItemMeta}>
          <Text style={s.pubItemMetaText}>
            📝 {pub.totalEntregas} entregas · ★ {pub.totalCalificados}/{pub.totalMatriculados}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render: fila de estudiante en el panel de notas ───────────────────────
  const renderEstRow = (est: EstudianteNotaItem) => {
    const loading = savingId === est.estudianteId;
    const nc = notaColor(est.nota);

    return (
      <View key={est.estudianteId} style={s.estRow}>
        {/* Avatar */}
        <View style={[s.estAvatar,
          { backgroundColor: est.nota !== null
              ? "rgba(58,181,160,0.10)" : "rgba(144,153,187,0.10)",
            borderColor: est.nota !== null ? C.success : C.border }]}>
          <Text style={[s.estAvatarText,
            { color: est.nota !== null ? C.success : C.muted }]}>
            {(est.estudianteNombre ?? est.estudianteEmail)[0].toUpperCase()}
          </Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={s.estName} numberOfLines={1}>
            {est.estudianteNombre ?? "Sin nombre"}
          </Text>
          <Text style={s.estEmail} numberOfLines={1}>{est.estudianteEmail}</Text>
          <View style={s.estFlags}>
            <View style={[s.flagPill,
              { backgroundColor: est.entregado
                  ? "rgba(58,181,160,0.10)" : "rgba(224,82,82,0.08)",
                borderColor: est.entregado ? C.success : C.danger }]}>
              <Text style={[s.flagText,
                { color: est.entregado ? C.success : C.danger }]}>
                {est.entregado ? "✓ Entregó" : "✕ Sin entrega"}
              </Text>
            </View>
          </View>
        </View>

        {/* Nota y acciones */}
        <View style={s.estActions}>
          {est.nota !== null ? (
            <View style={[s.notaBadge,
              { backgroundColor: `${nc}18`, borderColor: nc }]}>
              <Text style={[s.notaBadgeText, { color: nc }]}>
                {Number(est.nota).toFixed(2)}
              </Text>
            </View>
          ) : (
            <View style={[s.notaBadge,
              { backgroundColor: "#f0f2f8", borderColor: C.border }]}>
              <Text style={[s.notaBadgeText, { color: C.muted }]}>—</Text>
            </View>
          )}

          {loading
            ? <ActivityIndicator size="small" color={C.navyMd} />
            : (
              <View style={s.actBtns}>
                <TouchableOpacity
                  style={[s.actBtn, { borderColor: C.navyMd,
                    backgroundColor: "rgba(45,58,130,0.07)" }]}
                  onPress={() => setModalEst(est)}>
                  <Text style={[s.actBtnText, { color: C.navyMd }]}>
                    {est.notaId ? "✎ Editar" : "+ Nota"}
                  </Text>
                </TouchableOpacity>
                {est.notaId && (
                  <TouchableOpacity
                    style={[s.actBtn, { borderColor: C.danger,
                      backgroundColor: "rgba(224,82,82,0.07)" }]}
                    onPress={() => handleEliminarNota(est)}>
                    <Text style={[s.actBtnText, { color: C.danger }]}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
        </View>
      </View>
    );
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <Toast />

      {/* Modal nota */}
      <NotaModal
        visible={!!modalEst}
        publicacionTitulo={pubActiva?.titulo ?? null}
        estudiante={modalEst}
        onClose={() => setModalEst(null)}
        onSaved={handleGuardarNota}
      />

      <View style={s.layout}>

        {/* ══ COLUMNA 1: lista de cursos ══ */}
        {(!isMobile || mobileStep === "cursos") && (
          <View style={[s.col1, isMobile && { width: "100%", borderRightWidth: 0 }]}>
            <View style={s.colHeader}>
              <Text style={s.colTitle}>Cursos</Text>
              <Text style={s.colSub}>{cursos.length} curso{cursos.length !== 1 ? "s" : ""}</Text>
            </View>
            <View style={s.searchBox}>
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

            {loadingMain ? (
              <View style={s.center}><ActivityIndicator color={C.navyMd} /></View>
            ) : cursosFiltrados.length === 0 ? (
              <View style={s.center}>
                <Text style={s.emptyIcon}>📚</Text>
                <Text style={s.emptySub}>No hay cursos</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {cursosFiltrados.map(curso => {
                  const activo = cursoActivo?.cursoId === curso.cursoId;
                  const totalPubs = curso.totalPublicaciones;
                  const calificadas = curso.publicaciones.reduce(
                    (acc, p) => acc + p.totalCalificados, 0);
                  const totalMat = curso.publicaciones[0]?.totalMatriculados ?? 0;

                  return (
                    <TouchableOpacity
                      key={curso.cursoId}
                      style={[s.cursoItem, activo && s.cursoItemActive]}
                      onPress={() => {
                        setCursoActivo(curso);
                        setPubActiva(null);
                        setDetalle(null);
                        if (isMobile) setMobileStep("pubs");
                      }}
                      activeOpacity={0.8}>
                      <View style={[s.cursoIcon,
                        { backgroundColor: activo
                            ? "rgba(45,58,130,0.15)" : "rgba(124,92,191,0.10)",
                          borderColor: activo ? C.navyMd : C.purple }]}>
                        <Text style={[s.cursoIconText,
                          { color: activo ? C.navyMd : C.purple }]}>
                          {curso.cursoCodigo.slice(0, 3)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.cursoName, activo && { color: C.navyMd }]}
                          numberOfLines={1}>
                          {curso.cursoNombre}
                        </Text>
                        <Text style={s.cursoMeta}>
                          {totalPubs} publicaciones
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

        {/* ══ COLUMNA 2: publicaciones del curso ══ */}
        {(!isMobile || mobileStep === "pubs") && (
          <View style={[s.col2, isMobile && { width: "100%", borderRightWidth: 0 }]}>
            {isMobile && (
              <TouchableOpacity style={s.backBtn} onPress={() => setMobileStep("cursos")}>
                <Text style={s.backBtnText}>← Cursos</Text>
              </TouchableOpacity>
            )}

            {!cursoActivo ? (
              <View style={s.center}>
                <Text style={s.emptyIcon}>👈</Text>
                <Text style={s.emptySub}>Selecciona un curso</Text>
              </View>
            ) : (
              <>
                <View style={s.colHeader}>
                  <View>
                    <Text style={s.colTitle}>{cursoActivo.cursoNombre}</Text>
                    <Text style={s.colSub}>
                      {cursoActivo.totalPublicaciones} publicaciones evaluables
                    </Text>
                  </View>
                </View>

                {cursoActivo.publicaciones.length === 0 ? (
                  <View style={s.center}>
                    <Text style={s.emptyIcon}>📋</Text>
                    <Text style={s.emptyTitle}>Sin publicaciones</Text>
                    <Text style={s.emptySub}>
                      No hay tareas ni evaluaciones publicadas en este periodo.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 12, gap: 8 }}>
                    {cursoActivo.publicaciones.map(renderPubItem)}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        )}

        {/* ══ COLUMNA 3: notas de la publicación ══ */}
        {(!isMobile || mobileStep === "notas") && (
          <View style={[s.col3, isMobile && { width: "100%" }]}>
            {isMobile && (
              <TouchableOpacity style={s.backBtn} onPress={() => setMobileStep("pubs")}>
                <Text style={s.backBtnText}>← Publicaciones</Text>
              </TouchableOpacity>
            )}

            {!pubActiva ? (
              <View style={s.center}>
                <Text style={s.emptyIcon}>📝</Text>
                <Text style={s.emptyTitle}>Selecciona una publicación</Text>
                <Text style={s.emptySub}>
                  para ver y registrar las notas de los estudiantes.
                </Text>
              </View>
            ) : loadingDet ? (
              <View style={s.center}>
                <ActivityIndicator size="large" color={C.navyMd} />
              </View>
            ) : detalle ? (
              <>
                {/* Header panel notas */}
                <View style={s.detHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {(() => {
                        const meta = TIPO_META[detalle.tipo] ?? TIPO_META.TAREA;
                        return (
                          <View style={[s.tipoBadge,
                            { backgroundColor: meta.bg, borderColor: meta.color }]}>
                            <Text style={[s.tipoBadgeText, { color: meta.color }]}>
                              {meta.label}
                            </Text>
                          </View>
                        );
                      })()}
                      <Text style={s.detTitle} numberOfLines={2}>
                        {detalle.titulo ?? "Sin título"}
                      </Text>
                    </View>
                    <View style={{ marginTop: 10 }}>
                      {renderProgreso(detalle.totalCalificados, detalle.totalMatriculados)}
                    </View>
                  </View>
                </View>

                {/* Lista de estudiantes */}
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
                  showsVerticalScrollIndicator={false}>
                  {detalle.estudiantes.length === 0 ? (
                    <View style={s.center}>
                      <Text style={s.emptyIcon}>👥</Text>
                      <Text style={s.emptySub}>No hay estudiantes matriculados.</Text>
                    </View>
                  ) : (
                    detalle.estudiantes.map(renderEstRow)
                  )}
                </ScrollView>
              </>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  layout: { flex: 1, flexDirection: "row" },

  // ── Columnas ─────────────────────────────────────────────────
  col1: {
    width: 240,
    backgroundColor: C.white,
    borderRightWidth: 1,
    borderRightColor: C.border,
    ...Platform.select({ web: { boxShadow: "2px 0 8px rgba(27,34,87,0.06)" } as any }),
  },
  col2: {
    width: 280,
    backgroundColor: C.white,
    borderRightWidth: 1,
    borderRightColor: C.border,
    ...Platform.select({ web: { boxShadow: "2px 0 8px rgba(27,34,87,0.06)" } as any }),
  },
  col3: { flex: 1, backgroundColor: C.bg },

  // ── Headers de columna ───────────────────────────────────────
  colHeader: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  colTitle: { fontSize: 15, fontWeight: "800", color: C.navy },
  colSub:   { fontSize: 12, color: C.muted, marginTop: 2 },

  // ── Search ────────────────────────────────────────────────────
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    marginVertical: 8,
    backgroundColor: "#f6f7fb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    height: 36,
  },
  searchIcon:  { fontSize: 12, marginRight: 6 },
  searchInput: {
    flex: 1, fontSize: 13, color: C.navy,
    ...Platform.select({ web: { outlineStyle: "none" } as any }),
  },
  clearIcon: { fontSize: 12, color: C.muted, padding: 2 },

  // ── Items de curso ────────────────────────────────────────────
  cursoItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 10, paddingVertical: 10,
    marginHorizontal: 6, marginVertical: 2, borderRadius: 10,
  },
  cursoItemActive:  { backgroundColor: "rgba(45,58,130,0.06)" },
  cursoIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  cursoIconText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  cursoName:     { fontSize: 12, fontWeight: "700", color: C.navy },
  cursoMeta:     { fontSize: 11, color: C.muted, marginTop: 1 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.navyMd },

  // ── Items de publicación ──────────────────────────────────────
  pubItem: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({ web: { boxShadow: "0 1px 6px rgba(27,34,87,0.07)" } as any }),
  },
  pubItemActive: { borderColor: C.navyMd, backgroundColor: "rgba(45,58,130,0.03)" },
  pubItemTop:    { flexDirection: "row", alignItems: "center", gap: 6 },
  tipoBadge: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tipoBadgeText: { fontSize: 10, fontWeight: "800" },
  pctBadge: {
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, marginLeft: "auto" as any,
  },
  pctBadgeText: { fontSize: 11, fontWeight: "800" },
  pubItemName: { fontSize: 13, fontWeight: "700", color: C.navy },
  pubItemMeta: {},
  pubItemMetaText: { fontSize: 11, color: C.muted },

  // ── Panel notas: header ───────────────────────────────────────
  detHeader: {
    flexDirection: "row",
    padding: 18,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(27,34,87,0.06)" } as any }),
  },
  detTitle: { fontSize: 15, fontWeight: "800", color: C.navy, flexShrink: 1 },

  // ── Barra de progreso ─────────────────────────────────────────
  progressBar: {
    height: 6, borderRadius: 3,
    backgroundColor: "#e8eaf4", overflow: "hidden",
  },
  progressFill:  { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 11, color: C.sub, fontWeight: "600" },

  // ── Fila de estudiante ────────────────────────────────────────
  estRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({ web: { boxShadow: "0 1px 6px rgba(27,34,87,0.07)" } as any }),
  },
  estAvatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5,
  },
  estAvatarText:  { fontWeight: "800", fontSize: 15 },
  estName:        { fontSize: 13, fontWeight: "700", color: C.navy },
  estEmail:       { fontSize: 11.5, color: C.sub },
  estFlags:       { flexDirection: "row", gap: 6, marginTop: 4 },
  flagPill: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  flagText: { fontSize: 10.5, fontWeight: "700" },
  estActions: { alignItems: "center", gap: 8 },
  notaBadge: {
    minWidth: 52, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
  },
  notaBadgeText: { fontSize: 16, fontWeight: "900" },
  actBtns:  { flexDirection: "row", gap: 6 },
  actBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  actBtnText: { fontSize: 11, fontWeight: "700" },

  // ── Shared ────────────────────────────────────────────────────
  center:    { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle:{ fontSize: 15, fontWeight: "700", color: C.navy, marginBottom: 4 },
  emptySub:  { fontSize: 12, color: C.muted, textAlign: "center", paddingHorizontal: 20 },
  backBtn: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.white,
  },
  backBtnText: { fontSize: 13, fontWeight: "700", color: C.navyMd },

  // ── Toast ─────────────────────────────────────────────────────
  toast: {
    position: "absolute", bottom: 36, alignSelf: "center",
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: 12, zIndex: 999,
    ...Platform.select({ web: { boxShadow: "0 4px 16px rgba(0,0,0,0.18)" } as any }),
  },
  toastText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

// ── Estilos de modal ──────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(10,15,40,0.55)",
    alignItems: "center", justifyContent: "center", padding: 20,
  },
  sheet: {
    backgroundColor: "#fff", borderRadius: 18,
    width: "100%", maxWidth: 420, maxHeight: "90%",
    ...Platform.select({ web: { boxShadow: "0 8px 40px rgba(0,0,0,0.18)" } as any }),
  },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#e4e8f4",
  },
  sheetTitle:  { fontSize: 16, fontWeight: "800", color: "#1b2257" },
  sheetSub:    { fontSize: 12, color: "#9099bb", marginTop: 2 },
  closeBtn:    { width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#f0f2f8", alignItems: "center", justifyContent: "center" },
  closeBtnText:{ fontSize: 12, color: "#7b85b0", fontWeight: "700" },
  body:        { padding: 20 },
  infoBanner: {
    backgroundColor: "rgba(91,141,238,0.08)", borderRadius: 10,
    borderWidth: 1, borderColor: "#5b8dee", padding: 10,
  },
  infoText:    { fontSize: 12.5, color: "#5b8dee", fontWeight: "600" },
  field:       { gap: 6, marginBottom: 12 },
  label:       { fontSize: 12.5, fontWeight: "600", color: "#7b85b0" },
  input: {
    backgroundColor: "#f6f7fb", borderRadius: 10,
    borderWidth: 1, borderColor: "#e4e8f4",
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#1b2257",
    ...Platform.select({ web: { outlineStyle: "none" } as any }),
  },
  errorBanner: {
    backgroundColor: "rgba(224,82,82,0.08)", borderRadius: 10,
    borderWidth: 1, borderColor: "#e05252", padding: 12, marginTop: 4,
  },
  errorText:   { fontSize: 13, color: "#e05252", fontWeight: "600" },
  footer: {
    flexDirection: "row", gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: "#e4e8f4",
  },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    backgroundColor: "#f0f2f8", alignItems: "center",
    borderWidth: 1, borderColor: "#e4e8f4",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: "#7b85b0" },
  saveBtn: {
    flex: 2, paddingVertical: 13, borderRadius: 10,
    backgroundColor: "#2d3a82", alignItems: "center",
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(27,34,87,0.2)", cursor: "pointer" } as any }),
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: "#fff", fontWeight: "700", fontSize: 15 },
});