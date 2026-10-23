export interface HistoryItem {
  id: string;
  type: string;        // url, wifi, contact, phone, sms, email, geo, calendar, product, text
  format: string;      // QR_CODE, EAN_13, etc.
  content: string;     // raw scanned/generated content
  label: string;       // smart label (domain, SSID, name, truncated text)
  source: 'scanned' | 'created';
  favorite: boolean;
  timestamp: number;
}
