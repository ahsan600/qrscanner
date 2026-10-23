import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SplashScreen as CapSplash } from '@capacitor/splash-screen';
import { APP_NAME, APP_TAGLINE } from '../utils/constants';
import { t } from '../utils/i18n';
import { IonIcon } from '@ionic/react';
import { scanOutline } from 'ionicons/icons';

interface SplashProps {
  onComplete: () => void;
}

const Splash: React.FC<SplashProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState(0); // 0: logo, 1: text, 2: done

  useEffect(() => {
    // Hide native splash
    CapSplash.hide().catch(() => {});

    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => onComplete(), 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase < 2 && (
        <motion.div
          className="splash-screen"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="splash-glow" />

          <motion.div
            className="splash-logo"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Scan bracket corners */}
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <path d="M5 20V8C5 6.34 6.34 5 8 5H20" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round" />
              <path d="M40 5H52C53.66 5 55 6.34 55 8V20" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round" />
              <path d="M55 40V52C55 53.66 53.66 55 52 55H40" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round" />
              <path d="M20 55H8C6.34 55 5 53.66 5 52V40" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round" />
              {/* QR-like dots */}
              <rect x="14" y="14" width="10" height="10" rx="2" fill="url(#grad)" />
              <rect x="36" y="14" width="10" height="10" rx="2" fill="url(#grad)" />
              <rect x="14" y="36" width="10" height="10" rx="2" fill="url(#grad)" />
              <rect x="28" y="28" width="5" height="5" rx="1" fill="url(#grad)" />
              <rect x="38" y="38" width="8" height="8" rx="2" fill="url(#grad)" opacity="0.6" />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="60" y2="60">
                  <stop stopColor="var(--primary)" />
                  <stop offset="1" stopColor="var(--primary-2)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="splash-laser" />
          </motion.div>

          {phase >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ textAlign: 'center', marginTop: '20px', zIndex: 1 }}
            >
              <div className="text-display">{APP_NAME}</div>
              <div className="text-caption" style={{ marginTop: '8px' }}>
                {t('app.tagline')}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Splash;
