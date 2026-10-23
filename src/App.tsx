import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IonApp, setupIonicReact, IonIcon } from '@ionic/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  timeOutline,
  scanOutline,
  addCircleOutline,
  settingsOutline,
} from 'ionicons/icons';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/* Ionic core styles */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.class.css';

/* Theme variables and base styles */
import './theme/variables.css';

/* Stores and services */
import { useSettingsStore } from './store/useSettingsStore';
import { historyRepo } from './services/historyRepo';
import { monetizationService } from './services/monetization';
import { ACCENT_COLORS } from './utils/constants';
import { t } from './utils/i18n';

/* Screens */
import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Scanner from './pages/Scanner';
import History from './pages/History';
import Generator from './pages/Generator';
import Settings from './pages/Settings';
import { Toast } from './components/ui';
import { RewardModal } from './components/sponsor';

setupIonicReact({
  mode: 'md', // Consistent modern Android Material 3 feel
});

type Tab = 'history' | 'scan' | 'create' | 'settings';

const App: React.FC = () => {
  const { loadSettings, hasOnboarded, theme, accentColor, adsEnabled } = useSettingsStore();

  const [isInitializing, setIsInitializing] = useState(true);
  const [splashFinished, setSplashFinished] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('scan');

  // Back button press-twice-to-exit
  const lastBackPressRef = useRef<number>(0);
  const [exitToastVisible, setExitToastVisible] = useState(false);

  // Initialize DB and load settings
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([historyRepo.init(), loadSettings(), monetizationService.initialize()]);
      } catch (e) {
        console.error('Initialization error', e);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, [loadSettings]);

  // Apply theme dynamically
  useEffect(() => {
    const applyTheme = (isDark: boolean) => {
      document.documentElement.classList.toggle('ion-palette-dark', isDark);
      document.documentElement.classList.toggle('dark', isDark);
      document.body.classList.toggle('dark-theme', isDark);
      document.body.classList.toggle('light-theme', !isDark);
    };

    if (theme === 'dark') {
      applyTheme(true);
    } else if (theme === 'light') {
      applyTheme(false);
    } else {
      // System
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mql.matches);
      if (mql && typeof mql.addEventListener === 'function') {
        const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
        mql.addEventListener('change', listener);
        return () => mql.removeEventListener('change', listener);
      }
    }
  }, [theme]);

  // Apply accent color dynamically
  useEffect(() => {
    const colorObj = ACCENT_COLORS.find((c) => c.label === accentColor);
    if (colorObj) {
      document.documentElement.style.setProperty('--primary', colorObj.primary);
      document.documentElement.style.setProperty(
        '--primary-gradient',
        `linear-gradient(135deg, ${colorObj.primary}, ${colorObj.primaryDark})`
      );
    }
  }, [accentColor]);

  // Handle Android back button
  useEffect(() => {
    const backListener = CapApp.addListener('backButton', () => {
      if (showOnboarding) {
        return; // Don't exit from onboarding
      }

      if (activeTab !== 'scan') {
        // Go back to Scanner tab
        setActiveTab('scan');
        return;
      }

      // On scanner tab: press twice to exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        CapApp.exitApp();
      } else {
        lastBackPressRef.current = now;
        setExitToastVisible(true);
        setTimeout(() => setExitToastVisible(false), 2000);
      }
    });

    return () => {
      backListener.then((l) => l.remove());
    };
  }, [activeTab, showOnboarding]);

  // Preload and show App Open Ad on resume / foreground transition
  useEffect(() => {
    monetizationService.preloadAppOpen().catch(() => {});

    const stateListener = CapApp.addListener('appStateChange', async (state) => {
      if (state.isActive && !showSplash && !showOnboarding) {
        await monetizationService.showAppOpenIfEligible(20);
      }
    });

    return () => {
      stateListener.then((l) => l.remove());
    };
  }, [showSplash, showOnboarding]);

  // Manage native top banner lifecycle
  useEffect(() => {
    if (!showSplash && !showOnboarding && !isInitializing) {
      if (adsEnabled && monetizationService.areAdsActive()) {
        monetizationService.showNativeBanner().catch(() => {});
      } else {
        monetizationService.removeNativeBanner().catch(() => {});
      }
    }
  }, [showSplash, showOnboarding, isInitializing, adsEnabled]);

  const handleSplashComplete = useCallback(() => {
    setSplashFinished(true);
  }, []);

  // When BOTH splash animation and storage load finish, decide on onboarding
  useEffect(() => {
    if (splashFinished && !isInitializing) {
      setShowSplash(false);
      const isAlreadyOnboarded = useSettingsStore.getState().hasOnboarded;
      if (!isAlreadyOnboarded) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    }
  }, [splashFinished, isInitializing]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    setActiveTab('scan');
  }, []);

  const handleTabChange = useCallback(async (tab: Tab) => {
    await Haptics.impact({ style: ImpactStyle.Light });
    setActiveTab(tab);
  }, []);

  return (
    <IonApp>
      {/* 1. Splash Screen */}
      <AnimatePresence>
        {showSplash && <Splash onComplete={handleSplashComplete} />}
      </AnimatePresence>

      {/* 2. Onboarding Screen */}
      <AnimatePresence>
        {!showSplash && showOnboarding && (
          <Onboarding onComplete={handleOnboardingComplete} />
        )}
      </AnimatePresence>

      {/* 3. Main App Container */}
      {!showSplash && !showOnboarding && !isInitializing && (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
          {/* Simulated Web Top Banner (Preview only, native uses real AdMob Top Banner) */}
          {!Capacitor.isNativePlatform() && adsEnabled && monetizationService.areAdsActive() && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: 50,
                background: 'rgba(15, 23, 42, 0.95)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 12,
                fontWeight: 600,
                zIndex: 999,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span
                style={{
                  background: '#00D097',
                  color: '#0B0F1A',
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
              >
                TEST AD
              </span>
              <span>Google AdMob Adaptive Top Banner (320x50)</span>
            </div>
          )}

          {/* Active Tab Screen */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {activeTab === 'history' && <History onNavigateToScan={() => handleTabChange('scan')} />}
            {activeTab === 'scan' && <Scanner />}
            {activeTab === 'create' && <Generator />}
            {activeTab === 'settings' && <Settings onReplayOnboarding={() => setShowOnboarding(true)} />}
          </div>

          {/* Floating Glass Bottom Tab Bar */}
          <nav className="sp-tab-bar" aria-label="Bottom Navigation">
            {/* History Tab */}
            <button
              className={`sp-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => handleTabChange('history')}
              aria-label="History"
            >
              <IonIcon icon={timeOutline} className="sp-tab-icon" />
              <span className="sp-tab-label">{t('tab.history')}</span>
            </button>

            {/* Scan Tab (Raised Center FAB) */}
            <div className="sp-tab-scan">
              <motion.button
                whileTap={{ scale: 0.92 }}
                className={`sp-tab-scan-btn ${activeTab === 'scan' ? 'active' : ''}`}
                onClick={() => handleTabChange('scan')}
                aria-label="Scan"
              >
                <IonIcon icon={scanOutline} />
              </motion.button>
            </div>

            {/* Create Tab */}
            <button
              className={`sp-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => handleTabChange('create')}
              aria-label="Create"
            >
              <IonIcon icon={addCircleOutline} className="sp-tab-icon" />
              <span className="sp-tab-label">{t('tab.create')}</span>
            </button>

            {/* Settings Tab */}
            <button
              className={`sp-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleTabChange('settings')}
              aria-label="Settings"
            >
              <IonIcon icon={settingsOutline} className="sp-tab-icon" />
              <span className="sp-tab-label">{t('tab.settings')}</span>
            </button>
          </nav>

          {/* Exit app hint toast */}
          <Toast
            message="Press back again to exit"
            visible={exitToastVisible}
            type="info"
          />
        </div>
      )}

      {/* Global Web/Preview Simulator */}
      <RewardModal />
    </IonApp>
  );
};

export default App;
