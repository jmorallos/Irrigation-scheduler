import { useEffect, useState } from 'react';
import { PHONE_LANDSCAPE_MQ, isPhoneLandscape } from '../utils/phoneLandscape';

export default function usePhoneLandscape() {
  const [match, setMatch] = useState(isPhoneLandscape);

  useEffect(() => {
    const mq = window.matchMedia(PHONE_LANDSCAPE_MQ);
    const sync = () => setMatch(mq.matches);
    const delayed = () => requestAnimationFrame(sync);

    mq.addEventListener('change', delayed);
    window.addEventListener('orientationchange', delayed);
    window.addEventListener('resize', delayed);
    sync();

    return () => {
      mq.removeEventListener('change', delayed);
      window.removeEventListener('orientationchange', delayed);
      window.removeEventListener('resize', delayed);
    };
  }, []);

  return match;
}
