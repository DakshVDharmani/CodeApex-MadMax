import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { CustomCursor } from "./CustomCursor";
import {
  ShieldAlert,
  Settings,
  LogOut,
  Home,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import MadMaxChatOrb from "./MadMaxChatOrb";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

/* =========================
   Sidebar Item with Hover Effects
========================= */
const SidebarItem = ({
  to,
  icon: Icon,
  label,
  active,
  onClick,
  collapsed,
}: {
  to?: string;
  icon: any;
  label: string;
  active: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const content = (
    <motion.div
      className={clsx(
        "relative flex items-center gap-4 font-mono transition-all cursor-pointer group overflow-hidden",
        collapsed ? "px-3 py-4 justify-center" : "px-6 py-4",
        active
          ? "text-red-600 font-semibold"
          : "text-slate-600 hover:text-slate-900"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ x: 6 }}
      transition={{ duration: 0.2 }}
    >
      {/* Active indicator */}
      {active && (
        <>
          <motion.div
            layoutId="active-pill"
            className="absolute inset-0 bg-red-50 border-l-2 border-red-600"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <motion.div
            className="absolute left-0 inset-y-0 w-0.5 bg-red-600"
            layoutId="active-glow"
          />
        </>
      )}

      {/* Icon */}
      <motion.div
        animate={{ rotate: active ? [0, 4, -4, 0] : 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <Icon className={clsx("w-5 h-5", active && "text-red-600")} />
      </motion.div>

      {/* Label */}
      {!collapsed && (
        <span className="relative z-10 text-sm tracking-tight font-medium">
          {label}
        </span>
      )}
    </motion.div>
  );

  return to ? <Link to={to}>{content}</Link> : <div>{content}</div>;
};

/* =========================
   Main Layout - Light Mode
========================= */
export const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isAuthPage = ["/login", "/signup"].includes(location.pathname);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-hidden">
      <CustomCursor />

      {isAuthPage ? (
        <Outlet />
      ) : (
        <div className="flex h-screen relative">
          {/* =========================
              SIDEBAR (Light Mode)
          ========================= */}
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={clsx(
              "hidden md:flex flex-col border-r border-slate-200 z-30 relative transition-all duration-300",
              sidebarCollapsed ? "w-20" : "w-80"
            )}
            style={{
              background: "#ffffff",
            }}
          >
            {/* Toggle button */}
            <motion.button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-2 text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 hover:border-slate-300 rounded-lg bg-white z-40"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <motion.div
                animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronRight className="w-4 h-4" />
              </motion.div>
            </motion.button>

            {/* Header */}
            <div className={clsx(
              "border-b border-slate-200 relative transition-all duration-300",
              sidebarCollapsed ? "px-4 py-5" : "px-8 py-8"
            )}>
              <div className="flex items-center gap-3 mb-4">
                {!sidebarCollapsed && (
                  <h1
                    className="text-4xl font-bold tracking-tight"
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      background: 'linear-gradient(135deg, #0f172a 0%, #ef4444 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    MadMax
                  </h1>
                )}
              </div>

              {!sidebarCollapsed && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 tracking-[0.25em] uppercase font-medium">
                    Fake News &amp; Misinformation Detection
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <p className="text-[10px] text-red-600 tracking-widest uppercase font-medium">
                      Analysis Interface
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-4 space-y-1">
              <SidebarItem
                to="/home"
                icon={Home}
                label="Dashboard"
                active={location.pathname === "/home"}
                collapsed={sidebarCollapsed}
              />
              <SidebarItem
                to="/home/misinfo"
                icon={ShieldAlert}
                label="Misinformation Analysis"
                active={location.pathname === "/home/misinfo"}
                collapsed={sidebarCollapsed}
              />
              <SidebarItem
                to="/home/fakemedia"
                icon={ShieldAlert}
                label="Fake Media Detection"
                active={location.pathname === "/home/fakemedia"}
                collapsed={sidebarCollapsed}
              />
              <SidebarItem
                to="/home/settings"
                icon={Settings}
                label="Settings"
                active={location.pathname === "/home/settings"}
                collapsed={sidebarCollapsed}
              />
            </nav>

            {/* Footer */}
            <div className={clsx(
              "border-t border-slate-200 transition-all duration-300",
              sidebarCollapsed ? "px-4 py-6" : "px-8 py-8"
            )}>
              <motion.button
                onClick={handleLogout}
                className={clsx(
                  "flex items-center gap-3 text-slate-500 hover:text-red-600 transition-colors text-sm tracking-wider font-medium border border-slate-200 hover:border-red-200 rounded-xl bg-white hover:bg-red-50 w-full",
                  sidebarCollapsed ? "justify-center px-3 py-3" : "px-5 py-3"
                )}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <LogOut className="w-4 h-4" />
                {!sidebarCollapsed && <span>Log Out</span>}
              </motion.button>

              {!sidebarCollapsed && (
                <p className="text-center mt-6 text-[10px] text-slate-400 tracking-widest">
                  MADMAX PROTOCOL
                </p>
              )}
            </div>
          </motion.aside>

          {/* =========================
              MAIN CONTENT AREA
          ========================= */}
          <main className="flex-1 overflow-y-auto bg-white">
            <div className="min-h-full p-8 md:p-12">
              <Outlet />
            </div>
          </main>

          {/* Global Chatbot */}
          <MadMaxChatOrb />
        </div>
      )}

      {/* Google Fonts Import (matching HomePage) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        body {
          font-family: 'Inter', system-ui, sans-serif;
        }
      `}</style>
    </div>
  );
};