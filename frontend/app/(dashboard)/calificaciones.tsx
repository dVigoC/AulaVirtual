// ── app/(dashboard)/calificaciones.tsx ───────────────────────────────────────
//  MÓDULO MIS CALIFICACIONES
//  Roles:
//    ESTUDIANTE → ve sus propias notas por curso
//    ADMIN / DOCENTE → (acceso bloqueado en el backend, pero la ruta existe
//                       en el menú de admin solo para pruebas; se puede omitir)
// ═════════════════════════════════════════════════════════════════════════════
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import {
    CalificacionItem,
    MisCalificacionesResponse,
    getMisCalificaciones,
} from "../../services/evaluacionApi";
import { PublicacionTipo } from "../../services/publicacionApi";

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

// ── Meta de tipos de publicación (solo los evaluables) ───────────────────────
const TIPO_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  TAREA:      { label: "Tarea",      color: C.info,   bg: "rgba(91,141,238,0.10)",  icon: "📝" },
  EVALUACION: { label: "Evaluación", color: C.purple, bg: "rgba(124,92,191,0.10)", icon: "📋" },
};

// ── Color de nota vigesimal (0–20) ───────────────────────────────────────────
function notaColor(nota: number | null): string {
  if (nota === null) return C.muted;
  if (nota >= 14) return C.success;
  if (nota >= 11) return C.orange;
  return C.danger;
}

function notaLabel(nota: number | null): string {
  if (nota === null) return "—";
  if (nota >= 18) return "Excelente";
  if (nota >= 14) return "Aprobado";
  if (nota >= 11) return "Regular";
  return "Desaprobado";
}

// ── Formatear fecha ISO ───────────────────────────────────────────────────────
function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtFechaHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ═════════════════════════════════════════════════════════════════════════════
//  Hook Toast (idéntico al resto del proyecto)
// ═════════════════════════════════════════════════════════════════════════════
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

