// ── app/(dashboard)/_layout.tsx ─────────────────────────────────────────────
import { Href, Slot, usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_W = 235;
const BREAKPOINT = 768; // < 768px → modo móvil

// ── Colores ────────────────────────────────────────────────────
const NAV = "#1b2257";
const NAV_HOVER = "#252f6e";
const NAV_ACT = "#2d3a82";
const WHITE = "#ffffff";
const MUTED = "#9aa3c8";
const ACCENT = "#e8a020";

// ── Badge por rol ──────────────────────────────────────────────
const ROL_BADGE: Record<string, { label: string; color: string; bg: string }> =
  {
    ADMIN: { label: "Admin", color: "#5DA15E", bg: "rgba(93,161,94,0.18)" },
    DOCENTE: {
      label: "Docente",
      color: "#3ab5a0",
      bg: "rgba(58,181,160,0.18)",
    },
    ESTUDIANTE: {
      label: "Estudiante",
      color: "#5b8dee",
      bg: "rgba(91,141,238,0.18)",
    },
  };

// ── Tipos ──────────────────────────────────────────────────────
type MenuItem = { key: string; label: string; icon: string; route: string };
type MenuSection = { section: string; items: MenuItem[] };

// ── Menús por rol ──────────────────────────────────────────────
const MENU_ADMIN: MenuSection[] = [
  {
    section: "Principal",
    items: [
      {
        key: "inicio",
        label: "Inicio",
        icon: "⊞",
        route: "/(dashboard)/inicio",
      },
      {
        key: "estudiante",
        label: "Estudiantes",
        icon: "👤",
        route: "/(dashboard)/estudiante",
      },
      {
        key: "evaluacion",
        label: "Evaluaciones",
        icon: "📋",
        route: "/(dashboard)/evaluacion",
      },
      {
        key: "calificaciones",
        label: "Mis Calificaciones",
        icon: "★",
        route: "/(dashboard)/calificaciones",
      },
      {
        key: "usuarios",
        label: "Usuarios",
        icon: "👥",
        route: "/(dashboard)/usuarios",
      },
      {
        key: "cursos",
        label: "Cursos",
        icon: "📚",
        route: "/(dashboard)/cursos",
      },
    ],
  },
  {
    section: "Cuenta",
    items: [
      {
        key: "perfil",
        label: "Perfil",
        icon: "◉",
        route: "/(dashboard)/usuarios/perfil",
      },
      { key: "salir", label: "Salir", icon: "⏻", route: "__logout__" },
      {
        key: "limpieza",
        label: "Limpieza",
        icon: "🗑",
        route: "/(dashboard)/limpieza",
      },
    ],
  },
];

const MENU_ESTUDIANTE: MenuSection[] = [
  {
    section: "Principal",
    items: [
      {
        key: "inicio",
        label: "Inicio",
        icon: "⊞",
        route: "/(dashboard)/inicio",
      },
      {
        key: "calificaciones",
        label: "Mis Calificaciones",
        icon: "★",
        route: "/(dashboard)/calificaciones",
      },
    ],
  },
  {
    section: "Cuenta",
    items: [
      {
        key: "perfil",
        label: "Perfil",
        icon: "◉",
        route: "/(dashboard)/usuarios/perfil",
      },
      { key: "salir", label: "Salir", icon: "⏻", route: "__logout__" },
    ],
  },
];

const MENU_DOCENTE: MenuSection[] = [
  {
    section: "Principal",
    items: [
      {
        key: "inicio",
        label: "Inicio",
        icon: "⊞",
        route: "/(dashboard)/inicio",
      },
      {
        key: "estudiante",
        label: "Estudiantes",
        icon: "👤",
        route: "/(dashboard)/estudiante",
      },
      {
        key: "evaluacion",
        label: "Evaluaciones",
        icon: "📋",
        route: "/(dashboard)/evaluacion",
      },
    ],
  },
  {
    section: "Cuenta",
    items: [
      {
        key: "perfil",
        label: "Perfil",
        icon: "◉",
        route: "/(dashboard)/usuarios/perfil",
      },
      { key: "salir", label: "Salir", icon: "⏻", route: "__logout__" },
    ],
  },
];

function getMenu(role: string): MenuSection[] {
  if (role === "ADMIN") return MENU_ADMIN;
  if (role === "DOCENTE") return MENU_DOCENTE;
  return MENU_ESTUDIANTE;
}

// ══════════════════════════════════════════════════════════════
export default function DashboardLayout() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { width: screenW } = useWindowDimensions();

  const isMobile = screenW < BREAKPOINT;

  const [pressed, setPressed] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Animaciones del drawer (solo móvil)
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_W)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Si se rota a web con drawer abierto → cerrarlo
  useEffect(() => {
    if (!isMobile && drawerOpen) closeDrawer();
  }, [isMobile, drawerOpen]);

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 68,
        friction: 11,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: -SIDEBAR_W,
        useNativeDriver: true,
        tension: 68,
        friction: 11,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setDrawerOpen(false));
  };

  const toggleDrawer = () => (drawerOpen ? closeDrawer() : openDrawer());

  // ── Protección de ruta ─────────────────────────────────────
  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login" as Href);
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  const rol = user?.role ?? "ESTUDIANTE";
  const badge = ROL_BADGE[rol] ?? ROL_BADGE.ESTUDIANTE;
  const initial = (user?.fullName ?? user?.email ?? "U")[0].toUpperCase();
  const MENU = getMenu(rol);

  // ── Navegar o cerrar sesión ────────────────────────────────
  const handleNav = async (route: string) => {
    if (route === "__logout__") {
      await logout();
      router.replace("/login" as Href);
      return;
    }
    if (isMobile) closeDrawer();
    router.push(route as Href);
  };

  const isActive = (route: string) =>
    route !== "__logout__" &&
    (pathname === route ||
      pathname.startsWith(route.replace("/(dashboard)", "")));

  // ── Contenido del sidebar convertido a FUNCIÓN (no componente) ──
  // Al retornar JSX directamente evitamos que React desmonte el panel y parpadee el logo.
  const renderSidebar = () => (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.sidebarInner}
        showsVerticalScrollIndicator={false}
      >
        {MENU.map(({ section, items }) => (
          <View key={section} style={styles.menuSection}>
            <Text style={styles.sectionTag}>{section}</Text>
            <View style={styles.sectionLine} />

            {items.map((item) => {
              const active = isActive(item.route);
              const isOut = item.key === "salir";
              const isPres = pressed === item.key;

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.menuItem,
                    active && styles.menuItemActive,
                    isPres && !active && styles.menuItemHover,
                  ]}
                  onPress={() => handleNav(item.route)}
                  onPressIn={() => setPressed(item.key)}
                  onPressOut={() => setPressed(null)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.menuIcon,
                      active && { color: ACCENT },
                      isOut && { color: "#b68c8c" },
                    ]}
                  >
                    {item.icon}
                  </Text>
                  <Text
                    style={[
                      styles.menuLabel,
                      active && styles.menuLabelActive,
                      isOut && styles.menuLabelOut,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.sidebarFooter}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.footerImg}
          resizeMode="contain"
        />
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* ══════════ HEADER (fijo) ══════════ */}
      <View style={styles.header}>
        <View style={[styles.hLeft, isMobile && { paddingLeft: 54 }]}>
          <View>
            <Text
              style={[styles.hInstitution, isMobile && styles.hInstitutionSm]}
            >
              Aula virtual
            </Text>
            <Text style={[styles.hBrand, isMobile && styles.hBrandSm]}>
              SS
            </Text>
          </View>
          {!isMobile && (
            <View
              style={[
                styles.rolBadge,
                { borderColor: badge.color, backgroundColor: badge.bg },
              ]}
            >
              <Text style={[styles.rolBadgeText, { color: badge.color }]}>
                {badge.label}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.hRight}>
          {!isMobile && (
            <Text style={styles.hUserName} numberOfLines={1}>
              {user?.fullName ?? user?.email ?? "Usuario"}
            </Text>
          )}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>
      </View>

      {/* ══════════ BODY ══════════ */}
      <View style={styles.body}>
        {/* ── WEB: sidebar fijo, siempre visible ── */}
        {!isMobile && <View style={styles.sidebar}>{renderSidebar()}</View>}

        {/* ── CONTENIDO ── */}
        <View style={styles.content}>
          <Slot />
        </View>

        {/* ══ MÓVIL ÚNICAMENTE ══ */}
        {isMobile && (
          <>
            {drawerOpen && (
              <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={closeDrawer}
                />
              </Animated.View>
            )}

            <Animated.View
              style={[
                styles.drawer,
                { transform: [{ translateX: slideAnim }] },
              ]}
              pointerEvents={drawerOpen ? "auto" : "none"}
            >
              {renderSidebar()}
            </Animated.View>

            <TouchableOpacity
              style={styles.fab}
              onPress={toggleDrawer}
              activeOpacity={0.82}
            >
              <Text style={styles.fabIcon}>{drawerOpen ? "✕" : "☰"}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: NAV,
  },
  safe: { flex: 1, backgroundColor: NAV },

  // ── HEADER ────────────────────────────────────────────────
  header: {
    height: 62,
    backgroundColor: NAV,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 10 },
      web: { boxShadow: "0 3px 16px rgba(0,0,0,0.4)" } as any,
    }),
  },
  hLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  hInstitution: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
  hInstitutionSm: { fontSize: 11 },
  hBrand: { color: WHITE, fontSize: 20, fontWeight: "800", letterSpacing: 1.8 },
  hBrandSm: { fontSize: 15, letterSpacing: 1.2 },
  rolBadge: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 6,
  },
  rolBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  hRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  hUserName: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "500",
    maxWidth: 160,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: NAV_ACT,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: WHITE, fontSize: 14, fontWeight: "700" },

  // ── BODY ──────────────────────────────────────────────────
  body: { flex: 1, flexDirection: "row", overflow: "hidden" as any },

  // ── SIDEBAR (web, fijo) ───────────────────────────────────
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: NAV,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.06)",
    flexDirection: "column",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 3, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
      web: { boxShadow: "3px 0 20px rgba(0,0,0,0.35)" } as any,
    }),
  },
  sidebarInner: { paddingTop: 12, paddingBottom: 8 },

  menuSection: { marginBottom: 6 },
  sectionTag: {
    color: MUTED,
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 5,
  },
  sectionLine: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginHorizontal: 12,
    marginBottom: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 18,
    marginHorizontal: 8,
    marginVertical: 1,
    borderRadius: 8,
    position: "relative",
  },
  menuItemActive: {
    backgroundColor: NAV_ACT,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      web: { boxShadow: "0 2px 14px rgba(0,0,0,0.45)" } as any,
    }),
  },
  menuItemHover: {
    backgroundColor: NAV_HOVER,
    ...Platform.select({
      web: { boxShadow: "0 1px 8px rgba(0,0,0,0.3)" } as any,
    }),
  },
  activeBorder: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  menuIcon: {
    fontSize: 15,
    color: MUTED,
    width: 22,
    textAlign: "center",
    marginRight: 10,
  },
  menuLabel: { color: MUTED, fontSize: 13, fontWeight: "500", flex: 1 },
  menuLabelActive: { color: WHITE, fontWeight: "700" },
  menuLabelOut: { color: "#e07575" },

  // ── FOOTER SIDEBAR ────────────────────────────────────────
  sidebarFooter: { paddingVertical: 18, alignItems: "center" },
  footerImg: { width: 200, height: 200, opacity: 0.88 },

  // ── CONTENIDO ─────────────────────────────────────────────
  content: {
    flex: 1,
    backgroundColor: "#f0f2f8",
    overflow: "hidden" as any,
  },

  // ── MÓVIL: OVERLAY ────────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 200,
  },

  // ── MÓVIL: DRAWER ─────────────────────────────────────────
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_W,
    backgroundColor: NAV,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.06)",
    flexDirection: "column",
    zIndex: 300,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
      web: { boxShadow: "4px 0 24px rgba(0,0,0,0.5)" } as any,
    }),
  },

  // ── MÓVIL: BOTÓN CIRCULAR FLOTANTE ────────────────────────
  fab: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: NAV_ACT,
    borderWidth: 2,
    borderColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 400,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
      },
      android: { elevation: 12 },
      web: {
        boxShadow: "0 3px 14px rgba(0,0,0,0.45)",
        cursor: "pointer",
      } as any,
    }),
  },
  fabIcon: { color: WHITE, fontSize: 17, fontWeight: "700" },
});
