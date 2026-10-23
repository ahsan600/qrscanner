import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
  type BannerAdOptions,
  type AdOptions,
} from '@capacitor-community/admob';
import { useSettingsStore } from '../store/useSettingsStore';

// Official Production / Configured Ad Unit IDs
export const ADMOB_SAMPLE_AD_UNITS = {
  android: {
    banner: 'ca-app-pub-1502330259134866/9541983443',
    interstitial: 'ca-app-pub-1502330259134866/2234253346',
    rewarded: 'ca-app-pub-1502330259134866/8687981054',
    appOpen: 'ca-app-pub-1502330259134866/2122572708',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    appOpen: 'ca-app-pub-3940256099942544/5575463023',
  },
};

export type MonetizationType = 'banner' | 'interstitial' | 'rewarded' | 'appOpen';

type WebSimulatorListener = (data: { type: 'interstitial' | 'rewarded' | 'appOpen'; onComplete: (rewardEarned?: boolean) => void }) => void;

class MonetizationService {
  private isInitialized = false;
  private isNative = Capacitor.isNativePlatform();
  private platform = Capacitor.getPlatform();
  private webListeners: Set<WebSimulatorListener> = new Set();
  private isShowingAd = false;
  private bannerVisible = false;
  private isAppOpenLoaded = false;
  private isPreloadingAppOpen = false;
  private lastAppOpenShowTime = 0;

  private isTestAdUnit(adId: string): boolean {
    return adId.startsWith('ca-app-pub-3940256099942544');
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.isNative) {
      console.log('[Monetization] Running in Web environment. Using simulated preview mode.');
      this.isInitialized = true;
      return;
    }

