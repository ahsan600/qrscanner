// App-wide constants. Change APP_NAME here to rebrand.
export const APP_NAME = 'QR Scanner';
export const APP_TAGLINE = 'Scan. Save. Done.';
export const APP_PACKAGE_ID = 'com.coreplay.qrscanner';
export const APP_VERSION = '1.0.0';
export const PRIVACY_POLICY_URL = 'https://coreplay-site.netlify.app/privacy-policy';

export const DUPLICATE_COOLDOWN_OPTIONS = [
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
  { label: 'Off', value: 0 },
] as const;

export const HISTORY_LIMIT_OPTIONS = [
  { label: '100', value: 100 },
  { label: '500', value: 500 },
  { label: '1000', value: 1000 },
  { label: 'Unlimited', value: 0 },
] as const;

export const SCAN_MODES = ['All', 'QR', 'Barcode'] as const;
export type ScanMode = (typeof SCAN_MODES)[number];

export const ACCENT_COLORS = [
  { label: 'Mint', primary: '#00D097', primaryDark: '#009668', primaryLight: '#00B887' },
  { label: 'Blue', primary: '#3B82F6', primaryDark: '#1D4ED8', primaryLight: '#2563EB' },
  { label: 'Purple', primary: '#A855F7', primaryDark: '#7E22CE', primaryLight: '#9333EA' },
  { label: 'Orange', primary: '#FB923C', primaryDark: '#C2410C', primaryLight: '#EA580C' },
  { label: 'Pink', primary: '#F43F5E', primaryDark: '#BE123C', primaryLight: '#E11D48' },
] as const;

export const THEME_OPTIONS = ['system', 'light', 'dark'] as const;
export type ThemeOption = (typeof THEME_OPTIONS)[number];
