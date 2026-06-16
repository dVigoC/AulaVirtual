// ── app/(dashboard)/inicio.tsx (usado desde admin.tsx / docente.tsx / estudiante.tsx)
// ══════════════════════════════════════════════════════════════════════════════
//  MÓDULO INICIO — Aula Virtual
//  Roles: ADMIN (ve todo), DOCENTE (gestiona), ESTUDIANTE (consume)
// ══════════════════════════════════════════════════════════════════════════════
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking, // ← NUEVO: para abrir URLs nativas
  Modal,
  Platform,
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
  CursoInicioResponse,
  EntregaResponse,
  PublicacionResponse,
  PublicacionTipo,
  crearEntrega,
  createPublicacion,
  deletePublicacion,
  getCursosInicio,
  getEntregas,
  getPublicaciones,
  updatePermisoTardio,
  updatePortada,
} from "../../services/publicacionApi";
import { uploadArchivo } from "../../utils/uploadArchivo";

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
  info: "#5b8dee",
};

// ── Calcular semestre en el frontend (igual que el backend) ───────────────────
function calcularPeriodo(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return `${year}-${month <= 6 ? "I" : "II"}`;
}

// ── Saludo por hora ───────────────────────────────────────────────────────────
function getSaludo(): string {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 18 ? "Buenas tardes" : "Buenas noches";
}

// ── Meta de tipos de publicación ──────────────────────────────────────────────
const TIPO_META: Record<
  PublicacionTipo,
  { label: string; icon: string; color: string; bg: string }
> = {
  CLASE_VIRTUAL: {
    label: "Clase Virtual",
    icon: "🎥",
    color: "#5b8dee",
    bg: "rgba(91,141,238,0.10)",
  },
  TAREA: {
    label: "Tarea",
    icon: "📝",
    color: "#e8a020",
    bg: "rgba(232,160,32,0.10)",
  },
  MATERIAL_CLASE: {
    label: "Material de Clase",
    icon: "📚",
    color: "#3ab5a0",
    bg: "rgba(58,181,160,0.10)",
  },
  EVALUACION: {
    label: "Evaluación",
    icon: "📋",
    color: "#e05252",
    bg: "rgba(224,82,82,0.10)",
  },
  ANUNCIO_GENERAL: {
    label: "Anuncio General",
    icon: "📢",
    color: "#7c5cbf",
    bg: "rgba(124,92,191,0.10)",
  },
  CONTENIDO_INMEDIATO: {
    label: "Contenido Inmediato",
    icon: "⚡",
    color: "#e8a020",
    bg: "rgba(232,160,32,0.10)",
  },
};

// ── Colores de tarjetas de cursos (rotativo) ──────────────────────────────────
const CARD_COLORS = [
  "#2d3a82",
  "#3ab5a0",
  "#7c5cbf",
  "#e8a020",
  "#5b8dee",
  "#e05252",
];

