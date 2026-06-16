// ── app/(dashboard)/limpieza.tsx ─────────────────────────────────────────────
//  Módulo admin: limpieza de datos por período académico.
//  Solo accesible para ADMIN.
// ─────────────────────────────────────────────────────────────────────────────
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import {
    LimpiezaPreview,
    LimpiezaResultado,
    eliminarPeriodo,
    getLimpiezaPreview,
    getPeriodosDisponibles,
} from "../../services/limpiezaApi";

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  navy: "#1b2257",
  navyMd: "#2d3a82",
  bg: "#f0f2f8",
  white: "#ffffff",
  muted: "#9099bb",
  sub: "#7b85b0",
  border: "#e4e8f4",
  danger: "#e05252",
  dangerBg: "rgba(224,82,82,0.08)",
  dangerBorder: "rgba(224,82,82,0.30)",
  success: "#3ab5a0",
  successBg: "rgba(58,181,160,0.08)",
  warning: "#e8a020",
  warningBg: "rgba(232,160,32,0.08)",
  warningBorder: "rgba(232,160,32,0.30)",
  info: "#5b8dee",
  infoBg: "rgba(91,141,238,0.08)",
};

// ── Tipos de paso ─────────────────────────────────────────────────────────────
type Paso = "seleccionar" | "preview" | "confirmar" | "resultado";

