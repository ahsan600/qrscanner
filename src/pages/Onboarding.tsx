import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IonIcon } from '@ionic/react';
import {
  arrowForwardOutline,
  sparklesOutline,
  scanOutline,
  qrCodeOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { t } from '../utils/i18n';
import { AppButton } from '../components/ui';
import { scannerService } from '../services/scanner';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useSettingsStore, type SettingsState } from '../store/useSettingsStore';

interface OnboardingProps {
  onComplete: () => void;
}

/* ==================== SLIDE 1: SCANNER HERO ==================== */
const ScannerIllustration: React.FC = () => {
  return (
    <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Ambient Pulsing Aura */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 208, 151, 0.35) 0%, rgba(0, 150, 104, 0.12) 50%, transparent 72%)',
          filter: 'blur(24px)',
          zIndex: 0,
        }}
      />

      {/* Decorative Rotating Orbit */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: 196,
          height: 196,
          borderRadius: '50%',
          border: '1.5px dashed rgba(0, 208, 151, 0.25)',
          zIndex: 1,
        }}
      />

      {/* Floating Sparkle */}
      <motion.div
        animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: 16, right: 18, zIndex: 3, color: '#00D097' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </motion.div>

      {/* Floating Chips */}
      <motion.div
        animate={{ y: [0, -5, 0], x: [0, 2, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 14,
          left: 4,
          background: 'var(--surface)',
          padding: '4px 10px',
          borderRadius: 14,
          fontSize: 10,
          fontWeight: 700,
          color: '#009668',
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0, 208, 151, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          zIndex: 4,
        }}
      >
        <span style={{ fontSize: 11 }}>⚡</span>
        <span>Instant 0.1s Scan</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, 5, 0], x: [0, -2, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{
          position: 'absolute',
          bottom: 12,
          right: 4,
          background: 'var(--surface)',
          padding: '4px 11px',
          borderRadius: 14,
          fontSize: 10,
          fontWeight: 700,
          color: '#009668',
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0, 208, 151, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          zIndex: 4,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00D097', boxShadow: '0 0 8px #00D097' }} />
        <span>Auto-Detect Formats</span>
      </motion.div>

      {/* Main Glassmorphic Card Container */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          width: 154,
          height: 154,
          borderRadius: 40,
          background: 'color-mix(in srgb, var(--surface) 92%, #00D097 8%)',
          border: '1.5px solid rgba(0, 208, 151, 0.32)',
          boxShadow: '0 20px 40px -10px rgba(0, 208, 151, 0.28), 0 2px 8px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        {/* Inner Laser Clipping Box */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 40,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {/* Animated Laser Beam */}
          <motion.div
            animate={{ y: [-48, 48, -48] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: '50%',
              left: 20,
              right: 20,
              height: 2.5,
              background: 'linear-gradient(90deg, transparent, #00D097, #FFFFFF, #00D097, transparent)',
              boxShadow: '0 0 14px #00D097, 0 0 5px #FFFFFF',
              zIndex: 4,
            }}
          />
        </div>

        {/* Viewfinder Target & QR Pattern */}
        <svg width="96" height="96" viewBox="0 0 90 90" fill="none" style={{ zIndex: 3 }}>
          {/* 4 Corner Target Brackets */}
          <path d="M 12 28 L 12 16 C 12 13.8 13.8 12 16 12 L 28 12" stroke="#00D097" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 62 12 L 74 12 C 76.2 12 78 13.8 78 16 L 78 28" stroke="#00D097" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 78 62 L 78 74 C 78 76.2 76.2 78 74 78 L 62 78" stroke="#00D097" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 28 78 L 16 78 C 13.8 78 12 76.2 12 74 L 12 62" stroke="#00D097" strokeWidth="4.5" strokeLinecap="round" />

          {/* Stylized QR Matrix Pattern */}
          <rect x="24" y="24" width="14" height="14" rx="3" fill="#00D097" />
          <rect x="27" y="27" width="8" height="8" rx="1.5" fill="var(--surface)" />
          <rect x="52" y="24" width="14" height="14" rx="3" fill="#00D097" />
          <rect x="55" y="27" width="8" height="8" rx="1.5" fill="var(--surface)" />
          <rect x="24" y="52" width="14" height="14" rx="3" fill="#00D097" />
          <rect x="27" y="55" width="8" height="8" rx="1.5" fill="var(--surface)" />

          {/* Data Modules */}
          <rect x="42" y="25" width="5" height="5" rx="1.5" fill="#009668" />
          <rect x="42" y="34" width="5" height="5" rx="1.5" fill="#00D097" />
          <rect x="42" y="52" width="5" height="5" rx="1.5" fill="#00D097" />
          <rect x="42" y="61" width="5" height="5" rx="1.5" fill="#009668" />
          <rect x="52" y="43" width="5" height="5" rx="1.5" fill="#00D097" />
          <rect x="61" y="43" width="5" height="5" rx="1.5" fill="#009668" />
          <rect x="53" y="53" width="6" height="6" rx="2" fill="#00D097" />
          <rect x="61" y="61" width="6" height="6" rx="2" fill="#00D097" />
        </svg>
      </motion.div>
    </div>
  );
};

/* ==================== SLIDE 2: GENERATOR HERO ==================== */
const GeneratorIllustration: React.FC = () => {
  return (
    <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Ambient Pulsing Aura */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.8, 0.45] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(0, 208, 151, 0.15) 50%, transparent 72%)',
          filter: 'blur(24px)',
          zIndex: 0,
        }}
      />

      {/* Decorative Rotating Orbit */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: 196,
          height: 196,
          borderRadius: '50%',
          border: '1.5px dashed rgba(56, 189, 248, 0.28)',
          zIndex: 1,
        }}
      />

      {/* Floating Sparkle */}
      <motion.div
        animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: 16, right: 18, zIndex: 3, color: '#38BDF8' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </motion.div>

      {/* Floating Chips */}
      <motion.div
        animate={{ y: [0, -5, 0], x: [0, 2, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 14,
          left: 4,
          background: 'var(--surface)',
          padding: '4px 10px',
          borderRadius: 14,
          fontSize: 10,
          fontWeight: 700,
          color: '#0284C7',
          boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          zIndex: 4,
        }}
      >
        <span>📶</span>
        <span>Wi-Fi & GPS</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, 5, 0], x: [0, -2, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{
          position: 'absolute',
          bottom: 12,
          right: 4,
          background: 'var(--surface)',
          padding: '4px 10px',
          borderRadius: 14,
          fontSize: 10,
          fontWeight: 700,
          color: '#009668',
          boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
          border: '1px solid rgba(0, 208, 151, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          zIndex: 4,
        }}
      >
        <span>🎨</span>
        <span>9+ Formats & Colors</span>
      </motion.div>

      {/* Main Glassmorphic Card Container */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          width: 154,
          height: 154,
          borderRadius: 40,
          background: 'color-mix(in srgb, var(--surface) 92%, #38BDF8 8%)',
          border: '1.5px solid rgba(56, 189, 248, 0.32)',
          boxShadow: '0 20px 40px -10px rgba(56, 189, 248, 0.28), 0 2px 8px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          zIndex: 2,
        }}
      >
        {/* QR Pattern Icon Matrix */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="68" height="68" viewBox="0 0 70 70" fill="none">
            <rect x="6" y="6" width="22" height="22" rx="5" fill="#0284C7" />
            <rect x="11" y="11" width="12" height="12" rx="3" fill="var(--surface)" />
            <rect x="14" y="14" width="6" height="6" rx="1.5" fill="#38BDF8" />

            <rect x="42" y="6" width="22" height="22" rx="5" fill="#0284C7" />
            <rect x="47" y="11" width="12" height="12" rx="3" fill="var(--surface)" />
            <rect x="50" y="14" width="6" height="6" rx="1.5" fill="#38BDF8" />

            <rect x="6" y="42" width="22" height="22" rx="5" fill="#0284C7" />
            <rect x="11" y="47" width="12" height="12" rx="3" fill="var(--surface)" />
            <rect x="14" y="50" width="6" height="6" rx="1.5" fill="#38BDF8" />

            <rect x="34" y="34" width="7" height="7" rx="2" fill="#00D097" />
            <rect x="47" y="34" width="7" height="7" rx="2" fill="#38BDF8" />
            <rect x="34" y="47" width="7" height="7" rx="2" fill="#00D097" />
            <rect x="57" y="47" width="7" height="7" rx="2" fill="#0284C7" />
            <rect x="47" y="57" width="7" height="7" rx="2" fill="#00D097" />
            <rect x="57" y="57" width="7" height="7" rx="2" fill="#38BDF8" />
          </svg>
        </div>

        {/* Barcode Strip */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 16 }}>
          {[3, 1.5, 4, 1.5, 3, 2, 4, 1.5, 3, 1.5, 4, 2].map((w, idx) => (
            <div
              key={idx}
              style={{
                width: w,
                height: 16,
                borderRadius: 1,
                background: idx % 3 === 0 ? '#00D097' : '#0284C7',
                opacity: 0.85,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

/* ==================== SLIDE 3: PRIVACY SHIELD HERO ==================== */
const ShieldIllustration: React.FC = () => {
  return (
    <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Ambient Pulsing Aura */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.38) 0%, rgba(0, 208, 151, 0.16) 50%, transparent 72%)',
          filter: 'blur(24px)',
          zIndex: 0,
        }}
      />

      {/* Decorative Rotating Orbital Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: 196,
          height: 196,
          borderRadius: '50%',
          border: '1.5px dashed rgba(16, 185, 129, 0.3)',
          zIndex: 1,
        }}
      />

      {/* Floating Sparkles */}
      <motion.div
        animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: 14, left: 18, zIndex: 3, color: '#00D097' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </motion.div>

      {/* Floating Chips */}
      <motion.div
        animate={{ y: [0, -5, 0], x: [0, 2, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 14,
          left: 4,
          background: 'var(--surface)',
          padding: '4px 10px',
          borderRadius: 14,
          fontSize: 10,
          fontWeight: 700,
          color: '#059669',
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          zIndex: 4,
        }}
      >
        <span>🔒</span>
        <span>100% Offline Vault</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, 5, 0], x: [0, -2, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{
          position: 'absolute',
          bottom: 12,
          right: 4,
          background: 'var(--surface)',
          padding: '4px 10px',
          borderRadius: 14,
          fontSize: 10,
          fontWeight: 700,
          color: '#059669',
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          zIndex: 4,
        }}
      >
        <span>✨</span>
        <span>Zero Cloud Tracking</span>
      </motion.div>

      {/* Main Glassmorphic Card Container */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          width: 154,
          height: 154,
          borderRadius: 40,
          background: 'color-mix(in srgb, var(--surface) 92%, #10B981 8%)',
          border: '1.5px solid rgba(16, 185, 129, 0.32)',
          boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.28), 0 2px 8px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        {/* Sculpted SVG Shield */}
        <svg width="86" height="96" viewBox="0 0 100 110" fill="none">
          <defs>
            <linearGradient id="shieldGrad" x1="10" y1="10" x2="90" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00E5A3" />
              <stop offset="50%" stopColor="#00D097" />
              <stop offset="100%" stopColor="#009668" />
            </linearGradient>
            <filter id="shieldShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#009668" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Outer Shield Shell */}
          <path
            d="M 50 12 Q 78 20 86 28 C 86 64 68 88 50 98 C 32 88 14 64 14 28 Q 22 20 50 12 Z"
            fill="url(#shieldGrad)"
            filter="url(#shieldShadow)"
            stroke="rgba(255, 255, 255, 0.65)"
            strokeWidth="2.5"
          />

          {/* Inner Badge Details */}
          <path
            d="M 37 54 L 46 63 L 64 45"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </div>
  );
};

