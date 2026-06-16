// ── app/(dashboard)/usuarios.tsx ─────────────────────────────────────────────
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  deleteUser,
  getUsers,
  setUserStatus,
  unlockUser,
  UserResponse,
  UserRole,
} from "../../services/userApi";

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

// ── Helpers de rol y estado ───────────────────────────────────────────────────
const ROL_META: Record<UserRole, { label: string; color: string; bg: string }> =
  {
    ADMIN: { label: "Admin", color: "#5DA15E", bg: "rgba(93,161,94,0.14)" },
    DOCENTE: {
      label: "Docente",
      color: "#3ab5a0",
      bg: "rgba(58,181,160,0.14)",
    },
    ESTUDIANTE: {
      label: "Estudiante",
      color: "#5b8dee",
      bg: "rgba(91,141,238,0.14)",
    },
  };

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const initials = (u: UserResponse) => {
  const name = u.fullName ?? u.email ?? "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

// ── Hook: Toast transitorio (igual al de [id].tsx) ────────────────────────────
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

  const Toast = useCallback(
    () =>
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
      ) : null,
    [msg, type, opacity],
  );

  return { show, Toast };
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Usuarios() {
  const router = useRouter();
  const { show: toast, Toast } = useToast();

  // Estado de lista
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  // Filtros
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);

  // Refs para manejar debounce y estado actual de filtros sin re-renders
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  // ── Carga de datos ──────────────────────────────────────────────────────────
  //
  // FIX: Se eliminó el useEffect separado con debounce que causaba doble carga.
  // Ahora TODO pasa por useFocusEffect con su propio debounce interno.
  // - Primera vez que la pantalla monta: carga inmediata (reset=true, p=0)
  // - Vuelve al foco (desde editar/nuevo): recarga la página actual
  // - Cambio de filtros: debounce de 350ms, resetea a página 0
  //
  const load = useCallback(
    async (p = 0, opts: { reset?: boolean; silent?: boolean } = {}) => {
      const { reset = false, silent = false } = opts;
      if (!silent) setLoading(true);
      try {
        const { data } = await getUsers({
          search: search.trim() || undefined,
          role: roleFilter || undefined,
          isActive: activeFilter ?? undefined,
          page: p,
          size: PAGE_SIZE,
        });
        setUsers(data.content);
        setTotalPages(data.totalPages);
        setTotalItems(data.totalElements);
        setPage(data.page);
      } catch {
        toast("No se pudo cargar la lista de usuarios.", "error");
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter, activeFilter],
  );

  // useFocusEffect se encarga de TODA la carga:
  // - Al montar por primera vez
  // - Al volver desde otra pantalla (editar / nuevo)
  // - Cuando cambian los filtros (con debounce)
  useFocusEffect(
    useCallback(() => {
      if (!isMounted.current) {
        // Primera carga: inmediata
        isMounted.current = true;
        load(0, { reset: true });
        return;
      }

      // Vuelve al foco o cambiaron filtros: debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => load(0, { reset: true }), 350);

      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [load]),
  );

  // ── Acciones de fila ────────────────────────────────────────────────────────

  // FIX: Se agregó estado de carga por fila para deshabilitar el botón
  // mientras se procesa, evitando doble tap y dando feedback visual.
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleToggleStatus = async (user: UserResponse) => {
    const action = user.active ? "Deshabilitar" : "Habilitar";
    const ok = Platform.OS === "web"
      ? window.confirm(`¿${action} a ${user.fullName ?? user.email}?`)
      : await new Promise<boolean>((resolve) =>
          Alert.alert(
            `¿${action} usuario?`,
            `${user.fullName ?? user.email} será ${user.active ? "deshabilitado" : "habilitado"}.`,
            [
              { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
              { text: action, style: "destructive", onPress: () => resolve(true) },
            ],
          ),
        );
    if (!ok) return;

    setActionLoading(`status-${user.id}`);
    try {
      await setUserStatus(user.id, !user.active);
      setUsers((prev) =>
        prev.map((u) => u.id === user.id ? { ...u, active: !u.active } : u),
      );
      toast(
        `${user.fullName ?? user.email} ${user.active ? "deshabilitado" : "habilitado"} correctamente`,
        "success",
      );
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "No se pudo cambiar el estado.", "error");
    } finally {
      setActionLoading(null);
    }
  };
  const handleUnlock = async (user: UserResponse) => {
    setActionLoading(`unlock-${user.id}`);
    try {
      await unlockUser(user.id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, accountLocked: false } : u,
        ),
      );
      toast(`Cuenta de ${user.fullName ?? user.email} desbloqueada`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? "No se pudo desbloquear la cuenta.";
      toast(msg, "error");
    } finally {
      setActionLoading(null);
    }
  };

    const handleDelete = async (user: UserResponse) => {
      const ok = Platform.OS === "web"
        ? window.confirm(`¿Eliminar permanentemente a ${user.fullName ?? user.email}?\nEsta acción no se puede deshacer.`)
        : await new Promise<boolean>((resolve) =>
            Alert.alert(
              "Eliminar usuario",
              `¿Eliminar permanentemente a ${user.fullName ?? user.email}?\nEsta acción no se puede deshacer.`,
              [
                { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
                { text: "Eliminar", style: "destructive", onPress: () => resolve(true) },
              ],
            ),
          );
      if (!ok) return;

      setActionLoading(`delete-${user.id}`);
      try {
        await deleteUser(user.id);
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        setTotalItems((n) => n - 1);
        toast(`${user.fullName ?? user.email} eliminado correctamente`, "success");
      } catch (err: any) {
        toast(err?.response?.data?.message ?? "No se pudo eliminar el usuario.", "error");
      } finally {
        setActionLoading(null);
      }
  };

  // ── Render de una tarjeta de usuario ───────────────────────────────────────
  const renderCard = (user: UserResponse) => {
    const rol = ROL_META[user.role];
    const ini = initials(user);
    const isStatusLoading = actionLoading === `status-${user.id}`;
    const isUnlockLoading = actionLoading === `unlock-${user.id}`;
    const isDeleteLoading = actionLoading === `delete-${user.id}`;
    const anyLoading = isStatusLoading || isUnlockLoading || isDeleteLoading;

    return (
      <View key={user.id} style={s.card}>
        {/* Avatar + info principal */}
        <View style={s.cardRow}>
          <View
            style={[
              s.avatar,
              { backgroundColor: rol.bg, borderColor: rol.color },
            ]}
          >
            <Text style={[s.avatarText, { color: rol.color }]}>{ini}</Text>
          </View>

          <View style={s.cardInfo}>
            <View style={s.cardNameRow}>
              <Text style={s.cardName} numberOfLines={1}>
                {user.fullName ?? "Sin nombre"}
              </Text>
              <View
                style={[
                  s.badge,
                  { backgroundColor: rol.bg, borderColor: rol.color },
                ]}
              >
                <Text style={[s.badgeText, { color: rol.color }]}>
                  {rol.label}
                </Text>
              </View>
            </View>
            <Text style={s.cardEmail} numberOfLines={1}>
              {user.email}
            </Text>
            <Text style={s.cardUsername}>@{user.username}</Text>
          </View>
        </View>

        {/* Fila de estado */}
        <View style={s.statusRow}>
          <View
            style={[
              s.pill,
              user.active
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
                { backgroundColor: user.active ? C.success : C.danger },
              ]}
            />
            <Text
              style={[
                s.pillText,
                { color: user.active ? C.success : C.danger },
              ]}
            >
              {user.active ? "Activo" : "Inactivo"}
            </Text>
          </View>

          {user.accountLocked && (
            <View
              style={[
                s.pill,
                {
                  backgroundColor: "rgba(232,160,32,0.12)",
                  borderColor: C.accent,
                },
              ]}
            >
              <Text style={[s.pillText, { color: C.accent }]}>
                🔒 Bloqueado
              </Text>
            </View>
          )}

          <Text style={s.dateText}>Creado {fmtDate(user.createdAt)}</Text>
        </View>

        {/* Acciones */}
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={[s.btn, s.btnPrimary, anyLoading && s.btnDisabled]}
            disabled={anyLoading}
            onPress={() =>
              router.push(`/(dashboard)/usuarios/${user.id}` as any)
            }
          >
            <Text style={s.btnPrimaryText}>Editar</Text>
          </TouchableOpacity>

          {user.accountLocked && (
            <TouchableOpacity
              style={[s.btn, s.btnAccent, anyLoading && s.btnDisabled]}
              disabled={anyLoading}
              onPress={() => handleUnlock(user)}
            >
              {isUnlockLoading ? (
                <ActivityIndicator size="small" color={C.accent} />
              ) : (
                <Text style={s.btnAccentText}>Desbloquear</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              s.btn,
              user.active ? s.btnWarn : s.btnSuccess,
              anyLoading && s.btnDisabled,
            ]}
            disabled={anyLoading}
            onPress={() => handleToggleStatus(user)}
          >
            {isStatusLoading ? (
              <ActivityIndicator
                size="small"
                color={user.active ? C.danger : C.success}
              />
            ) : (
              <Text style={user.active ? s.btnWarnText : s.btnSuccessText}>
                {user.active ? "Deshabilitar" : "Habilitar"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, s.btnDanger, anyLoading && s.btnDisabled]}
            disabled={anyLoading}
            onPress={() => handleDelete(user)}
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

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* Toast flota sobre todo el contenido */}
      <Toast />

      {/* ── Cabecera ── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Gestión de usuarios</Text>
          <Text style={s.subtitle}>
            {totalItems} usuario{totalItems !== 1 ? "s" : ""} registrados
          </Text>
        </View>
        <TouchableOpacity
          style={s.newBtn}
          onPress={() => router.push("/(dashboard)/usuarios/nuevo" as any)}
        >
          <Text style={s.newBtnText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* ── Filtros ── */}
      <View style={s.filters}>
        <View style={s.searchWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Buscar por nombre, email o usuario..."
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
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
              ["", "Todos"],
              ["ADMIN", "Admin"],
              ["DOCENTE", "Docente"],
              ["ESTUDIANTE", "Estudiante"],
            ] as const
          ).map(([val, label]) => (
            <TouchableOpacity
              key={val}
              style={[s.chip, roleFilter === val && s.chipActive]}
              onPress={() => setRoleFilter(val)}
            >
              <Text
                style={[s.chipText, roleFilter === val && s.chipTextActive]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={s.chipDivider} />
          {(
            [
              [null, "Estado"],
              [true, "Activos"],
              [false, "Inactivos"],
            ] as const
          ).map(([val, label]) => (
            <TouchableOpacity
              key={String(val)}
              style={[s.chip, activeFilter === val && s.chipActive]}
              onPress={() => setActiveFilter(val)}
            >
              <Text
                style={[s.chipText, activeFilter === val && s.chipTextActive]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Lista ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.navyMd} />
        </View>
      ) : users.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>👥</Text>
          <Text style={s.emptyTitle}>No se encontraron usuarios</Text>
          <Text style={s.emptyText}>
            Intenta cambiar los filtros o crea uno nuevo.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={s.list}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        >
          {users.map(renderCard)}

          {totalPages > 1 && (
            <View style={s.pagination}>
              <TouchableOpacity
                style={[s.pageBtn, page === 0 && s.pageBtnDisabled]}
                disabled={page === 0}
                onPress={() => load(page - 1)}
              >
                <Text style={s.pageBtnText}>‹ Anterior</Text>
              </TouchableOpacity>

              <Text style={s.pageInfo}>
                {page + 1} / {totalPages}
              </Text>

              <TouchableOpacity
                style={[s.pageBtn, page >= totalPages - 1 && s.pageBtnDisabled]}
                disabled={page >= totalPages - 1}
                onPress={() => load(page + 1)}
              >
                <Text style={s.pageBtnText}>Siguiente ›</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
    paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "800", color: C.navy },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 2 },
  newBtn: {
    backgroundColor: C.navyMd,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: -6,
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
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

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
    ...Platform.select({
      web: { outlineStyle: "none" } as any,
    }),
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
  chipDivider: {
    width: 1,
    backgroundColor: C.border,
    marginRight: 8,
    marginVertical: 4,
  },

  // Lista
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
    paddingTop: 4,
  },

  // Tarjeta
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
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  avatarText: { fontWeight: "800", fontSize: 15 },
  cardInfo: { flex: 1, gap: 2 },
  cardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardName: { fontSize: 15, fontWeight: "700", color: C.navy, flexShrink: 1 },
  cardEmail: { fontSize: 12.5, color: C.sub },
  cardUsername: { fontSize: 11.5, color: C.muted },

  // Badges y pills
  badge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
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
  btnAccent: {
    backgroundColor: "rgba(232,160,32,0.10)",
    borderColor: C.accent,
  },
  btnAccentText: { fontSize: 12, fontWeight: "700", color: C.accent },
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
