import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import type { ScanMode, ThemeOption } from '../utils/constants';

export interface SettingsState {
  // Scanning
  vibrateOnScan: boolean;
  beepOnScan: boolean;
  autoOpenLinks: boolean;
  batchDefault: boolean;
  duplicateCooldown: number;
  defaultScanMode: ScanMode;
  defaultTorchOn: boolean;

  // History & Privacy
  saveHistory: boolean;
  historyLimit: number;
  productLookup: boolean;

  // Appearance
  theme: ThemeOption;
  accentColor: string;
  reduceMotion: boolean;

  // Onboarding
  hasOnboarded: boolean;
  onboardingVersion: number;

  // Ads & Monetization
  adsEnabled: boolean;
  adsRemovedUntil: number | null;
  adFrequency: number;
  adScanCount: number;
  customBannerAdUnitId: string;
  customInterstitialAdUnitId: string;
  customRewardedAdUnitId: string;
  customAppOpenAdUnitId: string;
  appOpenAdsEnabled: boolean;

  // Actions
  setSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  loadSettings: () => Promise<void>;
}

const SETTINGS_KEY = 'scanpro_settings';

const defaultSettings: Omit<SettingsState, 'setSetting' | 'loadSettings'> = {
  vibrateOnScan: true,
  beepOnScan: false,
  autoOpenLinks: false,
  batchDefault: false,
  duplicateCooldown: 2000,
  defaultScanMode: 'All',
  defaultTorchOn: false,
  saveHistory: true,
  historyLimit: 0,
  productLookup: true,
  theme: 'light',
  accentColor: 'Mint',
  reduceMotion: false,
  hasOnboarded: false,
  onboardingVersion: 2,
  adsEnabled: true,
  adsRemovedUntil: null,
  adFrequency: 2,
  adScanCount: 0,
  customBannerAdUnitId: '',
  customInterstitialAdUnitId: '',
  customRewardedAdUnitId: '',
  customAppOpenAdUnitId: '',
  appOpenAdsEnabled: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaultSettings,

  setSetting: async <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    set({ [key]: value } as Partial<SettingsState>);
    const state = get();
    const toSave = { ...state };
    delete (toSave as Record<string, unknown>)['setSetting'];
    delete (toSave as Record<string, unknown>)['loadSettings'];
    try {
      await Preferences.set({ key: SETTINGS_KEY, value: JSON.stringify(toSave) });
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  },

  loadSettings: async () => {
    try {
      const { value } = await Preferences.get({ key: SETTINGS_KEY });
      if (value) {
        const parsed = JSON.parse(value);
        // Reset onboarding for new v2 onboarding release so user can experience it
        if (!parsed.onboardingVersion || parsed.onboardingVersion < 2) {
          parsed.hasOnboarded = false;
          parsed.onboardingVersion = 2;
        }
        // Default to every 2 scans
        if (!parsed.adFrequency || parsed.adFrequency < 2) {
          parsed.adFrequency = 2;
        }
        set({ ...defaultSettings, ...parsed });
        await Preferences.set({ key: SETTINGS_KEY, value: JSON.stringify({ ...defaultSettings, ...parsed }) });
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  },
}));
