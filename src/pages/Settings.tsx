import React, { useState, useEffect } from "react";
import { IonPage, IonContent, IonIcon } from "@ionic/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  volumeHighOutline,
  phonePortraitOutline,
  openOutline,
  repeatOutline,
  timerOutline,
  scanOutline,
  flashlightOutline,
  saveOutline,
  serverOutline,
  globeOutline,
  trashOutline,
  colorPaletteOutline,
  contrastOutline,
  speedometerOutline,
  informationCircleOutline,
  shieldCheckmarkOutline,
  shareSocialOutline,
  mailOutline,
  heartOutline,
  closeOutline,
  chevronForwardOutline,
  giftOutline,
  sparklesOutline,
  refreshOutline,
} from "ionicons/icons";
import { Browser } from "@capacitor/browser";
import { shareService } from "../services/shareService";
import { App as CapApp } from "@capacitor/app";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { t } from "../utils/i18n";
import {
  APP_NAME,
  APP_VERSION,
  APP_TAGLINE,
  PRIVACY_POLICY_URL,
  DUPLICATE_COOLDOWN_OPTIONS,
  HISTORY_LIMIT_OPTIONS,
  SCAN_MODES,
  type ScanMode,
  type ThemeOption,
} from "../utils/constants";
import { createPortal } from "react-dom";
import { useSettingsStore } from "../store/useSettingsStore";
import { useHistoryStore } from "../store/useHistoryStore";
import {
  SectionHeader,
  ToggleRow,
  NavRow,
  ConfirmDialog,
  OptionPickerDialog,
} from "../components/ui";

