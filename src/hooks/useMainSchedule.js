import { useState, useEffect } from 'react';
import { loadMainScheduleRows } from '../utils/mainScheduleData';

export function useMainSchedule() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setRows(await loadMainScheduleRows());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { rows, loading };
}