// ══════════════════════════════════════════════════════════════════════════════
export default function LimpiezaModule() {
  const { user } = useAuth();

  // Redirigir si no es ADMIN (doble protección)
  if (user?.role !== "ADMIN") {
    return (
      <View style={s.center}>
        <Text style={s.errorTitle}>Acceso denegado</Text>
        <Text style={s.errorSub}>
          Solo el administrador puede acceder aquí.
        </Text>
      </View>
    );
  }

  // ── Estado ─────────────────────────────────────────────────────────────────
  const [paso, setPaso] = useState<Paso>("seleccionar");
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string | null>(
    null,
  );
  const [preview, setPreview] = useState<LimpiezaPreview | null>(null);
  const [resultado, setResultado] = useState<LimpiezaResultado | null>(null);

  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingEliminar, setLoadingEliminar] = useState(false);
  const [error, setError] = useState("");

  // ── Cargar períodos al entrar ──────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoadingPeriodos(true);
      setError("");
      getPeriodosDisponibles()
        .then(({ data }) => {
          if (activo) setPeriodos(data);
        })
        .catch(() => {
          if (activo) setError("No se pudieron cargar los períodos.");
        })
        .finally(() => {
          if (activo) setLoadingPeriodos(false);
        });
      return () => {
        activo = false;
      };
    }, []),
  );

  // ── Seleccionar período y cargar preview ───────────────────────────────────
  const handleSeleccionarPeriodo = async (periodo: string) => {
    setPeriodoSeleccionado(periodo);
    setPreview(null);
    setError("");
    setLoadingPreview(true);
    setPaso("preview");
    try {
      const { data } = await getLimpiezaPreview(periodo);
      setPreview(data);
    } catch {
      setError("No se pudo cargar la vista previa.");
      setPaso("seleccionar");
    } finally {
      setLoadingPreview(false);
    }
  };

  // ── Confirmar eliminación ──────────────────────────────────────────────────
  const handleEliminar = async () => {
    if (!periodoSeleccionado) return;

    // Confirmación en web
    if (Platform.OS === "web") {
      const ok = window.confirm(
        `⚠ ¿Estás SEGURO de eliminar TODO el período ${periodoSeleccionado}?\n\nEsta acción es IRREVERSIBLE.\nSe eliminarán publicaciones, entregas, clases, asistencias, matrículas y archivos de Storage.`,
      );
      if (!ok) return;
    }

    setLoadingEliminar(true);
    setError("");
    try {
      const { data } = await eliminarPeriodo(periodoSeleccionado);
      setResultado(data);
      setPaso("resultado");
      // Recargar períodos disponibles
      const { data: nuevos } = await getPeriodosDisponibles();
      setPeriodos(nuevos);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? "No se pudo completar la eliminación.",
      );
    } finally {
      setLoadingEliminar(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetear = () => {
    setPaso("seleccionar");
    setPeriodoSeleccionado(null);
    setPreview(null);
    setResultado(null);
    setError("");
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* ── Cabecera ── */}
      <View style={s.header}>
        <View style={s.headerIcon}>
          <Text style={s.headerIconText}>🗑</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Limpieza de períodos</Text>
          <Text style={s.headerSub}>
            Elimina publicaciones, archivos, clases y matrículas de un período
            académico completo.
          </Text>
        </View>
      </View>

      {/* ── Banner de advertencia ── */}
      <View style={s.warnBanner}>
        <Text style={s.warnIcon}>⚠</Text>
        <Text style={s.warnText}>
          Esta acción es <Text style={{ fontWeight: "800" }}>irreversible</Text>
          . Los archivos de Supabase Storage también serán eliminados
          permanentemente.
        </Text>
      </View>

      {/* ── Error global ── */}
      {error ? (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>✕ {error}</Text>
        </View>
      ) : null}

      {/* ══════════════════════════════════════════════════
          PASO 1: Seleccionar período
      ══════════════════════════════════════════════════ */}
      {(paso === "seleccionar" || paso === "preview") && (
        <View style={s.card}>
          <Text style={s.cardTitle}>1. Selecciona el período a eliminar</Text>

          {loadingPeriodos ? (
            <View style={s.loaderBox}>
              <ActivityIndicator color={C.navyMd} />
              <Text style={s.loaderText}>Cargando períodos...</Text>
            </View>
          ) : periodos.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>📭</Text>
              <Text style={s.emptyText}>
                No hay períodos con datos registrados.
              </Text>
            </View>
          ) : (
            <View style={s.periodosGrid}>
              {periodos.map((p) => {
                const activo = periodoSeleccionado === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[s.periodoPill, activo && s.periodoPillActive]}
                    onPress={() => handleSeleccionarPeriodo(p)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        s.periodoPillText,
                        activo && s.periodoPillTextActive,
                      ]}
                    >
                      📅 {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════
          PASO 2: Vista previa
      ══════════════════════════════════════════════════ */}
      {paso === "preview" && (
        <View style={s.card}>
          <Text style={s.cardTitle}>
            2. Vista previa — {periodoSeleccionado}
          </Text>
          <Text style={s.cardSub}>
            Esto es lo que se eliminará al confirmar:
          </Text>

          {loadingPreview ? (
            <View style={s.loaderBox}>
              <ActivityIndicator color={C.navyMd} />
              <Text style={s.loaderText}>Calculando...</Text>
            </View>
          ) : preview ? (
            <>
              {/* Tabla de resumen */}
              <View style={s.statsGrid}>
                <StatItem
                  icon="📢"
                  label="Publicaciones"
                  value={preview.totalPublicaciones}
                  color={C.info}
                />
                <StatItem
                  icon="📤"
                  label="Entregas"
                  value={preview.totalEntregas}
                  color={C.warning}
                />
                <StatItem
                  icon="🖼"
                  label="Portadas"
                  value={preview.totalPortadas}
                  color="#7c5cbf"
                />
                <StatItem
                  icon="📅"
                  label="Clases"
                  value={preview.totalClases}
                  color={C.success}
                />
                <StatItem
                  icon="✅"
                  label="Asistencias"
                  value={preview.totalAsistencias}
                  color={C.success}
                />
                <StatItem
                  icon="👤"
                  label="Matrículas"
                  value={preview.totalMatriculas}
                  color={C.navyMd}
                />
              </View>

              {/* Total archivos Storage */}
              <View style={s.storageBanner}>
                <Text style={s.storageIcon}>☁</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.storageTitle}>
                    {preview.totalArchivosStorage} archivos en Supabase Storage
                  </Text>
                  <Text style={s.storageSub}>
                    Imágenes, documentos y videos subidos durante este período.
                  </Text>
                </View>
              </View>

              {/* Botón confirmar */}
              <TouchableOpacity
                style={[s.btnDanger, loadingEliminar && s.btnDisabled]}
                onPress={() => setPaso("confirmar")}
                disabled={loadingEliminar}
              >
                <Text style={s.btnDangerText}>
                  Continuar con la eliminación →
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.btnSecondary} onPress={resetear}>
                <Text style={s.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      )}

      {/* ══════════════════════════════════════════════════
          PASO 3: Confirmación final
      ══════════════════════════════════════════════════ */}
      {paso === "confirmar" && preview && (
        <View style={[s.card, s.cardDanger]}>
          <Text style={s.confirmTitle}>⚠ Confirmación final</Text>
          <Text style={s.confirmText}>
            Vas a eliminar{" "}
            <Text style={{ fontWeight: "800" }}>permanentemente</Text> todos los
            datos del período{" "}
            <Text style={{ fontWeight: "800", color: C.danger }}>
              {periodoSeleccionado}
            </Text>
            :
          </Text>

          <View style={s.confirmList}>
            <Text style={s.confirmItem}>
              • {preview.totalPublicaciones} publicaciones
            </Text>
            <Text style={s.confirmItem}>
              • {preview.totalEntregas} entregas de estudiantes
            </Text>
            <Text style={s.confirmItem}>
              • {preview.totalClases} clases y {preview.totalAsistencias}{" "}
              registros de asistencia
            </Text>
            <Text style={s.confirmItem}>
              • {preview.totalMatriculas} matrículas
            </Text>
            <Text style={s.confirmItem}>
              • {preview.totalArchivosStorage} archivos de Storage
            </Text>
          </View>

          <Text
            style={[
              s.confirmText,
              { marginTop: 8, color: C.danger, fontWeight: "700" },
            ]}
          >
            Esta acción NO se puede deshacer.
          </Text>

          <TouchableOpacity
            style={[s.btnDangerSolid, loadingEliminar && s.btnDisabled]}
            onPress={handleEliminar}
            disabled={loadingEliminar}
          >
            {loadingEliminar ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnDangerSolidText}>
                🗑 Sí, eliminar todo el período {periodoSeleccionado}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.btnSecondary}
            onPress={() => setPaso("preview")}
            disabled={loadingEliminar}
          >
            <Text style={s.btnSecondaryText}>← Volver</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ══════════════════════════════════════════════════
          PASO 4: Resultado
      ══════════════════════════════════════════════════ */}
      {paso === "resultado" && resultado && (
        <View style={[s.card, s.cardSuccess]}>
          <View style={s.resultHeader}>
            <Text style={s.resultIcon}>✅</Text>
            <Text style={s.resultTitle}>Limpieza completada</Text>
          </View>
          <Text style={s.resultSub}>
            El período{" "}
            <Text style={{ fontWeight: "800" }}>{resultado.periodo}</Text> fue
            eliminado correctamente.
          </Text>

          <View style={s.statsGrid}>
            <StatItem
              icon="📢"
              label="Publicaciones"
              value={resultado.publicacionesEliminadas}
              color={C.info}
            />
            <StatItem
              icon="📤"
              label="Entregas"
              value={resultado.entregasEliminadas}
              color={C.warning}
            />
            <StatItem
              icon="🖼"
              label="Portadas"
              value={resultado.portadasEliminadas}
              color="#7c5cbf"
            />
            <StatItem
              icon="📅"
              label="Clases"
              value={resultado.clasesEliminadas}
              color={C.success}
            />
            <StatItem
              icon="✅"
              label="Asistencias"
              value={resultado.asistenciasEliminadas}
              color={C.success}
            />
            <StatItem
              icon="👤"
              label="Matrículas"
              value={resultado.matriculasEliminadas}
              color={C.navyMd}
            />
          </View>

          <View style={s.storageBanner}>
            <Text style={s.storageIcon}>☁</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.storageTitle}>
                {resultado.archivosStorageEliminados} archivos eliminados de
                Storage
              </Text>
              {resultado.archivosStorageFallidos > 0 && (
                <Text style={[s.storageSub, { color: C.warning }]}>
                  ⚠ {resultado.archivosStorageFallidos} archivos no se pudieron
                  eliminar (ya no existían o error de red).
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity style={s.btnPrimary} onPress={resetear}>
            <Text style={s.btnPrimaryText}>Limpiar otro período</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ── Sub-componente: stat card ──────────────────────────────────────────────────
function StatItem({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[ss.item, { borderColor: color + "33" }]}>
      <Text style={ss.icon}>{icon}</Text>
      <Text style={[ss.value, { color }]}>{value}</Text>
      <Text style={ss.label}>{label}</Text>
    </View>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, gap: 16, paddingBottom: 40 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.danger,
    marginBottom: 8,
  },
  errorSub: { fontSize: 14, color: C.muted, textAlign: "center" },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      web: { boxShadow: "0 2px 12px rgba(27,34,87,0.08)" } as any,
    }),
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconText: { fontSize: 22 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.navy,
    marginBottom: 4,
  },
  headerSub: { fontSize: 13, color: C.sub, lineHeight: 19 },

  // ── Banners ───────────────────────────────────────────────────────────────
  warnBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: C.warningBg,
    borderWidth: 1,
    borderColor: C.warningBorder,
    borderRadius: 12,
    padding: 14,
  },
  warnIcon: { fontSize: 16, marginTop: 1 },
  warnText: { flex: 1, fontSize: 13, color: "#a06010", lineHeight: 19 },

  errorBanner: {
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    borderRadius: 12,
    padding: 14,
  },
  errorText: { fontSize: 13, color: C.danger, fontWeight: "600" },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      web: { boxShadow: "0 2px 12px rgba(27,34,87,0.08)" } as any,
    }),
  },
  cardDanger: {
    borderColor: C.dangerBorder,
    backgroundColor: "#fff8f8",
  },
  cardSuccess: {
    borderColor: "rgba(58,181,160,0.30)",
    backgroundColor: "#f8fffd",
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: C.navy },
  cardSub: { fontSize: 13, color: C.sub, marginTop: -8 },

  // ── Períodos grid ─────────────────────────────────────────────────────────
  periodosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  periodoPill: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f6f7fb",
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  periodoPillActive: {
    borderColor: C.navyMd,
    backgroundColor: "rgba(45,58,130,0.08)",
  },
  periodoPillText: { fontSize: 14, fontWeight: "600", color: C.sub },
  periodoPillTextActive: { color: C.navyMd },

  // ── Stats grid ────────────────────────────────────────────────────────────
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  // ── Storage banner ────────────────────────────────────────────────────────
  storageBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.infoBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(91,141,238,0.25)",
    padding: 14,
  },
  storageIcon: { fontSize: 22 },
  storageTitle: { fontSize: 14, fontWeight: "700", color: C.navy },
  storageSub: { fontSize: 12, color: C.sub, marginTop: 2 },

  // ── Confirmación ──────────────────────────────────────────────────────────
  confirmTitle: { fontSize: 16, fontWeight: "800", color: C.danger },
  confirmText: { fontSize: 13, color: C.navy, lineHeight: 20 },
  confirmList: { gap: 4, paddingLeft: 4 },
  confirmItem: { fontSize: 13, color: C.sub },

  // ── Resultado ─────────────────────────────────────────────────────────────
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  resultIcon: { fontSize: 28 },
  resultTitle: { fontSize: 17, fontWeight: "800", color: C.success },
  resultSub: { fontSize: 13, color: C.sub, lineHeight: 19 },

  // ── Botones ───────────────────────────────────────────────────────────────
  btnDanger: {
    borderWidth: 2,
    borderColor: C.danger,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: C.dangerBg,
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  btnDangerText: { fontSize: 14, fontWeight: "700", color: C.danger },

  btnDangerSolid: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: C.danger,
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(224,82,82,0.3)",
        cursor: "pointer",
      } as any,
    }),
  },
  btnDangerSolidText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  btnPrimary: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: C.navyMd,
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  btnPrimaryText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  btnSecondary: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f0f2f8",
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  btnSecondaryText: { fontSize: 14, fontWeight: "600", color: C.sub },

  btnDisabled: { opacity: 0.5 },

  // ── Estados vacíos / loader ───────────────────────────────────────────────
  loaderBox: { alignItems: "center", paddingVertical: 20, gap: 8 },
  loaderText: { fontSize: 13, color: C.muted },
  emptyBox: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 13, color: C.muted, textAlign: "center" },
});

const ss = StyleSheet.create({
  item: {
    flex: 1,
    minWidth: 90,
    alignItems: "center",
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 4,
  },
  icon: { fontSize: 18 },
  value: { fontSize: 22, fontWeight: "800" },
  label: {
    fontSize: 11,
    color: "#9099bb",
    fontWeight: "600",
    textAlign: "center",
  },
});
