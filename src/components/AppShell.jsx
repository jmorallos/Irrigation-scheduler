import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, CalendarDays, Settings, Droplets, Menu, X, Bookmark } from 'lucide-react';
import usePhoneLandscape from '../hooks/usePhoneLandscape';

const NAV = [
  { to: '/programs', label: 'Programs', icon: List, exact: false },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays, exact: true },
  { to: '/summary', label: 'Summary', icon: LayoutDashboard, exact: true },
  { to: '/saves', label: 'Saves', icon: Bookmark, exact: true },
];

const SYSTEM_NAV = [
  { to: '/settings', label: 'Settings', icon: Settings, exact: true },
];

const ALL_NAV = [...NAV, ...SYSTEM_NAV];

function isActive(to, exact, pathname) {
  return exact ? pathname === to : pathname.startsWith(to);
}

function NavItem({ item, pathname, onClick }) {
  const active = isActive(item.to, item.exact, pathname);
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-navy-900 text-white'
          : 'text-slate-500 hover:text-navy-900 hover:bg-surface-alt'
      }`}
    >
      <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
      {item.label}
    </NavLink>
  );
}

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const phoneLand = usePhoneLandscape();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen min-w-0 bg-surface overflow-x-hidden">
      <aside className={`${phoneLand ? 'hidden' : 'hidden md:flex'} flex-col w-60 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30`}>
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
          <div className="w-9 h-9 bg-navy-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Droplets className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <span className="text-sm font-bold text-navy-900">Irrigation</span>
            <span className="block text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Scheduler</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          <div>
            <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Records</p>
            <div className="space-y-0.5">
              {NAV.map(item => (
                <NavItem key={item.to} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
          <div>
            <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">System</p>
            <div className="space-y-0.5">
              {SYSTEM_NAV.map(item => (
                <NavItem key={item.to} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        </nav>
      </aside>

      <div className={`${phoneLand ? 'hidden' : 'flex md:hidden'} fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-200 items-center gap-2 px-4 py-3.5`}>
        <div className="w-8 h-8 bg-navy-900 rounded-lg flex items-center justify-center flex-shrink-0">
          <Droplets className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-bold text-navy-900 truncate">Irrigation Scheduler</span>
      </div>

      <main className={`flex-1 min-w-0 w-full min-h-screen overflow-x-hidden ${
        phoneLand ? 'ml-0 pt-0 pb-0' : 'md:ml-60 pt-14 md:pt-0 pb-20 md:pb-0'
      }`}>
        <div className={`max-w-6xl mx-auto w-full min-w-0 ${
          phoneLand ? 'px-3 py-3' : 'px-4 py-5 sm:px-6 sm:py-6 md:p-8'
        }`}>
          {children}
        </div>
      </main>

      <nav className={`${phoneLand ? 'hidden' : 'flex md:hidden'} fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200`}>
        {ALL_NAV.map(item => {
          const active = isActive(item.to, item.exact, pathname);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 text-[10px] font-medium gap-1 transition-colors ${
                active ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className={phoneLand ? 'block' : 'hidden'}>
        {menuOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-navy-900/30"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        )}

        {menuOpen && (
          <div className="fixed z-50 bottom-20 right-4 w-56 bg-white rounded-xl border border-slate-200 shadow-xl p-2">
            <p className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Menu</p>
            {ALL_NAV.map(item => (
              <NavItem
                key={item.to}
                item={item}
                pathname={pathname}
                onClick={() => setMenuOpen(false)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen(open => !open)}
          className="fixed z-50 bottom-4 right-4 w-12 h-12 rounded-full bg-navy-900 text-white shadow-lg flex items-center justify-center hover:bg-navy-800 transition-colors"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
