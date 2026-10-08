import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  ShoppingBag,
  SquareCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/format";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/insumos", label: "Insumos", icon: Package },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/productos", label: "Productos", icon: ShoppingBag },
  { to: "/tareas", label: "Tareas", icon: SquareCheck },
  { to: "/gastos", label: "Gastos", icon: Receipt },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive ? "bg-raised text-ink" : "text-muted hover:bg-ink/5 hover:text-ink",
              )
            }
          >
            <Icon className="size-[18px]" aria-hidden="true" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const userBlock = (
    <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{user?.nombre ?? "Usuario"}</p>
        <p className="truncate text-xs text-muted">{user?.email}</p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink"
        aria-label="Cerrar sesión"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 border-r border-line bg-sidebar p-5 md:flex">
        <Logo className="w-full" />
        <nav aria-label="Principal" className="flex-1">
          <NavItems />
        </nav>
        {userBlock}
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-sidebar/95 px-4 py-3 backdrop-blur md:hidden">
        <Logo className="w-36" />
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex size-9 items-center justify-center rounded-lg hover:bg-ink/5"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          {mobileOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </header>
      {mobileOpen && (
        <div id="mobile-nav" className="sticky top-[57px] z-10 flex flex-col gap-4 border-b border-line bg-sidebar p-4 md:hidden">
          <nav aria-label="Principal">
            <NavItems onNavigate={() => setMobileOpen(false)} />
          </nav>
          {userBlock}
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}
