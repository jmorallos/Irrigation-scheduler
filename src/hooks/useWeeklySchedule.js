import { useState, useEffect } from 'react';
import { loadWeeklyScheduleGroups } from '../utils/weeklyScheduleData';

export function useWeeklySchedule() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setGroups(await loadWeeklyScheduleGroups());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { groups, loading };
}
