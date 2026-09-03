import { useState, useEffect } from 'react';
import { loadWeeklyScheduleGroups } from '../utils/weeklyScheduleData';

export function useWeeklySchedule(referenceDate = new Date()) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const referenceMs = referenceDate instanceof Date ? referenceDate.getTime() : Number(referenceDate);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const next = await loadWeeklyScheduleGroups(new Date(referenceMs));
        if (!cancelled) setGroups(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [referenceMs]);

  return { groups, loading };
}