    try {
      const isTest = this.isTestAdUnit(this.getBannerAdUnitId());
      await AdMob.initialize({
        initializeForTesting: isTest,
      });

      if (this.platform === 'ios') {
        try {
          await AdMob.requestTrackingAuthorization();
        } catch (e) {
          console.warn('[Monetization] Tracking authorization request ignored', e);
        }
      }

      this.isInitialized = true;
      console.log('[Monetization] Native AdMob initialized successfully');
    } catch (e) {
      console.error('[Monetization] Failed to initialize native AdMob', e);
      this.isInitialized = true;
    }
  }

  /**
   * Returns whether ads should be displayed to the user.
   */
  public areAdsActive(): boolean {
    const settings = useSettingsStore.getState();
    if (!settings.adsEnabled) return false;
    if (settings.adsRemovedUntil && Date.now() < settings.adsRemovedUntil) {
      return false;
    }
    return true;
  }

  public getAdRemovalRemainingTime(): { active: boolean; hours: number; minutes: number } {
    const settings = useSettingsStore.getState();
    if (!settings.adsRemovedUntil || Date.now() >= settings.adsRemovedUntil) {
      return { active: false, hours: 0, minutes: 0 };
    }
    const diffMs = settings.adsRemovedUntil - Date.now();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { active: true, hours, minutes };
  }

  public getBannerAdUnitId(): string {
    const settings = useSettingsStore.getState();
    if (settings.customBannerAdUnitId?.trim()) {
      return settings.customBannerAdUnitId.trim();
    }
    return this.platform === 'ios'
      ? ADMOB_SAMPLE_AD_UNITS.ios.banner
      : ADMOB_SAMPLE_AD_UNITS.android.banner;
  }

  public getInterstitialAdUnitId(): string {
    const settings = useSettingsStore.getState();
    if (settings.customInterstitialAdUnitId?.trim()) {
      return settings.customInterstitialAdUnitId.trim();
    }
    return this.platform === 'ios'
      ? ADMOB_SAMPLE_AD_UNITS.ios.interstitial
      : ADMOB_SAMPLE_AD_UNITS.android.interstitial;
  }

  public getRewardedAdUnitId(): string {
    const settings = useSettingsStore.getState();
    if (settings.customRewardedAdUnitId?.trim()) {
      return settings.customRewardedAdUnitId.trim();
    }
    return this.platform === 'ios'
      ? ADMOB_SAMPLE_AD_UNITS.ios.rewarded
      : ADMOB_SAMPLE_AD_UNITS.android.rewarded;
  }

  public getAppOpenAdUnitId(): string {
    const settings = useSettingsStore.getState();
    if (settings.customAppOpenAdUnitId?.trim()) {
      return settings.customAppOpenAdUnitId.trim();
    }
    return this.platform === 'ios'
      ? ADMOB_SAMPLE_AD_UNITS.ios.appOpen
      : ADMOB_SAMPLE_AD_UNITS.android.appOpen;
  }

  public async preloadAppOpen(): Promise<void> {
    if (!this.areAdsActive() || !this.isNative || this.isPreloadingAppOpen) return;
    this.isPreloadingAppOpen = true;
    try {
      await AdMob.loadAppOpen({ adId: this.getAppOpenAdUnitId() });
      this.isAppOpenLoaded = true;
      console.log('[Monetization] App Open Ad preloaded successfully');
    } catch (e) {
      console.warn('[Monetization] preloadAppOpen error', e);
      this.isAppOpenLoaded = false;
    } finally {
      this.isPreloadingAppOpen = false;
    }
  }

  public async showAppOpen(force: boolean = false): Promise<boolean> {
    const settings = useSettingsStore.getState();
    if (!force && (!this.areAdsActive() || !settings.appOpenAdsEnabled)) {
      return false;
    }

    if (this.isShowingAd) {
      return false;
    }

    this.isShowingAd = true;

    if (this.isNative) {
      try {
        const adId = this.getAppOpenAdUnitId();
        const checkStatus = await AdMob.isAppOpenLoaded({ adId }).catch(() => ({ value: false }));
        if (!checkStatus.value && !this.isAppOpenLoaded) {
          await AdMob.loadAppOpen({ adId });
        }
        await AdMob.showAppOpen({ adId });
        this.lastAppOpenShowTime = Date.now();
        this.isAppOpenLoaded = false;
        // Preload next app open ad in background
        this.preloadAppOpen().catch(() => {});
        return true;
      } catch (e) {
        console.warn('[Monetization] Native App Open failed, falling back to simulator', e);
        return this.triggerSimulator('appOpen');
      } finally {
        this.isShowingAd = false;
      }
    } else {
      try {
        this.lastAppOpenShowTime = Date.now();
        return await this.triggerSimulator('appOpen');
      } finally {
        this.isShowingAd = false;
      }
    }
  }

  public async showAppOpenIfEligible(minIntervalSeconds: number = 30): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastAppOpenShowTime < minIntervalSeconds * 1000) {
      return false;
    }
    return this.showAppOpen(false);
  }

  public async showNativeBanner(position: BannerAdPosition = BannerAdPosition.TOP_CENTER): Promise<void> {
    if (!this.areAdsActive()) {
      document.documentElement.style.setProperty('--top-banner-height', '0px');
      return;
    }

    if (!this.isNative) {
      this.bannerVisible = true;
      document.documentElement.style.setProperty('--top-banner-height', '50px');
      return;
    }

    try {
      const adId = this.getBannerAdUnitId();
      const options: BannerAdOptions = {
        adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position,
        isTesting: this.isTestAdUnit(adId),
        margin: 0,
      };
      await AdMob.showBanner(options);
      this.bannerVisible = true;
      document.documentElement.style.setProperty('--top-banner-height', '54px');
    } catch (e) {
      console.warn('[Monetization] showNativeBanner error', e);
      document.documentElement.style.setProperty('--top-banner-height', '0px');
    }
  }

  public async hideNativeBanner(): Promise<void> {
    document.documentElement.style.setProperty('--top-banner-height', '0px');
    if (!this.isNative || !this.bannerVisible) return;
    try {
      await AdMob.hideBanner();
    } catch (e) {
      console.warn('[Monetization] hideNativeBanner error', e);
    }
  }

  public async removeNativeBanner(): Promise<void> {
    document.documentElement.style.setProperty('--top-banner-height', '0px');
    this.bannerVisible = false;
    if (!this.isNative) return;
    try {
      await AdMob.removeBanner();
    } catch (e) {
      console.warn('[Monetization] removeNativeBanner error', e);
    }
  }

  public async showInterstitial(force: boolean = false): Promise<boolean> {
    if (!force && !this.areAdsActive()) {
      return false;
    }

    if (this.isShowingAd) {
      return false;
    }

    this.isShowingAd = true;

    if (this.isNative) {
      try {
        const adId = this.getInterstitialAdUnitId();
        const options: AdOptions = {
          adId,
          isTesting: this.isTestAdUnit(adId),
        };
        await AdMob.prepareInterstitial(options);
        await AdMob.showInterstitial();
        return true;
      } catch (e) {
        console.warn('[Monetization] Native Interstitial failed, falling back to simulator', e);
        return this.triggerSimulator('interstitial');
      } finally {
        this.isShowingAd = false;
      }
    } else {
      try {
        return await this.triggerSimulator('interstitial');
      } finally {
        this.isShowingAd = false;
      }
    }
  }

  public async showRewardedAd(): Promise<boolean> {
    if (this.isShowingAd) {
      return false;
    }

    this.isShowingAd = true;

    if (this.isNative) {
      try {
        const adId = this.getRewardedAdUnitId();
        const options = {
          adId,
          isTesting: this.isTestAdUnit(adId),
        };
        await AdMob.prepareRewardVideoAd(options);
        const reward = await AdMob.showRewardVideoAd();
        const earned = !!reward;
        if (earned) {
          this.applyRewardAdRemoval(24);
        }
        return earned;
      } catch (e) {
        console.warn('[Monetization] Native Rewarded failed, falling back to simulator', e);
        return this.triggerSimulator('rewarded');
      } finally {
        this.isShowingAd = false;
      }
    } else {
      try {
        const earned = await this.triggerSimulator('rewarded');
        if (earned) {
          this.applyRewardAdRemoval(24);
        }
        return earned;
      } finally {
        this.isShowingAd = false;
      }
    }
  }

  public applyRewardAdRemoval(hours: number = 24): void {
    const until = Date.now() + hours * 60 * 60 * 1000;
    useSettingsStore.getState().setSetting('adsRemovedUntil', until);
  }

  public clearAdRemoval(): void {
    useSettingsStore.getState().setSetting('adsRemovedUntil', null);
  }

  public async recordScan(): Promise<boolean> {
    if (!this.areAdsActive()) return false;
    const settings = useSettingsStore.getState();
    const frequency = settings.adFrequency || 2;
    const current = settings.adScanCount || 0;
    const nextCount = current + 1;

    console.log(`[Monetization] recordScan: scan ${nextCount}/${frequency}`);

    if (nextCount >= frequency) {
      await settings.setSetting('adScanCount', 0);
      return this.showInterstitial();
    } else {
      await settings.setSetting('adScanCount', nextCount);
      return false;
    }
  }

  public async recordAction(action: 'generate' | 'export'): Promise<boolean> {
    if (!this.areAdsActive()) return false;
    const settings = useSettingsStore.getState();
    const frequency = settings.adFrequency || 2;
    const current = settings.adScanCount || 0;
    const nextCount = current + 1;

    console.log(`[Monetization] recordAction (${action}): count ${nextCount}/${frequency}`);

    if (nextCount >= frequency) {
      await settings.setSetting('adScanCount', 0);
      return this.showInterstitial();
    } else {
      await settings.setSetting('adScanCount', nextCount);
      return false;
    }
  }

  public subscribeSimulator(listener: WebSimulatorListener): () => void {
    this.webListeners.add(listener);
    return () => {
      this.webListeners.delete(listener);
    };
  }

  // Alias for backward compatibility
  public subscribeWebAd(listener: WebSimulatorListener): () => void {
    return this.subscribeSimulator(listener);
  }

  private triggerSimulator(type: 'interstitial' | 'rewarded' | 'appOpen'): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.webListeners.size === 0) {
        console.log(`[Monetization] Simulated ${type} ad (no UI listener attached)`);
        resolve(true);
        return;
      }

      let handled = false;
      this.webListeners.forEach((listener) => {
        listener({
          type,
          onComplete: (rewardEarned?: boolean) => {
            if (!handled) {
              handled = true;
              resolve(type === 'rewarded' ? !!rewardEarned : true);
            }
          },
        });
      });
    });
  }

  public getStatus() {
    return {
      isInitialized: this.isInitialized,
      isNative: this.isNative,
      platform: this.platform,
      adsActive: this.areAdsActive(),
      bannerAdUnitId: this.getBannerAdUnitId(),
      interstitialAdUnitId: this.getInterstitialAdUnitId(),
      rewardedAdUnitId: this.getRewardedAdUnitId(),
      appOpenAdUnitId: this.getAppOpenAdUnitId(),
      isAppOpenLoaded: this.isAppOpenLoaded,
    };
  }
}

export const monetizationService = new MonetizationService();
export const adService = monetizationService;