// ═════════════════════════════════════════════════════════════════════════════
//  Modal: Detalle de una calificación
// ═════════════════════════════════════════════════════════════════════════════
function DetalleNotaModal({
  visible,
  item,
  docenteNombre,
  onClose,
}: {
  visible:       boolean;
  item:          CalificacionItem | null;
  docenteNombre: string | null;
  onClose:       () => void;
}) {
  if (!item) return null;
  const meta  = TIPO_META[item.tipo] ?? TIPO_META.TAREA;
  const nc    = notaColor(item.nota);
  const nl    = notaLabel(item.nota);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          {/* Header */}
          <View style={[ms.sheetHeader, { borderLeftWidth: 4, borderLeftColor: meta.color }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[ms.tipoBadge, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                  <Text style={ms.tipoBadgeIcon}>{meta.icon}</Text>
                  <Text style={[ms.tipoBadgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={ms.sheetTitle} numberOfLines={2}>
                {item.titulo ?? "Sin título"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Text style={ms.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={ms.body}>
            {/* Nota grande */}
            <View style={ms.notaHero}>
              <View style={[ms.notaCircle, { borderColor: nc, backgroundColor: `${nc}12` }]}>
                <Text style={[ms.notaCircleVal, { color: nc }]}>
                  {item.nota !== null ? Number(item.nota).toFixed(2) : "—"}
                </Text>
                <Text style={ms.notaCircleMax}>/20</Text>
              </View>
              <View style={[ms.notaLabelPill, { backgroundColor: `${nc}15`, borderColor: nc }]}>
                <Text style={[ms.notaLabelText, { color: nc }]}>{nl}</Text>
              </View>
            </View>

            {/* Detalles */}
            <View style={ms.infoGrid}>
              <View style={ms.infoItem}>
                <Text style={ms.infoItemLabel}>Docente</Text>
                <Text style={ms.infoItemValue}>{docenteNombre ?? "—"}</Text>
              </View>
              <View style={ms.infoItem}>
                <Text style={ms.infoItemLabel}>Fecha límite</Text>
                <Text style={ms.infoItemValue}>{fmtFechaHora(item.fechaLimite)}</Text>
              </View>
              <View style={ms.infoItem}>
                <Text style={ms.infoItemLabel}>Entrega</Text>
                <View style={[ms.entregaPill,
                  { backgroundColor: item.entregado ? "rgba(58,181,160,0.10)" : "rgba(224,82,82,0.08)",
                    borderColor: item.entregado ? C.success : C.danger }]}>
                  <Text style={[ms.entregaPillText,
                    { color: item.entregado ? C.success : C.danger }]}>
                    {item.entregado ? "✓ Entregado" : "✕ Sin entrega"}
                  </Text>
                </View>
              </View>
              {item.notaAt && (
                <View style={ms.infoItem}>
                  <Text style={ms.infoItemLabel}>Calificado el</Text>
                  <Text style={ms.infoItemValue}>{fmtFechaHora(item.notaAt)}</Text>
                </View>
              )}
            </View>

            {/* Comentario del docente */}
            {item.comentarioDocente ? (
              <View style={ms.comentarioBanner}>
                <Text style={ms.comentarioBannerLabel}>💬 Comentario del docente</Text>
                <Text style={ms.comentarioBannerText}>{item.comentarioDocente}</Text>
              </View>
            ) : (
              <View style={[ms.comentarioBanner, { backgroundColor: "#f6f7fb", borderColor: C.border }]}>
                <Text style={[ms.comentarioBannerLabel, { color: C.muted }]}>Sin comentarios del docente</Text>
              </View>
            )}
          </ScrollView>

          <View style={ms.footer}>
            <TouchableOpacity style={[ms.saveBtn, { flex: 1 }]} onPress={onClose}>
              <Text style={ms.saveBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  Componente: Card de un curso con sus calificaciones
// ═════════════════════════════════════════════════════════════════════════════
function CursoCalifCard({
  curso,
  onVerDetalle,
}: {
  curso:        MisCalificacionesResponse;
  onVerDetalle: (item: CalificacionItem) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const conNota     = curso.calificaciones.filter(c => c.nota !== null).length;
  const sinNota     = curso.calificaciones.length - conNota;
  const promedio    = curso.promedio;
  const pc          = notaColor(promedio ?? null);
  const totalItems  = curso.calificaciones.length;

  return (
    <View style={cs.card}>
      {/* Header del curso */}
      <TouchableOpacity
        style={cs.cardHeader}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.8}>
        <View style={cs.cursoIconWrap}>
          <Text style={cs.cursoIconText}>{curso.cursoCodigo.slice(0, 3)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={cs.cursoNombre} numberOfLines={1}>{curso.cursoNombre}</Text>
          <Text style={cs.cursoCodigo}>{curso.cursoCodigo}</Text>
          {curso.docenteNombre && (
            <Text style={cs.cursoDocente} numberOfLines={1}>
              👨‍🏫 {curso.docenteNombre}
            </Text>
          )}
        </View>

        {/* Promedio */}
        <View style={cs.promedioWrap}>
          {promedio !== null ? (
            <>
              <Text style={[cs.promedioVal, { color: pc }]}>
                {Number(promedio).toFixed(2)}
              </Text>
              <Text style={cs.promedioLabel}>promedio</Text>
            </>
          ) : (
            <>
              <Text style={[cs.promedioVal, { color: C.muted }]}>—</Text>
              <Text style={cs.promedioLabel}>sin notas</Text>
            </>
          )}
        </View>

        <Text style={[cs.chevron, { transform: [{ rotate: expanded ? "90deg" : "0deg" }] }]}>›</Text>
      </TouchableOpacity>

      {/* Resumen rápido */}
      {expanded && (
        <>
          <View style={cs.summaryRow}>
            <View style={cs.summaryItem}>
              <Text style={[cs.summaryNum, { color: C.navyMd }]}>{totalItems}</Text>
              <Text style={cs.summaryLabel}>publicaciones</Text>
            </View>
            <View style={cs.summaryDivider} />
            <View style={cs.summaryItem}>
              <Text style={[cs.summaryNum, { color: C.success }]}>{conNota}</Text>
              <Text style={cs.summaryLabel}>calificadas</Text>
            </View>
            <View style={cs.summaryDivider} />
            <View style={cs.summaryItem}>
              <Text style={[cs.summaryNum, { color: sinNota > 0 ? C.muted : C.success }]}>
                {sinNota}
              </Text>
              <Text style={cs.summaryLabel}>pendientes</Text>
            </View>
          </View>

          {/* Barra de progreso */}
          {totalItems > 0 && (
            <View style={cs.progressWrap}>
              <View style={cs.progressBg}>
                <View style={[cs.progressFill, {
                  width: `${Math.round((conNota / totalItems) * 100)}%` as any,
                  backgroundColor: conNota === totalItems ? C.success : C.navyMd,
                }]} />
              </View>
              <Text style={cs.progressLabel}>
                {Math.round((conNota / totalItems) * 100)}% calificado
              </Text>
            </View>
          )}

          {/* Lista de calificaciones */}
          {curso.calificaciones.length === 0 ? (
            <View style={cs.emptyItems}>
              <Text style={cs.emptyItemsText}>
                📋 No hay tareas ni evaluaciones publicadas aún.
              </Text>
            </View>
          ) : (
            <View style={cs.itemsList}>
              {curso.calificaciones.map(item => {
                const meta = TIPO_META[item.tipo] ?? TIPO_META.TAREA;
                const nc   = notaColor(item.nota);
                const isVencida = item.fechaLimite
                  ? new Date(item.fechaLimite) < new Date() && !item.entregado
                  : false;

                return (
                  <TouchableOpacity
                    key={item.publicacionId}
                    style={cs.itemRow}
                    onPress={() => onVerDetalle(item)}
                    activeOpacity={0.78}>

                    {/* Tipo badge */}
                    <View style={[cs.itemTypeDot, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                      <Text style={cs.itemTypeDotIcon}>{meta.icon}</Text>
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={cs.itemTitulo} numberOfLines={1}>
                        {item.titulo ?? "Sin título"}
                      </Text>
                      <View style={cs.itemMeta}>
                        <View style={[cs.tipoMiniPill, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                          <Text style={[cs.tipoMiniText, { color: meta.color }]}>{meta.label}</Text>
                        </View>

                        {item.fechaLimite && (
                          <Text style={[cs.itemFecha, isVencida && { color: C.danger }]}>
                            ⏰ {fmtFecha(item.fechaLimite)}
                          </Text>
                        )}

                        <View style={[cs.entregaPill,
                          { backgroundColor: item.entregado
                              ? "rgba(58,181,160,0.10)" : "rgba(224,82,82,0.08)",
                            borderColor: item.entregado ? C.success : C.danger }]}>
                          <Text style={[cs.entregaPillText,
                            { color: item.entregado ? C.success : C.danger }]}>
                            {item.entregado ? "✓" : "✕"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Nota */}
                    <View style={[cs.notaBadge, { borderColor: nc, backgroundColor: `${nc}12` }]}>
                      <Text style={[cs.notaBadgeVal, { color: nc }]}>
                        {item.nota !== null ? Number(item.nota).toFixed(2) : "—"}
                      </Text>
                    </View>

                    <Text style={cs.chevronSmall}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════
export default function MisCalificaciones() {
  const { user } = useAuth();
  const { show: toast, Toast } = useToast();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [cursos,      setCursos]      = useState<MisCalificacionesResponse[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filtroTipo,  setFiltroTipo]  = useState<PublicacionTipo | "TODOS">("TODOS");

  // Modal detalle
  const [modalItem,   setModalItem]   = useState<CalificacionItem | null>(null);
  const [modalDocente,setModalDocente]= useState<string | null>(null);

  // ── Carga ─────────────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    getMisCalificaciones()
      .then(({ data }) => { if (active) setCursos(data); })
      .catch(() => { if (active) toast("No se pudieron cargar las calificaciones.", "error"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  // ── Estadísticas globales ─────────────────────────────────────────────────
  const totalPubs    = cursos.reduce((a, c) => a + c.calificaciones.length, 0);
  const totalNota    = cursos.reduce((a, c) => a + c.calificaciones.filter(x => x.nota !== null).length, 0);
  const totalEntrega = cursos.reduce((a, c) => a + c.calificaciones.filter(x => x.entregado).length, 0);

  // Promedio global de todos los cursos con nota
  const promedioGlobal: number | null = (() => {
    const todas = cursos.flatMap(c => c.calificaciones.filter(x => x.nota !== null).map(x => x.nota!));
    if (todas.length === 0) return null;
    return todas.reduce((a, b) => a + b, 0) / todas.length;
  })();

  const pgColor = notaColor(promedioGlobal);

  // ── Abrir detalle ─────────────────────────────────────────────────────────
  const verDetalle = (item: CalificacionItem, docente: string | null) => {
    setModalItem(item);
    setModalDocente(docente);
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <Toast />

      <DetalleNotaModal
        visible={!!modalItem}
        item={modalItem}
        docenteNombre={modalDocente}
        onClose={() => { setModalItem(null); setModalDocente(null); }}
      />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.navyMd} />
          <Text style={s.loadingText}>Cargando calificaciones...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* ── HEADER ── */}
          <View style={s.pageHeader}>
            <View>
              <Text style={s.pageTitle}>Mis Calificaciones</Text>
              <Text style={s.pageSub}>
                {cursos.length} curso{cursos.length !== 1 ? "s" : ""} · Periodo activo
              </Text>
            </View>
            {promedioGlobal !== null && (
              <View style={[s.globalPromedio, { borderColor: pgColor, backgroundColor: `${pgColor}12` }]}>
                <Text style={[s.globalPromedioVal, { color: pgColor }]}>
                  {promedioGlobal.toFixed(2)}
                </Text>
                <Text style={[s.globalPromedioLabel, { color: pgColor }]}>promedio global</Text>
              </View>
            )}
          </View>

          {/* ── TARJETAS DE RESUMEN ── */}
          <View style={[s.statsRow, isMobile && { flexWrap: "wrap" }]}>
            {[
              { label: "Publicaciones",  val: totalPubs,    color: C.navyMd, icon: "📋" },
              { label: "Calificadas",    val: totalNota,    color: C.success, icon: "★" },
              { label: "Entregadas",     val: totalEntrega, color: C.info,    icon: "📤" },
              { label: "Cursos",         val: cursos.length,color: C.purple,  icon: "📚" },
            ].map(stat => (
              <View key={stat.label}
                style={[s.statCard, isMobile && { width: "48%" as any }]}>
                <Text style={s.statIcon}>{stat.icon}</Text>
                <Text style={[s.statVal, { color: stat.color }]}>{stat.val}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* ── CURSOS ── */}
          {cursos.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>📚</Text>
              <Text style={s.emptyTitle}>Sin calificaciones aún</Text>
              <Text style={s.emptySub}>
                Cuando el docente registre tus notas, aparecerán aquí.
              </Text>
            </View>
          ) : (
            cursos.map(curso => (
              <CursoCalifCard
                key={curso.cursoId}
                curso={curso}
                onVerDetalle={item => verDetalle(item, curso.docenteNombre)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  ESTILOS PRINCIPALES
// ═════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },

  center:      { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: C.muted, fontSize: 13, marginTop: 10 },

  // ── Header de página ──────────────────────────────────────────────
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 24,
    paddingBottom: 8,
    flexWrap: "wrap",
    gap: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: "800", color: C.navy },
  pageSub:   { fontSize: 13, color: C.muted, marginTop: 2 },

  globalPromedio: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
  },
  globalPromedioVal: {
    fontSize: 28,
    fontWeight: "900",
  },
  globalPromedioLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 1,
  },

  // ── Stats row ─────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(27,34,87,0.07)" } as any,
    }),
  },
  statIcon:  { fontSize: 20 },
  statVal:   { fontSize: 22, fontWeight: "900" },
  statLabel: { fontSize: 10.5, color: C.muted, fontWeight: "600", textAlign: "center" },

  // ── Empty ─────────────────────────────────────────────────────────
  emptyBox: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyIcon:  { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.navy, marginBottom: 6 },
  emptySub:   { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

  // ── Toast ─────────────────────────────────────────────────────────
  toast: {
    position: "absolute", bottom: 36, alignSelf: "center",
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: 12, zIndex: 999,
    ...Platform.select({ web: { boxShadow: "0 4px 16px rgba(0,0,0,0.18)" } as any }),
  },
  toastText: { color: C.white, fontWeight: "700", fontSize: 13 },
});

// ═════════════════════════════════════════════════════════════════════════════
//  ESTILOS: Card de curso
// ═════════════════════════════════════════════════════════════════════════════
const cs = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: {
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.09,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
      web: { boxShadow: "0 3px 16px rgba(27,34,87,0.09)" } as any,
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: C.white,
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  cursoIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "rgba(45,58,130,0.10)",
    borderWidth: 1.5,
    borderColor: C.navyMd,
    alignItems: "center",
    justifyContent: "center",
  },
  cursoIconText:  { fontSize: 10, fontWeight: "900", color: C.navyMd, letterSpacing: 0.3 },
  cursoNombre:    { fontSize: 14, fontWeight: "800", color: C.navy },
  cursoCodigo:    { fontSize: 10.5, color: C.muted, fontWeight: "600", letterSpacing: 0.5, marginTop: 1 },
  cursoDocente:   { fontSize: 11, color: C.sub, marginTop: 3 },
  promedioWrap:   { alignItems: "center", minWidth: 56 },
  promedioVal:    { fontSize: 20, fontWeight: "900" },
  promedioLabel:  { fontSize: 9, color: C.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  chevron: {
    fontSize: 22,
    color: C.muted,
    fontWeight: "300",
    marginLeft: 2,
  },

  // Resumen
  summaryRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fafbfd",
  },
  summaryItem:    { flex: 1, alignItems: "center" },
  summaryNum:     { fontSize: 18, fontWeight: "800" },
  summaryLabel:   { fontSize: 10, color: C.muted, fontWeight: "600", marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },

  // Progreso
  progressWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#fafbfd",
    gap: 4,
  },
  progressBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#e8eaf4",
    overflow: "hidden",
  },
  progressFill:  { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 10, color: C.sub, fontWeight: "600" },

  // Items lista
  itemsList: { borderTopWidth: 1, borderTopColor: C.border },
  emptyItems: {
    padding: 18,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  emptyItemsText: { fontSize: 12.5, color: C.muted, fontWeight: "500" },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f8",
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  itemTypeDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  itemTypeDotIcon: { fontSize: 16 },

  itemTitulo: { fontSize: 13, fontWeight: "700", color: C.navy, marginBottom: 5 },
  itemMeta:   { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },

  tipoMiniPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tipoMiniText: { fontSize: 9.5, fontWeight: "800" },

  itemFecha: { fontSize: 10.5, color: C.sub, fontWeight: "500" },

  entregaPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  entregaPillText: { fontSize: 9.5, fontWeight: "800" },

  notaBadge: {
    minWidth: 52,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  notaBadgeVal: { fontSize: 15, fontWeight: "900" },
  chevronSmall: { fontSize: 18, color: C.muted, fontWeight: "300" },
});

// ═════════════════════════════════════════════════════════════════════════════
//  ESTILOS: Modal
// ═════════════════════════════════════════════════════════════════════════════
const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,15,40,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    backgroundColor: C.white,
    borderRadius: 18,
    width: "100%",
    maxWidth: 420,
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
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  sheetTitle:  { fontSize: 15, fontWeight: "800", color: C.navy, marginTop: 6 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#f0f2f8", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  closeBtnText: { fontSize: 12, color: C.sub, fontWeight: "700" },

  tipoBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: "flex-start",
  },
  tipoBadgeIcon: { fontSize: 11 },
  tipoBadgeText: { fontSize: 10.5, fontWeight: "800" },

  body: { padding: 20 },

  // Nota hero
  notaHero: { alignItems: "center", gap: 10, marginBottom: 22 },
  notaCircle: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 3,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row",
    gap: 2,
  },
  notaCircleVal: { fontSize: 36, fontWeight: "900" },
  notaCircleMax: { fontSize: 14, color: C.muted, fontWeight: "600", alignSelf: "flex-end", marginBottom: 8 },
  notaLabelPill: {
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 5,
  },
  notaLabelText: { fontSize: 13, fontWeight: "800" },

  // Info grid
  infoGrid: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    overflow: "hidden", marginBottom: 14,
  },
  infoItem: {
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: "#f0f2f8",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  infoItemLabel: { fontSize: 12, color: C.muted, fontWeight: "600" },
  infoItemValue: { fontSize: 13, color: C.navy, fontWeight: "600", flexShrink: 1, marginLeft: 12, textAlign: "right" },
  entregaPill: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  entregaPillText: { fontSize: 11, fontWeight: "700" },

  // Comentario
  comentarioBanner: {
    borderWidth: 1, borderRadius: 12,
    borderColor: "rgba(45,58,130,0.18)",
    backgroundColor: "rgba(45,58,130,0.04)",
    padding: 14, gap: 6,
  },
  comentarioBannerLabel: { fontSize: 11.5, fontWeight: "700", color: C.navyMd },
  comentarioBannerText:  { fontSize: 13, color: C.navy, lineHeight: 20 },

  footer: {
    flexDirection: "row", gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  saveBtn: {
    paddingVertical: 13, borderRadius: 10, backgroundColor: C.navyMd, alignItems: "center",
    ...Platform.select({
      web: { boxShadow: "0 2px 8px rgba(27,34,87,0.2)", cursor: "pointer" } as any,
    }),
  },
  saveBtnText: { color: C.white, fontWeight: "700", fontSize: 15 },
});