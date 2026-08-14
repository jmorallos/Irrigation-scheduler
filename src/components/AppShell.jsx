import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, CalendarDays, Settings, Droplets } from 'lucide-react';

const NAV = [
  { to: '/programs', label: 'Programs', icon: List, exact: false },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays, exact: true },
  { to: '/summary', label: 'Summary', icon: LayoutDashboard, exact: true },
  { to: '/settings', label: 'Settings', icon: Settings, exact: true },
];

function isActive(to, exact, pathname) {
  return exact ? pathname === to : pathname.startsWith(to);
}

export default function AppShell({ children }) {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen min-w-0 bg-slate-50 overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-900 text-white fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Droplets className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold text-white leading-tight">Irrigation<br />Scheduler</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(item => {
            const active = isActive(item.to, item.exact, pathname);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-green-400' : ''}`} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-500">Irrigation Scheduler</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900 flex items-center gap-2 px-4 py-3.5">
        <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Droplets className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold text-white truncate">Irrigation Scheduler</span>
      </div>

      {/* Content area */}
      <main className="flex-1 min-w-0 w-full md:ml-56 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen overflow-x-hidden">
        <div className="max-w-5xl mx-auto w-full min-w-0 px-3 py-4 sm:p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex">
        {NAV.map(item => {
          const active = isActive(item.to, item.exact, pathname);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 text-xs font-medium gap-1 transition-colors ${
                active ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