/* ==================== SLIDES CONFIG ==================== */
const slides = [
  {
    id: 'scan',
    icon: scanOutline,
    illustration: <ScannerIllustration />,
    title: 'onboarding.slide1Title',
    desc: 'onboarding.slide1Desc',
    badges: ['⚡ 0.1s Fast Scan', '📦 QR & 1D Barcodes', '🖼 Gallery Import'],
    themeColor: '#00D097',
  },
  {
    id: 'create',
    icon: qrCodeOutline,
    illustration: <GeneratorIllustration />,
    title: 'onboarding.slide2Title',
    desc: 'onboarding.slide2Desc',
    badges: ['📶 Wi-Fi & GPS', '🎨 Custom Colors', '💾 PNG Export'],
    themeColor: '#38BDF8',
  },
  {
    id: 'privacy',
    icon: shieldCheckmarkOutline,
    illustration: <ShieldIllustration />,
    title: 'onboarding.slide3Title',
    desc: 'onboarding.slide3Desc',
    badges: ['🔒 100% Offline', '🗂 Unlimited Archive', '🚫 Zero Tracking'],
    themeColor: '#10B981',
  },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const setSetting = useSettingsStore((s: SettingsState) => s.setSetting);

  const finishOnboarding = useCallback(async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      // Request camera permission on final step for quick scanning setup
      await scannerService.requestPermission().catch(() => {});
    } catch (e) {
      console.warn('Camera request on onboarding completed', e);
    } finally {
      // Persist completion permanently so it never shows again
      await setSetting('hasOnboarded', true);
      onComplete();
    }
  }, [onComplete, setSetting]);

  const handleNext = useCallback(async () => {
    if (currentSlide < slides.length - 1) {
      await Haptics.impact({ style: ImpactStyle.Light });
      setCurrentSlide((s) => s + 1);
    } else {
      await finishOnboarding();
    }
  }, [currentSlide, finishOnboarding]);

  const handleSkip = useCallback(async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
    await setSetting('hasOnboarded', true);
    onComplete();
  }, [onComplete, setSetting]);

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Bar with Step Pill & Skip Button */}
      <div
        style={{
          padding: 'calc(var(--safe-area-top) + 16px) 20px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Step Indicator Badge */}
        <div
          style={{
            padding: '4px 12px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.3px',
          }}
        >
          {currentSlide + 1} / {slides.length}
        </div>

        {/* Skip button */}
        <button
          className="sp-btn sp-btn-ghost"
          onClick={handleSkip}
          style={{ fontSize: 14, fontWeight: 600, padding: '6px 12px', minHeight: 'auto' }}
        >
          {t('onboarding.skip')}
        </button>
      </div>

      {/* Slide content container */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 28px',
              textAlign: 'center',
            }}
          >
            {/* Hero Illustration */}
            <div style={{ marginBottom: 28 }}>
              {slide.illustration}
            </div>

            {/* Slide Title */}
            <motion.h2
              className="text-display"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, margin: '0 0 10px 0' }}
            >
              {t(slide.title)}
            </motion.h2>

            {/* Slide Description */}
            <motion.p
              className="text-body"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5, margin: 0, maxWidth: 320 }}
            >
              {t(slide.desc)}
            </motion.p>

            {/* 3 Feature Pills */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 8,
                marginTop: 20,
                maxWidth: 340,
              }}
            >
              {slide.badges.map((badge, bIdx) => (
                <div
                  key={bIdx}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 12,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}
                >
                  {badge}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Area: Progress Dots & Next / Finish CTA */}
      <div
        style={{
          padding: '20px 24px calc(env(safe-area-inset-bottom, 0px) + 28px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Animated Progress Dots */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', height: 10 }}>
          {slides.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === currentSlide ? 28 : 8,
                background: i === currentSlide ? 'var(--primary)' : 'var(--border)',
              }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              style={{
                height: 8,
                borderRadius: 4,
                cursor: 'pointer',
              }}
              onClick={async () => {
                await Haptics.impact({ style: ImpactStyle.Light });
                setCurrentSlide(i);
              }}
            />
          ))}
        </div>

        {/* Action Button */}
        <AppButton
          variant="primary"
          fullWidth
          onClick={handleNext}
          icon={isLastSlide ? sparklesOutline : arrowForwardOutline}
          style={{ height: 50, fontSize: 16, fontWeight: 700 }}
        >
          {isLastSlide ? t('onboarding.getStarted') : t('onboarding.next')}
        </AppButton>
      </div>
    </div>
  );
};

export default Onboarding;
