import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';

function MenuItem({ item, onClose }) {
  const base = 'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors';
  const styles = item.danger
    ? 'text-red-600 hover:bg-red-50'
    : 'text-slate-700 hover:bg-surface-alt';

  const content = (
    <>
      {item.icon && <item.icon className="w-4 h-4 flex-shrink-0 opacity-70" />}
      {item.label}
    </>
  );

  if (item.to) {
    return (
      <Link to={item.to} className={`${base} ${styles}`} onClick={onClose}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={`${base} ${styles}`} onClick={() => { item.onClick?.(); onClose(); }}>
      {content}
    </button>
  );
}

export default function ActionMenu({ items, label = 'Actions' }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 176;
    setPosition({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - menuWidth),
    });
  };

  const toggle = () => {
    if (!open) updatePosition();
    setOpen(prev => !prev);
  };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onPointerDown = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`p-2 rounded-lg transition-colors ${
          open
            ? 'text-navy-900 bg-surface-alt'
            : 'text-slate-400 hover:text-navy-900 hover:bg-surface-alt'
        }`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 w-44 py-1 bg-white rounded-lg border border-slate-200 shadow-lg"
          style={{ top: position.top, left: position.left }}
        >
          {items.map(item => (
            <MenuItem key={item.label} item={item} onClose={() => setOpen(false)} />
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