interface SettingsProps {
  onReplayOnboarding?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onReplayOnboarding }) => {
  const settings = useSettingsStore();
  const clearHistory = useHistoryStore((s) => s.clearAll);

  const [appVersionStr, setAppVersionStr] = useState(`v${APP_VERSION}`);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showCooldownPicker, setShowCooldownPicker] = useState(false);
  const [showLimitPicker, setShowLimitPicker] = useState(false);
  const [showModePicker, setShowModePicker] = useState(false);

  useEffect(() => {
    CapApp.getInfo()
      .then((info) => {
        if (info.version) {
          setAppVersionStr(`v${info.version} (${info.build || "1"})`);
        }
      })
      .catch(() => {});
  }, []);

  const handleShareApp = async () => {
    try {
      await shareService.shareText({
        title: APP_NAME,
        text: `${APP_NAME} – Fast, private, native QR and Barcode scanner for Android.`,
        dialogTitle: `Share ${APP_NAME}`,
      });
    } catch (e) {
      console.error("Share failed", e);
    }
  };

  const handleSendFeedback = () => {
    window.open(
      "mailto:feedback@example.com?subject=ScanPro%20Feedback",
      "_system",
    );
  };

  const handleThemeChange = (newTheme: ThemeOption) => {
    settings.setSetting("theme", newTheme);
    const isDark =
      newTheme === "dark" ||
      (newTheme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("ion-palette-dark", isDark);
    document.documentElement.classList.toggle("dark", isDark);
    document.body.classList.toggle("dark-theme", isDark);
    document.body.classList.toggle("light-theme", !isDark);
    Haptics.impact({ style: ImpactStyle.Light });
  };

  return (
    <IonPage>
      <IonContent
        fullscreen
        style={{ "--background": "var(--bg)" } as React.CSSProperties}
      >
        <div
          style={{
            padding:
              "calc(var(--safe-area-top) + var(--top-banner-height) + 16px) 16px calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px) + 56px)",
          }}
        >
          {/* Header */}
          <h1
            className="text-display"
            style={{ margin: "0 0 20px 0", fontSize: 28 }}
          >
            {t("settings.title")}
          </h1>

          {/* Section 1: Scanning */}
          <SectionHeader title={t("settings.scanning")} />
          <div
            className="sp-card"
            style={{ marginBottom: 24, padding: "4px 0" }}
          >
            <ToggleRow
              icon={phonePortraitOutline}
              label={t("settings.vibrate")}
              sublabel="Tactile feedback on successful code detection"
              value={settings.vibrateOnScan}
              onChange={(v) => settings.setSetting("vibrateOnScan", v)}
            />
            <ToggleRow
              icon={volumeHighOutline}
              label={t("settings.beep")}
              sublabel="Play audio beep on scan"
              value={settings.beepOnScan}
              onChange={(v) => settings.setSetting("beepOnScan", v)}
            />
            <ToggleRow
              icon={openOutline}
              label={t("settings.autoOpen")}
              sublabel="Opens websites after 2-second safety delay"
              value={settings.autoOpenLinks}
              onChange={(v) => settings.setSetting("autoOpenLinks", v)}
            />
            <ToggleRow
              icon={repeatOutline}
              label={t("settings.batchDefault")}
              sublabel="Keep camera active for rapid consecutive scans"
              value={settings.batchDefault}
              onChange={(v) => settings.setSetting("batchDefault", v)}
            />
            <NavRow
              icon={timerOutline}
              label={t("settings.duplicateCooldown")}
              value={
                DUPLICATE_COOLDOWN_OPTIONS.find(
                  (o) => o.value === settings.duplicateCooldown,
                )?.label || "2s"
              }
              onClick={() => setShowCooldownPicker(true)}
            />
            <NavRow
              icon={scanOutline}
              label={t("settings.defaultScanMode")}
              value={settings.defaultScanMode}
              onClick={() => setShowModePicker(true)}
            />
            <ToggleRow
              icon={flashlightOutline}
              label="Flash on startup"
              sublabel="Automatically enable torch when camera opens"
              value={settings.defaultTorchOn}
              onChange={(v) => settings.setSetting("defaultTorchOn", v)}
            />
          </div>

          {/* Section 2: History & Privacy */}
          <SectionHeader title={t("settings.historyPrivacy")} />
          <div
            className="sp-card"
            style={{ marginBottom: 24, padding: "4px 0" }}
          >
            <ToggleRow
              icon={saveOutline}
              label={t("settings.saveHistory")}
              sublabel="Save decoded codes locally on this device"
              value={settings.saveHistory}
              onChange={(v) => settings.setSetting("saveHistory", v)}
            />
            <NavRow
              icon={serverOutline}
              label={t("settings.historyLimit")}
              value={
                HISTORY_LIMIT_OPTIONS.find(
                  (o) => o.value === settings.historyLimit,
                )?.label || "Unlimited"
              }
              onClick={() => setShowLimitPicker(true)}
            />
            <ToggleRow
              icon={globeOutline}
              label={t("settings.productLookup")}
              sublabel="Queries Open Food Facts for barcode names and photos"
              value={settings.productLookup}
              onChange={(v) => settings.setSetting("productLookup", v)}
            />
            <NavRow
              icon={trashOutline}
              label={t("settings.clearAllHistory")}
              danger
              onClick={() => setShowClearConfirm(true)}
            />
          </div>

          {/* Section 3: Appearance */}
          <SectionHeader title={t("settings.appearance")} />
          <div className="sp-card" style={{ marginBottom: 24, padding: 16 }}>
            {/* Theme Segmented Control */}
            <div style={{ marginBottom: 16 }}>
              <div className="text-caption" style={{ marginBottom: 8 }}>
                Theme Mode
              </div>
              <div
                style={{
                  display: "flex",
                  background: "var(--surface-2)",
                  borderRadius: 12,
                  padding: 4,
                  gap: 4,
                }}
              >
                {(["system", "light", "dark"] as ThemeOption[]).map((thm) => (
                  <button
                    key={thm}
                    onClick={() => handleThemeChange(thm)}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 10,
                      border: "none",
                      background:
                        settings.theme === thm
                          ? "var(--primary)"
                          : "transparent",
                      color:
                        settings.theme === thm
                          ? "#FFFFFF"
                          : "var(--text-muted)",
                      fontWeight: settings.theme === thm ? 600 : 500,
                      cursor: "pointer",
                      fontSize: 14,
                      textTransform: "capitalize",
                      boxShadow:
                        settings.theme === thm
                          ? "0 2px 8px rgba(var(--primary-rgb), 0.35)"
                          : "none",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    {thm}
                  </button>
                ))}
              </div>
            </div>

            {/* Reduce Motion */}
            <div
              style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}
            >
              <ToggleRow
                icon={speedometerOutline}
                label={t("settings.reduceMotion")}
                sublabel="Disables non-essential transitions and animations"
                value={settings.reduceMotion}
                onChange={(v) => settings.setSetting("reduceMotion", v)}
              />
            </div>
          </div>

          {/* Section 4: About */}
          <SectionHeader title={t("settings.about")} />
          <div
            className="sp-card"
            style={{ marginBottom: 24, padding: "4px 0" }}
          >
            <NavRow
              icon={informationCircleOutline}
              label={APP_NAME}
              sublabel={APP_TAGLINE}
              value={appVersionStr}
              onClick={() => {}}
            />
            <NavRow
              icon={shieldCheckmarkOutline}
              label={t("settings.privacyPolicy")}
              onClick={() => setShowPrivacyModal(true)}
            />
            {onReplayOnboarding && (
              <NavRow
                icon={sparklesOutline}
                label="App Tutorial & Features"
                sublabel="View the 3 onboarding screens"
                onClick={onReplayOnboarding}
              />
            )}
            <NavRow
              icon={shareSocialOutline}
              label={t("settings.shareApp")}
              onClick={handleShareApp}
            />
            <NavRow
              icon={mailOutline}
              label={t("settings.sendFeedback")}
              onClick={handleSendFeedback}
            />
          </div>

          {/* Footer note */}
          <div
            style={{
              textAlign: "center",
              padding: "24px 0 12px",
              color: "var(--text-muted)",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.2px",
              opacity: 0.85,
            }}
          >
            Offline-first • Zero tracking • 100% Free
          </div>
        </div>

        {/* Cooldown Picker Dialog */}
        <OptionPickerDialog
          open={showCooldownPicker}
          title="Duplicate Cooldown"
          subtitle="Ignore identical scanned codes within:"
          icon={timerOutline}
          selectedValue={settings.duplicateCooldown}
          options={[
            {
              label: "1s Cooldown",
              value: 1000,
              description: "Fast consecutive scanning",
              icon: timerOutline,
            },
            {
              label: "2s Cooldown",
              value: 2000,
              description: "Standard pause between duplicate reads",
              icon: timerOutline,
            },
            {
              label: "5s Cooldown",
              value: 5000,
              description: "Extended delay to prevent accidental reads",
              icon: timerOutline,
            },
            {
              label: "Disabled (Off)",
              value: 0,
              description: "Immediately re-scan any matching code",
              icon: repeatOutline,
            },
          ]}
          onSelect={(val) => settings.setSetting("duplicateCooldown", val)}
          onClose={() => setShowCooldownPicker(false)}
        />

        {/* History Limit Picker Dialog */}
        <OptionPickerDialog
          open={showLimitPicker}
          title="History Storage Limit"
          subtitle="Maximum records preserved on this device:"
          icon={serverOutline}
          selectedValue={settings.historyLimit}
          options={[
            {
              label: "100 Scans",
              value: 100,
              description: "Keeps storage footprint minimal",
              icon: serverOutline,
            },
            {
              label: "500 Scans",
              value: 500,
              description: "Recommended for daily scanning",
              icon: serverOutline,
            },
            {
              label: "1,000 Scans",
              value: 1000,
              description: "High capacity archive",
              icon: serverOutline,
            },
            {
              label: "Unlimited",
              value: 0,
              description: "Never automatically remove old items",
              icon: saveOutline,
            },
          ]}
          onSelect={async (val) => {
            settings.setSetting("historyLimit", val);
            await useHistoryStore.getState().enforceLimit(val);
          }}
          onClose={() => setShowLimitPicker(false)}
        />

        {/* Default Scan Mode Picker */}
        <OptionPickerDialog
          open={showModePicker}
          title="Default Scan Mode"
          subtitle="Camera starts scanning with this filter:"
          icon={scanOutline}
          selectedValue={settings.defaultScanMode}
          options={[
            {
              label: "All Formats",
              value: "All",
              description: "Detects QR codes, barcodes & Data Matrix",
              icon: scanOutline,
            },
            {
              label: "QR Codes Only",
              value: "QR",
              description: "Exclusively scan QR & 2D formats",
              icon: scanOutline,
            },
            {
              label: "Barcodes Only",
              value: "Barcode",
              description: "Optimized for UPC/EAN retail barcodes",
              icon: scanOutline,
            },
          ]}
          onSelect={(val) => settings.setSetting("defaultScanMode", val)}
          onClose={() => setShowModePicker(false)}
        />

        {/* Clear All Confirmation Dialog */}
        <ConfirmDialog
          open={showClearConfirm}
          title={t("settings.clearAllHistory")}
          message="Are you sure you want to permanently delete all scans and created codes from your local history? This action cannot be undone."
          confirmLabel={t("common.confirm")}
          cancelLabel={t("common.cancel")}
          danger
          icon={trashOutline}
          onConfirm={async () => {
            setShowClearConfirm(false);
            await clearHistory();
            await Haptics.impact({ style: ImpactStyle.Heavy });
          }}
          onCancel={() => setShowClearConfirm(false)}
        />

        {/* Privacy Policy Modal */}
        {showPrivacyModal &&
          createPortal(
            <motion.div
              className="sp-dialog-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrivacyModal(false)}
            >
              <motion.div
                className="sp-dialog"
                initial={{ scale: 0.92, opacity: 0, y: 14 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 14 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxHeight: "85vh",
                  display: "flex",
                  flexDirection: "column",
                  padding: 0,
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "22px 22px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: "rgba(0, 208, 151, 0.12)",
                        border: "1.5px solid rgba(0, 208, 151, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--primary)",
                      }}
                    >
                      <IonIcon
                        icon={shieldCheckmarkOutline}
                        style={{ fontSize: 24 }}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          letterSpacing: -0.3,
                          color: "var(--text)",
                        }}
                      >
                        {t("settings.privacyPolicy")}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        Built with user privacy as a cornerstone
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setShowPrivacyModal(false)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
                  </motion.button>
                </div>

                {/* Content Cards */}
                <div
                  style={{
                    padding: "16px 20px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    fontSize: 13.5,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 16,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--primary)",
                        marginBottom: 4,
                      }}
                    >
                      🛡️ 100% On-Device Processing
                    </div>
                    <div
                      style={{ color: "var(--text-muted)", lineHeight: 1.5 }}
                    >
                      Scanning is powered by Google ML Kit on-device machine
                      learning models. Video frames are analyzed locally in real
                      time and are never transmitted to external servers.
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 16,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#38BDF8",
                        marginBottom: 4,
                      }}
                    >
                      🚫 Zero Tracking & No Accounts
                    </div>
                    <div
                      style={{ color: "var(--text-muted)", lineHeight: 1.5 }}
                    >
                      ScanPro requires no user account, has no personal
                      analytics beacons, and displays ads via Google AdMob.
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 16,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#A855F7",
                        marginBottom: 4,
                      }}
                    >
                      💾 Local Sandboxed Storage
                    </div>
                    <div
                      style={{ color: "var(--text-muted)", lineHeight: 1.5 }}
                    >
                      Your scanned records and created codes remain strictly
                      inside your device's private sandboxed database and are
                      never backed up to the cloud unless you manually export
                      them.
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 16,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#FB923C",
                        marginBottom: 4,
                      }}
                    >
                      🌐 Opt-In Product Lookups
                    </div>
                    <div
                      style={{ color: "var(--text-muted)", lineHeight: 1.5 }}
                    >
                      Only when enabled in Settings, the numerical barcode
                      digits are sent to the open-source Open Food Facts
                      database to show food nutritional labels and brand titles.
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div
                  style={{
                    padding: "14px 20px 20px",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="sp-btn sp-btn-ghost"
                    onClick={async () => {
                      Haptics.impact({ style: ImpactStyle.Light });
                      try {
                        await Browser.open({ url: PRIVACY_POLICY_URL });
                      } catch {
                        window.open(PRIVACY_POLICY_URL, "_system");
                      }
                    }}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 14,
                      fontWeight: 600,
                      justifyContent: "center",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <IonIcon icon={openOutline} style={{ marginRight: 6 }} />
                    Full Policy
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="sp-btn sp-btn-primary"
                    onClick={() => {
                      Haptics.impact({ style: ImpactStyle.Light });
                      setShowPrivacyModal(false);
                    }}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 14,
                      fontWeight: 700,
                      justifyContent: "center",
                    }}
                  >
                    I Understand
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>,
            document.body,
          )}
      </IonContent>
    </IonPage>
  );
};

export default Settings;
