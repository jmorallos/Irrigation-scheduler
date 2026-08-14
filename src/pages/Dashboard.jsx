import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, Layers, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { useTodaySchedule } from '../hooks/useTodaySchedule';
import { formatTime, formatDuration } from '../utils/dateUtils';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, active: 0, zones: 0, todayZones: 0 });
  const { items, loading } = useTodaySchedule();

  useEffect(() => {
    async function load() {
      const programs = await programsRepository.getAll();
      const zones = await zonesRepository.getAll();
      setStats({
        total: programs.length,
        active: programs.filter(p => p.status === 'active').length,
        zones: zones.length,
        todayZones: 0,
      });
    }
    load();
  }, []);

  useEffect(() => {
    if (!loading) {
      const uniqueZones = new Set(items.map(i => i.zone.id));
      setStats(s => ({ ...s, todayZones: uniqueZones.size }));
    }
  }, [items, loading]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const STAT_CARDS = [
    { label: 'Total Programs', value: stats.total, icon: Layers, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active Programs', value: stats.active, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
    { label: 'Total Zones', value: stats.zones, icon: Droplets, color: 'bg-teal-50 text-teal-600' },
    { label: "Today's Zones", value: stats.todayZones, icon: Clock, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Summary</h1>
        <p className="mt-1 text-sm text-slate-500">{today}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
              <card.icon className="w-4.5 h-4.5" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{card.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-slate-900">{"Today's Irrigation"}</h2>
          <Link to="/schedule" className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
            Weekly view <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <Droplets className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">No irrigation scheduled today</p>
            <p className="text-xs text-slate-400 mt-1">Add schedules to your zones to see them here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map(item => (
              <div key={item.schedule.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <div className="flex-shrink-0 w-20">
                  <span className="font-mono text-sm font-semibold text-slate-700">{formatTime(item.schedule.start_time)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.program.name}</p>
                  <p className="text-xs text-slate-500">{item.zone.name}</p>
                </div>
                <div className="text-xs font-mono text-slate-500 flex-shrink-0">
                  {formatDuration(item.schedule.duration_minutes)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