// ══════════════════════════════════════════════════════════════════════════════
//  Helper: abrir URL (descarga o enlace)
//  — En web usa <a download> para archivos de Storage, window.open para links
//  — En nativo usa Linking.openURL
// ══════════════════════════════════════════════════════════════════════════════
async function abrirUrl(url: string, nombre?: string | null) {
  if (!url) return;

  if (Platform.OS === "web") {
    // Si es un archivo de Storage (no un link de video/externo) y tenemos nombre,
    // descargamos como blob para forzar el nombre original sin el prefijo timestamp
    if (nombre && url.includes("supabase")) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = nombre; // ← nombre limpio, sin timestamp
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl); // libera memoria
      } catch {
        // fallback: abrir directo si el fetch falla (CORS, etc.)
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } else {
      // Links externos (YouTube, Meet, etc.) — solo abrir
      window.open(url, "_blank", "noopener,noreferrer");
    }
  } else {
    Linking.openURL(url).catch(() => {
      console.warn("No se pudo abrir la URL:", url);
    });
  }
}
// ══════════════════════════════════════════════════════════════════════════════
//  Hook Toast
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
            ts.toast,
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
          <Text style={ts.toastText}>
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
//  MODAL: Portada del curso
// ══════════════════════════════════════════════════════════════════════════════
function PortadaModal({
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
  onSaved: (url: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<any>(null);

  const reset = () => {
    setUrl("");
    setPreviewUrl("");
    setError("");
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes (JPG, PNG, WEBP).");
      return;
    }
    try {
      setUploading(true);
      setError("");
      const { url } = await uploadArchivo(file, "portadas", cursoId);
      setPreviewUrl(url);
      setUrl(url);
    } catch (error) {
      console.error(" Error real al subir el archivo:", error);
      setError("No se pudo subir la imagen. Intenta con una URL.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleSave = async () => {
    if (!url.trim()) {
      setError("Selecciona una imagen o ingresa una URL válida.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updatePortada(cursoId, url.trim());
      onSaved(url.trim());
      reset();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "No se pudo guardar la portada.");
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
              <Text style={ms.sheetTitle}>Portada del curso</Text>
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

          <ScrollView style={ms.body}>
            {error ? (
              <View style={ms.errorBanner}>
                <Text style={ms.errorText}>✕ {error}</Text>
              </View>
            ) : null}

            {Platform.OS === "web" && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFile(file);
                }}
              />
            )}

            <TouchableOpacity
              style={[ms.dropZone, dragging && ms.dropZoneActive]}
              activeOpacity={0.8}
              disabled={uploading}
              onPress={() => {
                if (Platform.OS === "web" && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              onPressIn={() => setDragging(true)}
              onPressOut={() => setDragging(false)}
              {...(Platform.OS === "web"
                ? {
                    onDrop: handleDrop,
                    onDragOver: handleDragOver,
                    onDragLeave: handleDragLeave,
                  }
                : {})}
            >
              {uploading ? (
                <>
                  <ActivityIndicator color={C.navyMd} />
                  <Text style={ms.dropTitle}>Subiendo imagen...</Text>
                  <Text style={ms.dropSub}>Por favor espera...</Text>
                </>
              ) : (
                <>
                  <Text style={ms.dropIcon}>🖼️</Text>
                  <Text style={ms.dropTitle}>
                    {previewUrl
                      ? "Imagen seleccionada ✓"
                      : "Arrastra una imagen aquí"}
                  </Text>
                  <Text style={ms.dropSub}>o haz clic para seleccionar</Text>
                  <View style={ms.dropBadge}>
                    <Text style={ms.dropBadgeText}>JPG · PNG · WEBP</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            <View style={ms.dividerRow}>
              <View style={ms.dividerLine} />
              <Text style={ms.dividerText}>o pega una URL</Text>
              <View style={ms.dividerLine} />
            </View>

            <View style={ms.field}>
              <Text style={ms.label}>URL de la imagen</Text>
              <TextInput
                style={ms.input}
                value={url}
                onChangeText={(v) => {
                  setUrl(v);
                  setPreviewUrl("");
                }}
                placeholder="https://..."
                placeholderTextColor={C.muted}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {previewUrl || url.trim() ? (
              <View style={ms.previewBox}>
                <Image
                  source={{ uri: previewUrl || url.trim() }}
                  style={ms.previewImg}
                  resizeMode="cover"
                />
              </View>
            ) : null}
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
              style={[ms.saveBtn, (saving || uploading) && ms.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || uploading}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={ms.saveBtnText}>Guardar portada</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: Selector de tipo de publicación
// ══════════════════════════════════════════════════════════════════════════════
function TipoSelectorModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (tipo: PublicacionTipo) => void;
}) {
  const TIPOS: PublicacionTipo[] = [
    "CLASE_VIRTUAL",
    "TAREA",
    "MATERIAL_CLASE",
    "EVALUACION",
    "ANUNCIO_GENERAL",
    "CONTENIDO_INMEDIATO",
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        <View style={[ms.sheet, { maxWidth: 560 }]}>
          <View style={ms.sheetHeader}>
            <View>
              <Text style={ms.sheetTitle}>Tipo de publicación</Text>
              <Text style={ms.sheetSub}>Selecciona qué deseas publicar</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Text style={ms.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={ms.tipoGrid}>
            {TIPOS.map((tipo) => {
              const meta = TIPO_META[tipo];
              return (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    ms.tipoCard,
                    { borderColor: meta.color, backgroundColor: meta.bg },
                  ]}
                  onPress={() => onSelect(tipo)}
                  activeOpacity={0.8}
                >
                  <Text style={ms.tipoCardIcon}>{meta.icon}</Text>
                  <Text style={[ms.tipoCardLabel, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: Formulario de publicación (según tipo)
// ══════════════════════════════════════════════════════════════════════════════
function PublicacionFormModal({
  visible,
  tipo,
  cursoId,
  anioPeriodo,
  onClose,
  onSaved,
}: {
  visible: boolean;
  tipo: PublicacionTipo | null;
  cursoId: string;
  anioPeriodo: string;
  onClose: () => void;
  onSaved: (p: PublicacionResponse) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [linkReunion, setLinkReunion] = useState("");
  const [fechaClase, setFechaClase] = useState("");
  const [archivoUrl, setArchivoUrl] = useState("");
  const [archivoNombre, setArchivoNombre] = useState("");
  const [linkVideo, setLinkVideo] = useState("");
  const [tipoArchivo, setTipoArchivo] = useState<"archivo" | "link">("archivo");
  const [fechaLimite, setFechaLimite] = useState("");
  const [permitirTardio, setPermitirTardio] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setTitulo("");
    setDescripcion("");
    setLinkReunion("");
    setFechaClase("");
    setArchivoUrl("");
    setArchivoNombre("");
    setLinkVideo("");
    setTipoArchivo("archivo");
    setFechaLimite("");
    setPermitirTardio(false);
    setFechaInicio("");
    setFechaFin("");
    setError("");
  };

  const docInputRef = useRef<any>(null);

  const handleDocFile = async (file: File) => {
    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera los ${MAX_MB} MB permitidos.`);
      return;
    }
    try {
      setUploading(true);
      setError("");
      const { url, nombre } = await uploadArchivo(
        file,
        "publicaciones",
        cursoId,
      );
      setArchivoUrl(url);
      setArchivoNombre(nombre);
    } catch (error) {
      console.error(" Error real al subir el archivo:", error);
      setError("No se pudo subir el archivo. Intenta con una URL.");
    } finally {
      setUploading(false);
    }
  };

  if (!tipo) return null;
  const meta = TIPO_META[tipo];

  const formatFecha = (fecha: string): string | undefined => {
    if (!fecha) return undefined;
    if (fecha.includes("+") || fecha.endsWith("Z")) return fecha;
    const conSegundos = fecha.length === 16 ? fecha + ":00" : fecha;
    return conSegundos + "-05:00";
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const req: any = {
        cursoId,
        tipo,
        anioPeriodo,
        titulo: titulo.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
      };

      if (tipo === "CLASE_VIRTUAL") {
        req.linkReunion = linkReunion.trim() || undefined;
        req.fechaClase = formatFecha(fechaClase);
      }

      if (["TAREA", "MATERIAL_CLASE", "EVALUACION"].includes(tipo)) {
        if (tipoArchivo === "archivo") {
          req.archivoUrl = archivoUrl.trim() || undefined;
          req.archivoNombre = archivoNombre.trim() || undefined;
        } else {
          req.archivoUrl = linkVideo.trim() || undefined;
          req.archivoTipo = "video/link";
        }
      }

      if (["TAREA", "EVALUACION"].includes(tipo)) {
        req.fechaLimite = formatFecha(fechaLimite);
        req.permitirEnvioTardio = permitirTardio;
      }

      if (["ANUNCIO_GENERAL", "CONTENIDO_INMEDIATO"].includes(tipo)) {
        req.fechaInicio = formatFecha(fechaInicio);
        req.fechaFin = formatFecha(fechaFin);
      }

      const { data } = await createPublicacion(req);
      onSaved(data);
      reset();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? "No se pudo crear la publicación.",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderDateInput = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    includeTime = false,
  ) => {
    if (Platform.OS === "web") {
      return (
        <input
          type={includeTime ? "datetime-local" : "date"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
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
      );
    }
    return (
      <TextInput
        style={ms.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        <View style={[ms.sheet, { maxWidth: 540 }]}>
          {/* Header */}
          <View
            style={[
              ms.sheetHeader,
              { borderLeftWidth: 4, borderLeftColor: meta.color },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flex: 1,
              }}
            >
              <View style={[ms.tipoIconWrap, { backgroundColor: meta.bg }]}>
                <Text style={ms.tipoIconText}>{meta.icon}</Text>
              </View>
              <View>
                <Text style={ms.sheetTitle}>{meta.label}</Text>
                <Text style={ms.sheetSub}>Nueva publicación</Text>
              </View>
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

            {/* ── CLASE VIRTUAL ── */}
            {tipo === "CLASE_VIRTUAL" && (
              <>
                <View style={ms.field}>
                  <Text style={ms.label}>Título *</Text>
                  <TextInput
                    style={ms.input}
                    value={titulo}
                    onChangeText={setTitulo}
                    placeholder="Ej: Clase de introducción"
                    placeholderTextColor={C.muted}
                  />
                </View>
                <View style={ms.field}>
                  <Text style={ms.label}>Link de reunión</Text>
                  <TextInput
                    style={ms.input}
                    value={linkReunion}
                    onChangeText={setLinkReunion}
                    placeholder="https://meet.google.com/..."
                    placeholderTextColor={C.muted}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
                <View style={ms.field}>
                  <Text style={ms.label}>Descripción</Text>
                  <TextInput
                    style={[ms.input, ms.textArea]}
                    value={descripcion}
                    onChangeText={setDescripcion}
                    multiline
                    numberOfLines={3}
                    placeholder="Detalles de la clase..."
                    placeholderTextColor={C.muted}
                  />
                </View>
                <View style={ms.field}>
                  <Text style={ms.label}>Fecha y hora</Text>
                  {renderDateInput(
                    fechaClase,
                    setFechaClase,
                    "Selecciona fecha y hora",
                    true,
                  )}
                </View>
              </>
            )}

            {/* ── TAREA / MATERIAL / EVALUACIÓN ── */}
            {["TAREA", "MATERIAL_CLASE", "EVALUACION"].includes(tipo) && (
              <>
                <View style={ms.toggleRow}>
                  {(["archivo", "link"] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        ms.toggleBtn,
                        tipoArchivo === t && ms.toggleBtnActive,
                      ]}
                      onPress={() => setTipoArchivo(t)}
                    >
                      <Text
                        style={[
                          ms.toggleBtnText,
                          tipoArchivo === t && ms.toggleBtnTextActive,
                        ]}
                      >
                        {t === "archivo" ? "📄 Archivo" : "🔗 Link de video"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {tipoArchivo === "archivo" ? (
                  <>
                    {Platform.OS === "web" && (
                      <input
                        ref={docInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = (e.target as HTMLInputElement)
                            .files?.[0];
                          if (file) handleDocFile(file);
                        }}
                      />
                    )}

                    <TouchableOpacity
                      style={ms.dropZone}
                      activeOpacity={0.8}
                      disabled={uploading}
                      onPress={() => {
                        if (Platform.OS === "web" && docInputRef.current) {
                          docInputRef.current.click();
                        }
                      }}
                      {...(Platform.OS === "web"
                        ? {
                            onDrop: (e: any) => {
                              e.preventDefault();
                              const file = e.dataTransfer?.files?.[0];
                              if (file) handleDocFile(file);
                            },
                            onDragOver: (e: any) => e.preventDefault(),
                          }
                        : {})}
                    >
                      {uploading ? (
                        <>
                          <ActivityIndicator color={C.navyMd} />
                          <Text style={ms.dropTitle}>Subiendo archivo...</Text>
                        </>
                      ) : (
                        <>
                          <Text style={ms.dropIcon}>📄</Text>
                          <Text style={ms.dropTitle}>
                            {archivoNombre
                              ? `✓ ${archivoNombre}`
                              : "Arrastra aquí o haz clic para seleccionar"}
                          </Text>
                          <Text style={ms.dropSub}>
                            PDF, Word, PowerPoint · Máx. 10 MB
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <View style={ms.field}>
                      <Text style={ms.label}>O ingresa URL del archivo</Text>
                      <TextInput
                        style={ms.input}
                        value={archivoUrl}
                        onChangeText={setArchivoUrl}
                        placeholder="https://storage.supabase.co/..."
                        placeholderTextColor={C.muted}
                        autoCapitalize="none"
                        keyboardType="url"
                      />
                    </View>

                    {archivoUrl ? (
                      <View style={ms.archivoUploadedRow}>
                        <Text style={ms.archivoUploadedIcon}>✅</Text>
                        <TextInput
                          style={[ms.input, { flex: 1 }]}
                          value={archivoNombre}
                          onChangeText={setArchivoNombre}
                          placeholder="Nombre del archivo"
                          placeholderTextColor={C.muted}
                        />
                      </View>
                    ) : null}
                  </>
                ) : (
                  <View style={ms.field}>
                    <Text style={ms.label}>Link de video</Text>
                    <TextInput
                      style={ms.input}
                      value={linkVideo}
                      onChangeText={setLinkVideo}
                      placeholder="https://youtube.com/..."
                      placeholderTextColor={C.muted}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>
                )}

                <View style={ms.field}>
                  <Text style={ms.label}>Descripción (opcional)</Text>
                  <TextInput
                    style={[ms.input, ms.textArea]}
                    value={descripcion}
                    onChangeText={setDescripcion}
                    multiline
                    numberOfLines={3}
                    placeholder="Instrucciones o detalles..."
                    placeholderTextColor={C.muted}
                  />
                </View>

                {["TAREA", "EVALUACION"].includes(tipo) && (
                  <>
                    <View style={ms.field}>
                      <Text style={ms.label}>
                        Fecha y hora límite de entrega
                      </Text>
                      {renderDateInput(
                        fechaLimite,
                        setFechaLimite,
                        "Selecciona fecha límite",
                        true,
                      )}
                    </View>
                    <TouchableOpacity
                      style={ms.checkRow}
                      onPress={() => setPermitirTardio(!permitirTardio)}
                    >
                      <View
                        style={[
                          ms.checkbox,
                          permitirTardio && ms.checkboxActive,
                        ]}
                      >
                        {permitirTardio && (
                          <Text style={ms.checkboxCheck}>✓</Text>
                        )}
                      </View>
                      <Text style={ms.checkLabel}>
                        Permitir entrega fuera de la fecha límite
                      </Text>
                    </TouchableOpacity>
                    {fechaLimite && (
                      <View style={ms.infoBanner}>
                        <Text style={ms.infoBannerText}>
                          ℹ El envío se bloqueará automáticamente cuando venza
                          la fecha límite
                          {permitirTardio
                            ? ", pero el docente puede habilitarlo manualmente."
                            : "."}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── ANUNCIO GENERAL / CONTENIDO INMEDIATO ── */}
            {["ANUNCIO_GENERAL", "CONTENIDO_INMEDIATO"].includes(tipo) && (
              <>
                <View style={ms.field}>
                  <Text style={ms.label}>Título (opcional)</Text>
                  <TextInput
                    style={ms.input}
                    value={titulo}
                    onChangeText={setTitulo}
                    placeholder="Título del anuncio..."
                    placeholderTextColor={C.muted}
                  />
                </View>
                <View style={ms.field}>
                  <Text style={ms.label}>Descripción / Mensaje</Text>
                  <TextInput
                    style={[ms.input, ms.textArea]}
                    value={descripcion}
                    onChangeText={setDescripcion}
                    multiline
                    numberOfLines={4}
                    placeholder="Escribe el contenido del anuncio..."
                    placeholderTextColor={C.muted}
                  />
                </View>
                <View style={ms.field}>
                  <Text style={ms.label}>Fecha y hora de inicio</Text>
                  {renderDateInput(fechaInicio, setFechaInicio, "Inicio", true)}
                </View>
                <View style={ms.field}>
                  <Text style={ms.label}>Fecha y hora de fin</Text>
                  {renderDateInput(fechaFin, setFechaFin, "Fin", true)}
                </View>
                {fechaFin && (
                  <View style={ms.infoBanner}>
                    <Text style={ms.infoBannerText}>
                      ℹ Al llegar la hora de fin, se bloqueará automáticamente
                      el envío de evaluaciones.
                    </Text>
                  </View>
                )}
              </>
            )}
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
              style={[ms.saveBtn, (saving || uploading) && ms.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || uploading}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={ms.saveBtnText}>Publicar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL: Ver entregas (docente / admin)
//  ── MEJORA: archivoNombre y linkEntrega son ahora descargables/abribles ──
// ══════════════════════════════════════════════════════════════════════════════
function EntregasModal({
  visible,
  publicacionId,
  titulo,
  onClose,
}: {
  visible: boolean;
  publicacionId: string | null;
  titulo: string;
  onClose: () => void;
}) {
  const [entregas, setEntregas] = useState<EntregaResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const prevId = useRef<string | null>(null);

  if (visible && publicacionId && publicacionId !== prevId.current) {
    prevId.current = publicacionId;
    setLoading(true);
    getEntregas(publicacionId)
      .then((r) => setEntregas(r.data))
      .catch(() => setEntregas([]))
      .finally(() => setLoading(false));
  }
  if (!visible && prevId.current) {
    prevId.current = null;
    setEntregas([]);
  }

  const fmtFecha = (iso: string) =>
    new Date(iso).toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        {/* ── maxHeight explícito para que el ScrollView funcione bien ── */}
        <View style={[ms.sheet, { maxWidth: 560, maxHeight: "88%" as any }]}>
          <View style={ms.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={ms.sheetTitle}>Entregas recibidas</Text>
              <Text style={ms.sheetSub} numberOfLines={1}>
                {titulo}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Text style={ms.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={ms.loadingBox}>
              <ActivityIndicator size="large" color={C.navyMd} />
            </View>
          ) : (
            // ── flex:1 + scrollable para ver todas las entregas ──
            <ScrollView
              style={[ms.body, { flex: 1 }]}
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              {entregas.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Text style={{ fontSize: 36, marginBottom: 10 }}>📭</Text>
                  <Text
                    style={{ color: C.sub, fontSize: 14, fontWeight: "600" }}
                  >
                    Aún no hay entregas
                  </Text>
                </View>
              ) : (
                <>
                  <View style={ms.entregasSummary}>
                    <Text style={ms.entregasSummaryText}>
                      {entregas.length} entrega
                      {entregas.length !== 1 ? "s" : ""} recibida
                      {entregas.length !== 1 ? "s" : ""}
                    </Text>
                  </View>

                  {entregas.map((e, i) => (
                    <View
                      key={e.id}
                      style={[
                        ms.entregaRow,
                        i < entregas.length - 1 && ms.entregaRowBorder,
                      ]}
                    >
                      {/* Avatar */}
                      <View style={ms.entregaAvatar}>
                        <Text style={ms.entregaAvatarText}>
                          {(e.estudianteNombre ??
                            e.estudianteEmail)[0].toUpperCase()}
                        </Text>
                      </View>

                      {/* Contenido */}
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={ms.entregaNombre}>
                          {e.estudianteNombre ?? "Sin nombre"}
                        </Text>
                        <Text style={ms.entregaEmail}>{e.estudianteEmail}</Text>
                        <Text style={ms.entregaFecha}>
                          📅 {fmtFecha(e.entregadoAt)}
                        </Text>

                        {/* ── MEJORA: archivo descargable ── */}
                        {e.archivoUrl && e.archivoNombre && (
                          <TouchableOpacity
                            style={ms.entregaArchivoBtn}
                            activeOpacity={0.75}
                            onPress={() =>
                              abrirUrl(e.archivoUrl!, e.archivoNombre)
                            }
                          >
                            <Text style={ms.entregaArchivoBtnIcon}>📄</Text>
                            <Text
                              style={ms.entregaArchivoBtnText}
                              numberOfLines={1}
                            >
                              {e.archivoNombre}
                            </Text>
                            <Text style={ms.entregaArchivoBtnDescarga}>↓</Text>
                          </TouchableOpacity>
                        )}

                        {/* ── MEJORA: link abribile ── */}
                        {e.linkEntrega && (
                          <TouchableOpacity
                            style={ms.entregaLinkBtn}
                            activeOpacity={0.75}
                            onPress={() => abrirUrl(e.linkEntrega!)}
                          >
                            <Text style={ms.entregaLinkBtnIcon}>🔗</Text>
                            <Text
                              style={ms.entregaLinkBtnText}
                              numberOfLines={1}
                            >
                              {e.linkEntrega}
                            </Text>
                            <Text style={ms.entregaLinkBtnAbrir}>↗</Text>
                          </TouchableOpacity>
                        )}

                        {e.comentario && (
                          <Text style={ms.entregaComentario}>
                            💬 {e.comentario}
                          </Text>
                        )}
                      </View>

                      {/* Badge ✓ */}
                      <View style={ms.entregaBadge}>
                        <Text style={ms.entregaBadgeText}>✓</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
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
//  MODAL: Entrega del estudiante
// ══════════════════════════════════════════════════════════════════════════════
function EntregaEstudianteModal({
  visible,
  publicacion,
  onClose,
  onSaved,
}: {
  visible: boolean;
  publicacion: PublicacionResponse | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tipoEntrega, setTipoEntrega] = useState<"archivo" | "link">("archivo");
  const [archivoUrl, setArchivoUrl] = useState("");
  const [archivoNombre, setArchivoNombre] = useState("");
  const [linkEntrega, setLinkEntrega] = useState("");
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setArchivoUrl("");
    setArchivoNombre("");
    setLinkEntrega("");
    setComentario("");
    setError("");
  };

  const entregaDocInputRef = useRef<any>(null);

  const handleEntregaFile = async (file: File) => {
    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera los ${MAX_MB} MB permitidos.`);
      return;
    }
    try {
      setUploading(true);
      setError("");
      const cursoId = publicacion!.cursoId;
      const { url, nombre } = await uploadArchivo(file, "entregas", cursoId);
      setArchivoUrl(url);
      setArchivoNombre(nombre);
    } catch (error) {
      console.error("Error real al subir el archivo:", error);
      setError("No se pudo subir el archivo. Intenta con una URL.");
    } finally {
      setUploading(false);
    }
  };

  if (!publicacion) return null;

  const handleSend = async () => {
    setSaving(true);
    setError("");
    try {
      await crearEntrega({
        publicacionId: publicacion.id,
        archivoUrl:
          tipoEntrega === "archivo"
            ? archivoUrl.trim() || undefined
            : undefined,
        archivoNombre:
          tipoEntrega === "archivo"
            ? archivoNombre.trim() || undefined
            : undefined,
        linkEntrega:
          tipoEntrega === "link" ? linkEntrega.trim() || undefined : undefined,
        comentario: comentario.trim() || undefined,
      });
      onSaved();
      reset();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "No se pudo enviar la entrega.");
    } finally {
      setSaving(false);
    }
  };

  const tipoMeta = TIPO_META[publicacion.tipo];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        <View style={[ms.sheet, { maxWidth: 500 }]}>
          <View
            style={[
              ms.sheetHeader,
              { borderLeftWidth: 4, borderLeftColor: tipoMeta.color },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={ms.sheetTitle}>
                Entregar {publicacion.tipo === "TAREA" ? "tarea" : "evaluación"}
              </Text>
              <Text style={ms.sheetSub} numberOfLines={1}>
                {publicacion.titulo ?? tipoMeta.label}
              </Text>
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

            {publicacion.fechaLimite && (
              <View style={[ms.infoBanner, { marginBottom: 16 }]}>
                <Text style={ms.infoBannerText}>
                  ⏰ Fecha límite:{" "}
                  {new Date(publicacion.fechaLimite).toLocaleString("es-PE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {publicacion.vencida && !publicacion.permitirEnvioTardio
                    ? "  — ⚠ Vencida"
                    : ""}
                </Text>
              </View>
            )}

            <View style={ms.toggleRow}>
              {(["archivo", "link"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    ms.toggleBtn,
                    tipoEntrega === t && ms.toggleBtnActive,
                  ]}
                  onPress={() => setTipoEntrega(t)}
                >
                  <Text
                    style={[
                      ms.toggleBtnText,
                      tipoEntrega === t && ms.toggleBtnTextActive,
                    ]}
                  >
                    {t === "archivo" ? "📄 Documento" : "🔗 Link"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {tipoEntrega === "archivo" ? (
              <>
                {Platform.OS === "web" && (
                  <input
                    ref={entregaDocInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleEntregaFile(file);
                    }}
                  />
                )}

                <TouchableOpacity
                  style={ms.dropZone}
                  activeOpacity={0.8}
                  disabled={uploading}
                  onPress={() => {
                    if (Platform.OS === "web" && entregaDocInputRef.current) {
                      entregaDocInputRef.current.click();
                    }
                  }}
                  {...(Platform.OS === "web"
                    ? {
                        onDrop: (e: any) => {
                          e.preventDefault();
                          const file = e.dataTransfer?.files?.[0];
                          if (file) handleEntregaFile(file);
                        },
                        onDragOver: (e: any) => e.preventDefault(),
                      }
                    : {})}
                >
                  {uploading ? (
                    <>
                      <ActivityIndicator color={C.navyMd} />
                      <Text style={ms.dropTitle}>Subiendo archivo...</Text>
                      <Text style={ms.dropSub}>Por favor espera...</Text>
                    </>
                  ) : (
                    <>
                      <Text style={ms.dropIcon}>📄</Text>
                      <Text style={ms.dropTitle}>
                        {archivoNombre
                          ? `✓ ${archivoNombre}`
                          : "Arrastra aquí o da clic para seleccionar"}
                      </Text>
                      <Text style={ms.dropSub}>
                        PDF, Word, PowerPoint · Máx. 10 MB
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={ms.field}>
                  <Text style={ms.label}>O ingresa URL del archivo</Text>
                  <TextInput
                    style={ms.input}
                    value={archivoUrl}
                    onChangeText={setArchivoUrl}
                    placeholder="https://..."
                    placeholderTextColor={C.muted}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                {archivoUrl ? (
                  <View style={ms.archivoUploadedRow}>
                    <Text style={ms.archivoUploadedIcon}>✅</Text>
                    <TextInput
                      style={[ms.input, { flex: 1 }]}
                      value={archivoNombre}
                      onChangeText={setArchivoNombre}
                      placeholder="Nombre del archivo"
                      placeholderTextColor={C.muted}
                    />
                  </View>
                ) : null}
              </>
            ) : (
              <View style={ms.field}>
                <Text style={ms.label}>Link de entrega</Text>
                <TextInput
                  style={ms.input}
                  value={linkEntrega}
                  onChangeText={setLinkEntrega}
                  placeholder="https://..."
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            )}

            <View style={ms.field}>
              <Text style={ms.label}>Comentario al docente (opcional)</Text>
              <TextInput
                style={[ms.input, ms.textArea]}
                value={comentario}
                onChangeText={setComentario}
                multiline
                numberOfLines={3}
                placeholder="Agrega un mensaje..."
                placeholderTextColor={C.muted}
              />
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
              style={[ms.saveBtn, (saving || uploading) && ms.saveBtnDisabled]}
              onPress={handleSend}
              disabled={saving || uploading}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={ms.saveBtnText}>Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  CARD DE PUBLICACIÓN
//  ── MEJORA: archivoUrl del docente es ahora clickeable para todos los roles ──
// ══════════════════════════════════════════════════════════════════════════════
function PublicacionCard({
  pub,
  isDocente,
  isAdmin,
  onDelete,
  onVerEntregas,
  onEntregar,
  onTogglePermiso,
}: {
  pub: PublicacionResponse;
  isDocente: boolean;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onVerEntregas: (pub: PublicacionResponse) => void;
  onEntregar: (pub: PublicacionResponse) => void;
  onTogglePermiso: (pub: PublicacionResponse) => void;
}) {
  const meta = TIPO_META[pub.tipo];
  const canManage = isDocente || isAdmin;

  const fmtFecha = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isVencida = pub.vencida && !pub.permitirEnvioTardio;
  const esTareaOEval = pub.tipo === "TAREA" || pub.tipo === "EVALUACION";
  const esVideoLink = pub.archivoTipo === "video/link";

  return (
    <View style={[ps.card, { borderLeftColor: meta.color }]}>
      {/* Cabecera */}
      <View style={ps.cardHeader}>
        <View
          style={[
            ps.tipoPill,
            { backgroundColor: meta.bg, borderColor: meta.color },
          ]}
        >
          <Text style={ps.tipoPillIcon}>{meta.icon}</Text>
          <Text style={[ps.tipoPillText, { color: meta.color }]}>
            {meta.label}
          </Text>
        </View>
        <Text style={ps.cardDate}>
          {new Date(pub.createdAt).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "short",
          })}
        </Text>
        {canManage && (
          <TouchableOpacity
            style={ps.deleteBtn}
            onPress={() => onDelete(pub.id)}
          >
            <Text style={ps.deleteBtnText}>🗑</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Título */}
      {pub.titulo ? <Text style={ps.cardTitle}>{pub.titulo}</Text> : null}

      {/* Descripción */}
      {pub.descripcion ? (
        <Text style={ps.cardDesc}>{pub.descripcion}</Text>
      ) : null}

      {/* Clase Virtual */}
      {pub.tipo === "CLASE_VIRTUAL" && (
        <View style={ps.infoRow}>
          {pub.linkReunion ? (
            <View style={ps.linkRow}>
              <Text style={ps.infoIcon}>🔗</Text>
              <Text style={[ps.infoText, { color: C.info }]} numberOfLines={1}>
                {pub.linkReunion}
              </Text>
            </View>
          ) : null}
          {pub.fechaClase ? (
            <View style={ps.linkRow}>
              <Text style={ps.infoIcon}>📅</Text>
              <Text style={ps.infoText}>{fmtFecha(pub.fechaClase)}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* ── MEJORA: Archivo/link del docente — clickeable para todos los roles ── */}
      {pub.archivoUrl && (
        <TouchableOpacity
          style={ps.archivoRow}
          activeOpacity={0.75}
          onPress={() => abrirUrl(pub.archivoUrl!, pub.archivoNombre)}
        >
          <Text style={ps.archivoIcon}>{esVideoLink ? "🎬" : "📄"}</Text>
          <Text style={[ps.archivoNombre, { color: C.info }]} numberOfLines={1}>
            {pub.archivoNombre ?? pub.archivoUrl}
          </Text>
          {/* Indicador visual: descarga para archivos, flecha para links */}
          <Text style={ps.archivoAccion}>{esVideoLink ? "↗" : "↓"}</Text>
        </TouchableOpacity>
      )}

      {/* Fecha límite (Tarea / Evaluación) */}
      {esTareaOEval && pub.fechaLimite && (
        <View style={[ps.fechaLimiteRow, isVencida && ps.fechaLimiteVencida]}>
          <Text style={ps.infoIcon}>⏰</Text>
          <Text
            style={[
              ps.fechaLimiteText,
              { color: isVencida ? C.danger : C.sub },
            ]}
          >
            Límite: {fmtFecha(pub.fechaLimite)}
            {isVencida ? "  — Vencida" : ""}
          </Text>
        </View>
      )}

      {/* Anuncio / Contenido Inmediato */}
      {["ANUNCIO_GENERAL", "CONTENIDO_INMEDIATO"].includes(pub.tipo) && (
        <View style={ps.infoRow}>
          {pub.fechaInicio ? (
            <View style={ps.linkRow}>
              <Text style={ps.infoIcon}>🟢</Text>
              <Text style={ps.infoText}>
                Inicio: {fmtFecha(pub.fechaInicio)}
              </Text>
            </View>
          ) : null}
          {pub.fechaFin ? (
            <View style={ps.linkRow}>
              <Text style={ps.infoIcon}>🔴</Text>
              <Text style={ps.infoText}>Fin: {fmtFecha(pub.fechaFin)}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Footer: acciones */}
      <View style={ps.cardFooter}>
        {/* Docente / Admin */}
        {canManage && esTareaOEval && (
          <>
            <TouchableOpacity
              style={[
                ps.footerBtn,
                {
                  borderColor: C.info,
                  backgroundColor: "rgba(91,141,238,0.08)",
                },
              ]}
              onPress={() => onVerEntregas(pub)}
            >
              <Text style={[ps.footerBtnText, { color: C.info }]}>
                👁 Ver entregas{" "}
                {pub.totalEntregas != null ? `(${pub.totalEntregas})` : ""}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                ps.footerBtn,
                {
                  borderColor: pub.permitirEnvioTardio ? C.success : C.muted,
                  backgroundColor: pub.permitirEnvioTardio
                    ? "rgba(58,181,160,0.08)"
                    : "rgba(144,153,187,0.08)",
                },
              ]}
              onPress={() => onTogglePermiso(pub)}
            >
              <Text
                style={[
                  ps.footerBtnText,
                  { color: pub.permitirEnvioTardio ? C.success : C.muted },
                ]}
              >
                {pub.permitirEnvioTardio ? "✅ Tardío OK" : "🔒 Sin tardío"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Estudiante */}
        {!canManage && esTareaOEval && (
          <>
            {pub.entregado ? (
              <View
                style={[
                  ps.footerBtn,
                  {
                    borderColor: C.success,
                    backgroundColor: "rgba(58,181,160,0.08)",
                  },
                ]}
              >
                <Text style={[ps.footerBtnText, { color: C.success }]}>
                  ✅ Entregado
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  ps.footerBtn,
                  {
                    borderColor: isVencida ? C.danger : meta.color,
                    backgroundColor: isVencida
                      ? "rgba(224,82,82,0.08)"
                      : meta.bg,
                  },
                ]}
                onPress={() => !isVencida && onEntregar(pub)}
                disabled={isVencida === true}
              >
                <Text
                  style={[
                    ps.footerBtnText,
                    { color: isVencida ? C.danger : meta.color },
                  ]}
                >
                  {isVencida ? "🔒 Plazo vencido" : "📤 Entregar"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  CARD DE CURSO (portada)
// ══════════════════════════════════════════════════════════════════════════════
function CursoCard({
  curso,
  index,
  onPress,
}: {
  curso: CursoInicioResponse;
  index: number;
  onPress: () => void;
}) {
  const color = CARD_COLORS[index % CARD_COLORS.length];
  const initial = curso.cursoNombre[0]?.toUpperCase() ?? "C";

  return (
    <TouchableOpacity style={cs.card} onPress={onPress} activeOpacity={0.88}>
      <View style={[cs.portada, { backgroundColor: color }]}>
        {curso.portadaUrl ? (
          <Image
            source={{ uri: curso.portadaUrl }}
            style={cs.portadaImg}
            resizeMode="cover"
          />
        ) : (
          <View style={cs.portadaPlaceholder}>
            <Text style={cs.portadaInitial}>{initial}</Text>
            <Text style={cs.portadaCodigo}>{curso.cursoCodigo}</Text>
          </View>
        )}
        <View style={cs.periodoBadge}>
          <Text style={cs.periodoBadgeText}>{curso.anioPeriodo}</Text>
        </View>
      </View>

      <View style={cs.info}>
        <Text style={cs.nombre} numberOfLines={2}>
          {curso.cursoNombre}
        </Text>
        <Text style={cs.codigo}>{curso.cursoCodigo}</Text>
        {curso.docenteNombre && (
          <Text style={cs.docente} numberOfLines={1}>
            👨‍🏫 {curso.docenteNombre}
          </Text>
        )}
        <View style={cs.metaRow}>
          <View style={cs.creditosBadge}>
            <Text style={cs.creditosText}>{curso.creditos} créditos</Text>
          </View>
          {curso.totalEstudiantes > 0 && (
            <Text style={cs.estudiantesText}>👤 {curso.totalEstudiantes}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function InicioModule() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const { show: toast, Toast } = useToast();

  const isMobile = width < 768;
  const isDocente = user?.role === "DOCENTE";
  const isAdmin = user?.role === "ADMIN";
  const isEstudiante = user?.role === "ESTUDIANTE";

  const canManage = isDocente || isAdmin;

  const periodo = calcularPeriodo();
  const saludo = getSaludo();

  // ── Estado ─────────────────────────────────────────────────────────────────
  const [cursos, setCursos] = useState<CursoInicioResponse[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [cursoActivo, setCursoActivo] = useState<CursoInicioResponse | null>(
    null,
  );
  const [publicaciones, setPublicaciones] = useState<PublicacionResponse[]>([]);
  const [loadingPubs, setLoadingPubs] = useState(false);
  const [vistaDetalle, setVistaDetalle] = useState(false);

  // Modales
  const [showPortada, setShowPortada] = useState(false);
  const [showTipoSelector, setShowTipoSelector] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] =
    useState<PublicacionTipo | null>(null);
  const [showFormPub, setShowFormPub] = useState(false);
  const [showEntregas, setShowEntregas] = useState(false);
  const [entregasPubId, setEntregasPubId] = useState<string | null>(null);
  const [entregasPubTitulo, setEntregasPubTitulo] = useState("");
  const [showEntregaEstudiante, setShowEntregaEstudiante] = useState(false);
  const [pubParaEntregar, setPubParaEntregar] =
    useState<PublicacionResponse | null>(null);

  // ── Cargar publicaciones del curso activo ──────────────────────────────────
  const loadPublicaciones = useCallback(
    async (cursoId: string) => {
      setLoadingPubs(true);
      try {
        const { data } = await getPublicaciones(cursoId, periodo);
        setPublicaciones(data);
      } catch {
        toast("No se pudieron cargar las publicaciones.", "error");
      } finally {
        setLoadingPubs(false);
      }
    },
    [periodo],
  );

  const loadCursos = useCallback(async () => {
    setLoadingCursos(true);
    try {
      const { data } = await getCursosInicio();
      setCursos(data);
    } catch {
      toast("No se pudieron cargar los cursos.", "error");
    } finally {
      setLoadingCursos(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoadingCursos(true);
      getCursosInicio()
        .then(({ data }) => {
          if (activo) setCursos(data);
        })
        .catch(() => {
          if (activo) toast("No se pudieron cargar los cursos.", "error");
        })
        .finally(() => {
          if (activo) setLoadingCursos(false);
        });
      return () => {
        activo = false;
      };
    }, []),
  );

  const seleccionarCurso = (curso: CursoInicioResponse) => {
    setCursoActivo(curso);
    setPublicaciones([]);
    loadPublicaciones(curso.cursoId);
    if (isMobile) setVistaDetalle(true);
  };

  const handleDelete = async (id: string) => {
    const ok =
      Platform.OS === "web"
        ? window.confirm("¿Eliminar esta publicación?")
        : true;
    if (!ok) return;
    try {
      await deletePublicacion(id);
      setPublicaciones((prev) => prev.filter((p) => p.id !== id));
      toast("Publicación eliminada.");
    } catch {
      toast("No se pudo eliminar la publicación.", "error");
    }
  };

  const handleTogglePermiso = async (pub: PublicacionResponse) => {
    try {
      const { data } = await updatePermisoTardio(
        pub.id,
        !pub.permitirEnvioTardio,
      );
      setPublicaciones((prev) => prev.map((p) => (p.id === pub.id ? data : p)));
      toast(
        data.permitirEnvioTardio
          ? "Envío tardío habilitado."
          : "Envío tardío deshabilitado.",
      );
    } catch {
      toast("No se pudo actualizar el permiso.", "error");
    }
  };

  const numCols = width >= 640 ? 2 : 1;

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <Toast />

      {/* ── Modales ───────────────────────────────────────────────── */}
      {cursoActivo && (
        <>
          <PortadaModal
            visible={showPortada}
            cursoId={cursoActivo.cursoId}
            cursoNombre={cursoActivo.cursoNombre}
            onClose={() => setShowPortada(false)}
            onSaved={(url) => {
              setCursos((prev) =>
                prev.map((c) =>
                  c.cursoId === cursoActivo.cursoId
                    ? { ...c, portadaUrl: url }
                    : c,
                ),
              );
              setCursoActivo((prev) =>
                prev ? { ...prev, portadaUrl: url } : prev,
              );
              setShowPortada(false);
              toast("Portada actualizada ✓");
            }}
          />
          <TipoSelectorModal
            visible={showTipoSelector}
            onClose={() => setShowTipoSelector(false)}
            onSelect={(tipo) => {
              setTipoSeleccionado(tipo);
              setShowTipoSelector(false);
              setShowFormPub(true);
            }}
          />
          <PublicacionFormModal
            visible={showFormPub}
            tipo={tipoSeleccionado}
            cursoId={cursoActivo.cursoId}
            anioPeriodo={cursoActivo.anioPeriodo}
            onClose={() => {
              setShowFormPub(false);
              setTipoSeleccionado(null);
              setShowTipoSelector(true);
            }}
            onSaved={(pub) => {
              setPublicaciones((prev) => [...prev, pub]);
              setShowFormPub(false);
              setTipoSeleccionado(null);
              toast("Publicación creada ✓");
            }}
          />
        </>
      )}

      <EntregasModal
        visible={showEntregas}
        publicacionId={entregasPubId}
        titulo={entregasPubTitulo}
        onClose={() => setShowEntregas(false)}
      />

      <EntregaEstudianteModal
        visible={showEntregaEstudiante}
        publicacion={pubParaEntregar}
        onClose={() => {
          setShowEntregaEstudiante(false);
          setPubParaEntregar(null);
        }}
        onSaved={() => {
          setShowEntregaEstudiante(false);
          setPubParaEntregar(null);
          if (cursoActivo) loadPublicaciones(cursoActivo.cursoId);
          toast("Entrega enviada correctamente ✓");
        }}
      />

      {/* ── LAYOUT PRINCIPAL ─────────────────────────────────────── */}
      <View style={s.layout}>
        {/* ══ PANEL IZQUIERDO: lista de cursos ══ */}
        {(!isMobile || !vistaDetalle) && (
          <View style={[s.sidebar, isMobile && { width: "100%" as any }]}>
            <View style={s.sidebarHeader}>
              <View style={s.welcomeBlock}>
                <Text style={s.saludo}>{saludo},</Text>
                <Text style={s.userName} numberOfLines={1}>
                  {user?.fullName ?? user?.email ?? "Usuario"} 👋
                </Text>
                <View style={s.periodoRow}>
                  <View style={s.periodoPill}>
                    <Text style={s.periodoPillText}>📅 {periodo}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={s.sidebarTitleRow}>
              <Text style={s.sidebarTitle}>Mis Cursos</Text>
              <View style={s.cursosBadge}>
                <Text style={s.cursosBadgeText}>{cursos.length}</Text>
              </View>
            </View>

            {loadingCursos ? (
              <View style={s.centerBox}>
                <ActivityIndicator size="large" color={C.navyMd} />
                <Text style={s.loadingText}>Cargando cursos...</Text>
              </View>
            ) : cursos.length === 0 ? (
              <View style={s.centerBox}>
                <Text style={s.emptyIcon}>📚</Text>
                <Text style={s.emptyTitle}>Sin cursos</Text>
                <Text style={s.emptySub}>
                  {canManage
                    ? "No tienes cursos asignados en este período."
                    : "No estás matriculado en ningún curso aún."}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[
                  s.cursosGrid,
                  { flexDirection: "row", flexWrap: "wrap" },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {cursos.map((curso, i) => (
                  <View
                    key={curso.cursoId}
                    style={[
                      s.cursoCardWrap,
                      {
                        width: `${100 / numCols}%` as any,
                      },
                    ]}
                  >
                    <CursoCard
                      curso={curso}
                      index={i}
                      onPress={() => seleccionarCurso(curso)}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ══ PANEL DERECHO: publicaciones del curso ══ */}
        {(!isMobile || vistaDetalle) && cursoActivo && (
          <View style={s.main}>
            <View style={s.cursoHeader}>
              {isMobile && (
                <TouchableOpacity
                  style={s.backBtn}
                  onPress={() => setVistaDetalle(false)}
                >
                  <Text style={s.backBtnText}>‹ Cursos</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={s.cursoHeaderTop}>
                  <View style={s.cursoBadge}>
                    <Text style={s.cursoBadgeText}>
                      {cursoActivo.cursoCodigo}
                    </Text>
                  </View>
                  <Text style={s.cursoHeaderName} numberOfLines={1}>
                    {cursoActivo.cursoNombre}
                  </Text>
                </View>
                {cursoActivo.docenteNombre && (
                  <Text style={s.cursoDocente}>
                    👨‍🏫 {cursoActivo.docenteNombre}
                  </Text>
                )}
              </View>

              {canManage && (
                <View style={s.cursoHeaderActions}>
                  <TouchableOpacity
                    style={[s.headerBtn, { borderColor: C.purple }]}
                    onPress={() => setShowPortada(true)}
                  >
                    <Text style={[s.headerBtnText, { color: C.purple }]}>
                      🖼 Portada
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      s.headerBtn,
                      { borderColor: C.accent, backgroundColor: C.accent },
                    ]}
                    onPress={() => setShowTipoSelector(true)}
                  >
                    <Text style={[s.headerBtnText, { color: C.white }]}>
                      + Publicar
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {loadingPubs ? (
              <View style={s.centerBox}>
                <ActivityIndicator size="large" color={C.navyMd} />
                <Text style={s.loadingText}>Cargando publicaciones...</Text>
              </View>
            ) : publicaciones.length === 0 ? (
              <View style={s.centerBox}>
                <Text style={s.emptyIcon}>📋</Text>
                <Text style={s.emptyTitle}>Sin publicaciones</Text>
                <Text style={s.emptySub}>
                  {canManage
                    ? "Usa '+ Publicar' para agregar contenido al curso."
                    : "El docente aún no ha publicado contenido."}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={s.pubsList}
                contentContainerStyle={s.pubsContent}
                showsVerticalScrollIndicator={false}
              >
                {publicaciones.map((pub) => (
                  <PublicacionCard
                    key={pub.id}
                    pub={pub}
                    isDocente={isDocente}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onVerEntregas={(p) => {
                      setEntregasPubId(p.id);
                      setEntregasPubTitulo(p.titulo ?? TIPO_META[p.tipo].label);
                      setShowEntregas(true);
                    }}
                    onEntregar={(p) => {
                      setPubParaEntregar(p);
                      setShowEntregaEstudiante(true);
                    }}
                    onTogglePermiso={handleTogglePermiso}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {!isMobile && !cursoActivo && (
          <View style={s.mainEmpty}>
            <Text style={s.emptyIcon}>👈</Text>
            <Text style={s.emptyTitle}>Selecciona un curso</Text>
            <Text style={s.emptySub}>para ver sus publicaciones</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ESTILOS PRINCIPALES
// ══════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  layout: { flex: 1, flexDirection: "row" },

  sidebar: {
    width: "50%" as any,
    backgroundColor: C.bg,
    borderRightWidth: 1,
    borderRightColor: C.border,
    ...Platform.select({
      web: { boxShadow: "2px 0 12px rgba(27,34,87,0.06)" } as any,
    }),
  },
  sidebarHeader: {
    backgroundColor: C.white,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    ...Platform.select({
      web: { boxShadow: "0 2px 8px rgba(27,34,87,0.05)" } as any,
    }),
  },
  welcomeBlock: { gap: 4 },
  saludo: { fontSize: 13, color: C.sub, fontWeight: "500" },
  userName: { fontSize: 22, fontWeight: "800", color: C.navy, marginTop: 2 },
  periodoRow: { flexDirection: "row", marginTop: 8 },
  periodoPill: {
    backgroundColor: "rgba(45,58,130,0.08)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(45,58,130,0.15)",
  },
  periodoPillText: { fontSize: 12, fontWeight: "700", color: C.navyMd },

  sidebarTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sidebarTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.navy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cursosBadge: {
    backgroundColor: C.navyMd,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  cursosBadgeText: { color: C.white, fontSize: 11, fontWeight: "800" },

  cursosGrid: { paddingHorizontal: 12, paddingBottom: 24, gap: 0 },
  cursoCardWrap: { padding: 6 },

  main: { flex: 1, backgroundColor: C.bg },
  mainEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },

  cursoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexWrap: "wrap",
    ...Platform.select({
      web: { boxShadow: "0 2px 8px rgba(27,34,87,0.06)" } as any,
    }),
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(45,58,130,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.navyMd,
  },
  backBtnText: { fontSize: 13, fontWeight: "700", color: C.navyMd },
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
    fontSize: 16,
    fontWeight: "800",
    color: C.navy,
    flexShrink: 1,
  },
  cursoDocente: { fontSize: 12, color: C.sub, marginTop: 3 },
  cursoHeaderActions: { flexDirection: "row", gap: 8, flexShrink: 0 },
  headerBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  headerBtnText: { fontSize: 12, fontWeight: "700" },

  pubsList: { flex: 1 },
  pubsContent: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: { color: C.muted, fontSize: 13, marginTop: 10 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.navy,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
});

// ══════════════════════════════════════════════════════════════════════════════
//  ESTILOS CARD CURSO
// ══════════════════════════════════════════════════════════════════════════════
const cs = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.09,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      web: {
        boxShadow: "0 2px 14px rgba(27,34,87,0.10)",
        cursor: "pointer",
      } as any,
    }),
  },
  portada: { height: 120, justifyContent: "flex-end", alignItems: "flex-end" },
  portadaImg: { ...StyleSheet.absoluteFillObject },
  portadaPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  portadaInitial: {
    fontSize: 36,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
  },
  portadaCodigo: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 1,
  },
  periodoBadge: {
    margin: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  periodoBadgeText: { fontSize: 10, fontWeight: "700", color: C.white },
  info: { padding: 12, gap: 4 },
  nombre: { fontSize: 13, fontWeight: "700", color: C.navy, lineHeight: 18 },
  codigo: {
    fontSize: 10.5,
    color: C.muted,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  docente: { fontSize: 11, color: C.sub, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  creditosBadge: {
    backgroundColor: "rgba(45,58,130,0.08)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  creditosText: { fontSize: 10, fontWeight: "700", color: C.navyMd },
  estudiantesText: { fontSize: 11, color: C.muted },
});

// ══════════════════════════════════════════════════════════════════════════════
//  ESTILOS CARD PUBLICACIÓN
// ══════════════════════════════════════════════════════════════════════════════
const ps = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    gap: 8,
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
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tipoPillIcon: { fontSize: 12 },
  tipoPillText: { fontSize: 11, fontWeight: "700" },
  cardDate: { fontSize: 11, color: C.muted, marginLeft: "auto" as any },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(224,82,82,0.08)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  deleteBtnText: { fontSize: 13 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.navy },
  cardDesc: { fontSize: 13, color: C.sub, lineHeight: 19 },
  infoRow: { gap: 6 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoIcon: { fontSize: 13 },
  infoText: { fontSize: 12, color: C.sub, flex: 1 },

  // ── MEJORA: archivoRow ahora es touchable con indicador de acción ──
  archivoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(91,141,238,0.06)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(91,141,238,0.15)",
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  archivoIcon: { fontSize: 16 },
  archivoNombre: { fontSize: 12, fontWeight: "600", flex: 1 },
  // Indicador ↓ (descarga) o ↗ (abrir link)
  archivoAccion: {
    fontSize: 14,
    fontWeight: "700",
    color: C.info,
    marginLeft: 4,
  },

  fechaLimiteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(144,153,187,0.08)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fechaLimiteVencida: { backgroundColor: "rgba(224,82,82,0.08)" },
  fechaLimiteText: { fontSize: 12, fontWeight: "600" },
  cardFooter: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
  footerBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  footerBtnText: { fontSize: 12, fontWeight: "700" },
});

// ══════════════════════════════════════════════════════════════════════════════
//  ESTILOS MODALES (compartidos)
// ══════════════════════════════════════════════════════════════════════════════
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
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: C.navy },
  sheetSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f2f8",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 12, color: C.sub, fontWeight: "700" },
  body: { padding: 20, flexGrow: 1 },
  loadingBox: { height: 160, alignItems: "center", justifyContent: "center" },

  field: { gap: 6, marginBottom: 14 },
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
  textArea: { minHeight: 80, textAlignVertical: "top" },

  dropZone: {
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    backgroundColor: "#f6f7fb",
  },
  dropZoneActive: {
    borderColor: C.navyMd,
    backgroundColor: "rgba(45,58,130,0.04)",
  },
  dropIcon: { fontSize: 32, marginBottom: 4 },
  dropTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.navy,
    textAlign: "center",
  },
  dropSub: { fontSize: 12, color: C.muted, textAlign: "center" },
  dropBadge: {
    backgroundColor: "rgba(45,58,130,0.08)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  dropBadgeText: { fontSize: 11, fontWeight: "700", color: C.navyMd },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.muted, fontWeight: "500" },

  previewBox: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 14,
    height: 140,
  },
  previewImg: { width: "100%", height: "100%" },

  archivoUploadedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  archivoUploadedIcon: { fontSize: 18 },

  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: "#f6f7fb",
    alignItems: "center",
  },
  toggleBtnActive: {
    borderColor: C.navyMd,
    backgroundColor: "rgba(45,58,130,0.06)",
  },
  toggleBtnText: { fontSize: 13, fontWeight: "600", color: C.sub },
  toggleBtnTextActive: { color: C.navyMd },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: "#f6f7fb",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: C.navyMd, borderColor: C.navyMd },
  checkboxCheck: { fontSize: 12, color: C.white, fontWeight: "800" },
  checkLabel: { fontSize: 13, color: C.navy, fontWeight: "500", flex: 1 },

  infoBanner: {
    backgroundColor: "rgba(91,141,238,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(91,141,238,0.20)",
    padding: 12,
    marginBottom: 10,
  },
  infoBannerText: {
    fontSize: 12,
    color: "#4a7ad4",
    fontWeight: "500",
    lineHeight: 18,
  },

  errorBanner: {
    backgroundColor: "rgba(224,82,82,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.danger,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, color: C.danger, fontWeight: "600" },

  tipoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 10,
  },
  tipoCard: {
    width: "30%" as any,
    minWidth: 100,
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 8,
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  tipoCardIcon: { fontSize: 28 },
  tipoCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 15,
  },

  tipoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tipoIconText: { fontSize: 18 },

  // Entregas
  entregasSummary: {
    backgroundColor: "rgba(45,58,130,0.06)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  entregasSummaryText: { fontSize: 13, fontWeight: "700", color: C.navyMd },
  entregaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
  },
  entregaRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f0f2f8" },
  entregaAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(91,141,238,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.info,
  },
  entregaAvatarText: { fontSize: 14, fontWeight: "800", color: C.info },
  entregaNombre: { fontSize: 13, fontWeight: "700", color: C.navy },
  entregaEmail: { fontSize: 11.5, color: C.muted },
  entregaFecha: { fontSize: 11.5, color: C.sub, marginTop: 2 },

  // ── NUEVOS: botones de archivo descargable y link abribile en entregas ──
  entregaArchivoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    backgroundColor: "rgba(91,141,238,0.07)",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(91,141,238,0.18)",
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  entregaArchivoBtnIcon: { fontSize: 13 },
  entregaArchivoBtnText: {
    fontSize: 11.5,
    color: C.info,
    fontWeight: "600",
    flex: 1,
  },
  entregaArchivoBtnDescarga: {
    fontSize: 13,
    fontWeight: "800",
    color: C.info,
  },

  entregaLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    backgroundColor: "rgba(124,92,191,0.07)",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(124,92,191,0.18)",
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  entregaLinkBtnIcon: { fontSize: 13 },
  entregaLinkBtnText: {
    fontSize: 11.5,
    color: C.purple,
    fontWeight: "600",
    flex: 1,
  },
  entregaLinkBtnAbrir: {
    fontSize: 13,
    fontWeight: "800",
    color: C.purple,
  },

  // Mantener los estilos originales (usados en otros lugares)
  entregaArchivo: { fontSize: 11.5, color: C.info, marginTop: 2 },
  entregaLink: { fontSize: 11.5, color: C.info, marginTop: 2 },
  entregaComentario: {
    fontSize: 11.5,
    color: C.sub,
    fontStyle: "italic",
    marginTop: 2,
  },
  entregaBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(58,181,160,0.12)",
    borderWidth: 1.5,
    borderColor: C.success,
    alignItems: "center",
    justifyContent: "center",
  },
  entregaBadgeText: { fontSize: 12, color: C.success, fontWeight: "800" },

  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#f0f2f8",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: C.sub },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: C.navyMd,
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
  saveBtnText: { color: C.white, fontWeight: "700", fontSize: 15 },
});

// ── Toast estilos ─────────────────────────────────────────────────────────────
const ts = StyleSheet.create({
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
    color: C.white,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
