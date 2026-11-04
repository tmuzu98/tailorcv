import { Link, NavLink, Outlet } from "react-router";
import { ApiStatus } from "../components/ApiStatus";

const steps = [
  { to: "/", label: "1. Upload" },
  { to: "/review", label: "2. Review" },
  { to: "/job", label: "3. Job" },
  { to: "/result", label: "4. Result" },
];

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-lg font-semibold tracking-tight text-indigo-600">
            TailorCV
          </Link>
          {/* Temporary dev navigation; replaced by a real step indicator later */}
          <nav className="flex flex-wrap gap-1 text-sm" aria-label="Steps">
            {steps.map((s) => (
              <NavLink
                key={s.to}
                to={s.to}
                end
                className={({ isActive }) =>
                  `rounded px-2 py-1 ${isActive ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`
                }
              >
                {s.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-slate-500">
          <span>Your resume is processed and not stored.</span>
          <ApiStatus />
        </div>
      </footer>
    </div>
  );
}
