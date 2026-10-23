// Content parser: detects the type of scanned data and structures it.
// Treats all input as untrusted. Never executes or injects content as HTML.

export type ParsedType =
  | 'url'
  | 'wifi'
  | 'contact'
  | 'phone'
  | 'sms'
  | 'email'
  | 'geo'
  | 'calendar'
  | 'product'
  | 'text';

export interface ParsedUrl {
  type: 'url';
  url: string;
  domain: string;
  isSuspicious: boolean;
  suspiciousReasons: string[];
}

export interface ParsedWifi {
  type: 'wifi';
  ssid: string;
  password: string;
  security: string; // WPA, WEP, nopass
  hidden: boolean;
}

export interface ParsedContact {
  type: 'contact';
  name: string;
  phone: string;
  email: string;
  org: string;
  address: string;
  website: string;
  raw: string;
}

export interface ParsedPhone {
  type: 'phone';
  number: string;
}

export interface ParsedSms {
  type: 'sms';
  number: string;
  body: string;
}

export interface ParsedEmail {
  type: 'email';
  to: string;
  subject: string;
  body: string;
}

export interface ParsedGeo {
  type: 'geo';
  latitude: number;
  longitude: number;
  query: string;
}

export interface ParsedCalendar {
  type: 'calendar';
  title: string;
  location: string;
  start: string;
  end: string;
  description: string;
}

export interface ParsedProduct {
  type: 'product';
  code: string;
  format: string;
}

export interface ParsedText {
  type: 'text';
  text: string;
}

export type ParsedContent =
  | ParsedUrl
  | ParsedWifi
  | ParsedContact
  | ParsedPhone
  | ParsedSms
  | ParsedEmail
  | ParsedGeo
  | ParsedCalendar
  | ParsedProduct
  | ParsedText;

// URL shortener domains to flag
const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
  'adf.ly', 'cutt.ly', 'rb.gy', 'shorturl.at', 'tiny.cc',
]);

function checkUrlSuspicious(url: string): { isSuspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  try {
    const parsed = new URL(url);
    // IP address host
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)) {
      reasons.push('IP address instead of domain name');
    }
    // Non-HTTPS
    if (parsed.protocol === 'http:') {
      reasons.push('Not using HTTPS');
    }
    // URL shortener
    if (URL_SHORTENERS.has(parsed.hostname.toLowerCase())) {
      reasons.push('URL shortener – destination unknown');
    }
    // Very long query string
    if (parsed.search.length > 200) {
      reasons.push('Unusually long URL parameters');
    }
    // Punycode / IDN
    if (parsed.hostname.startsWith('xn--')) {
      reasons.push('Internationalized domain (possible lookalike)');
    }
  } catch {
    reasons.push('Invalid URL format');
  }
  return { isSuspicious: reasons.length > 0, reasons };
}

function parseWifi(raw: string): ParsedWifi | null {
  // WIFI:T:WPA;S:MyNetwork;P:MyPass;H:true;;
  const match = raw.match(/^WIFI:/i);
  if (!match) return null;
  const content = raw.substring(5);
  const getField = (key: string): string => {
    const regex = new RegExp(`${key}:([^;]*);`, 'i');
    const m = content.match(regex);
    return m ? m[1] : '';
  };
  const ssid = getField('S');
  if (!ssid) return null;
  return {
    type: 'wifi',
    ssid,
    password: getField('P'),
    security: getField('T') || 'nopass',
    hidden: getField('H').toLowerCase() === 'true',
  };
}

function parseVcard(raw: string): ParsedContact | null {
  if (!raw.toUpperCase().includes('BEGIN:VCARD')) return null;
  const getField = (field: string): string => {
    const regex = new RegExp(`^${field}[;:](.*)$`, 'im');
    const m = raw.match(regex);
    return m ? m[1].trim() : '';
  };
  const fn = getField('FN') || getField('N').split(';').filter(Boolean).reverse().join(' ');
  return {
    type: 'contact',
    name: fn,
    phone: getField('TEL'),
    email: getField('EMAIL'),
    org: getField('ORG'),
    address: getField('ADR').replace(/;/g, ', ').replace(/^,\s*/, '').replace(/,\s*$/, ''),
    website: getField('URL'),
    raw,
  };
}

function parseMecard(raw: string): ParsedContact | null {
  if (!raw.toUpperCase().startsWith('MECARD:')) return null;
  const content = raw.substring(7);
  const getField = (key: string): string => {
    const regex = new RegExp(`${key}:([^;]*);?`, 'i');
    const m = content.match(regex);
    return m ? m[1] : '';
  };
  return {
    type: 'contact',
    name: getField('N').split(',').reverse().join(' ').trim(),
    phone: getField('TEL'),
    email: getField('EMAIL'),
    org: getField('ORG'),
    address: getField('ADR'),
    website: getField('URL'),
    raw,
  };
}

function parseVevent(raw: string): ParsedCalendar | null {
  if (!raw.toUpperCase().includes('BEGIN:VEVENT')) return null;
  const getField = (field: string): string => {
    const regex = new RegExp(`^${field}[;:](.*)$`, 'im');
    const m = raw.match(regex);
    return m ? m[1].trim() : '';
  };
  return {
    type: 'calendar',
    title: getField('SUMMARY'),
    location: getField('LOCATION'),
    start: getField('DTSTART'),
    end: getField('DTEND'),
    description: getField('DESCRIPTION'),
  };
}

function parseMatmsg(raw: string): ParsedEmail | null {
  if (!raw.toUpperCase().startsWith('MATMSG:')) return null;
  const content = raw.substring(7);
  const getField = (key: string): string => {
    const regex = new RegExp(`${key}:([^;]*);?`, 'i');
    const m = content.match(regex);
    return m ? m[1] : '';
  };
  return {
    type: 'email',
    to: getField('TO'),
    subject: getField('SUB'),
    body: getField('BODY'),
  };
}

const PRODUCT_FORMATS = new Set([
  'EAN_13', 'EAN_8', 'UPC_A', 'UPC_E',
]);

export function parseContent(raw: string, barcodeFormat?: string): ParsedContent {
  if (!raw || typeof raw !== 'string') {
    return { type: 'text', text: raw || '' };
  }

  const trimmed = raw.trim();

  // Wi-Fi
  const wifi = parseWifi(trimmed);
  if (wifi) return wifi;

  // vCard
  const vcard = parseVcard(trimmed);
  if (vcard) return vcard;

  // MECARD
  const mecard = parseMecard(trimmed);
  if (mecard) return mecard;

  // Calendar event
  const vevent = parseVevent(trimmed);
  if (vevent) return vevent;

  // MATMSG
  const matmsg = parseMatmsg(trimmed);
  if (matmsg) return matmsg;

  // Phone
  if (/^tel:/i.test(trimmed)) {
    return { type: 'phone', number: trimmed.replace(/^tel:/i, '') };
  }

  // SMS
  if (/^sms(to)?:/i.test(trimmed)) {
    const smsContent = trimmed.replace(/^sms(to)?:/i, '');
    let number = '';
    let body = '';
    if (smsContent.includes('?body=')) {
      const parts = smsContent.split('?body=');
      number = parts[0];
      body = parts.slice(1).join('?body=');
    } else if (smsContent.includes(':')) {
      const colonIdx = smsContent.indexOf(':');
      number = smsContent.substring(0, colonIdx);
      body = smsContent.substring(colonIdx + 1);
    } else {
      number = smsContent;
    }
    return {
      type: 'sms',
      number: number.trim(),
      body: decodeURIComponent(body),
    };
  }

  // Email (mailto:)
  if (/^mailto:/i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return {
        type: 'email',
        to: url.pathname,
        subject: url.searchParams.get('subject') || '',
        body: url.searchParams.get('body') || '',
      };
    } catch {
      return {
        type: 'email',
        to: trimmed.replace(/^mailto:/i, '').split('?')[0],
        subject: '',
        body: '',
      };
    }
  }

  // Geo
  if (/^geo:/i.test(trimmed)) {
    const geoContent = trimmed.replace(/^geo:/i, '');
    const [coords, ...queryParts] = geoContent.split('?');
    const [lat, lng] = coords.split(',').map(Number);
    const queryStr = queryParts.join('?');
    const qMatch = queryStr.match(/q=([^&]*)/);
    return {
      type: 'geo',
      latitude: lat || 0,
      longitude: lng || 0,
      query: qMatch ? decodeURIComponent(qMatch[1]) : '',
    };
  }

  // URL
  if (/^https?:\/\//i.test(trimmed)) {
    const safety = checkUrlSuspicious(trimmed);
    let domain = '';
    try {
      domain = new URL(trimmed).hostname;
    } catch {
      domain = trimmed;
    }
    return {
      type: 'url',
      url: trimmed,
      domain,
      isSuspicious: safety.isSuspicious,
      suspiciousReasons: safety.reasons,
    };
  }

  // Product barcode (EAN/UPC formats)
  if (barcodeFormat && PRODUCT_FORMATS.has(barcodeFormat)) {
    return { type: 'product', code: trimmed, format: barcodeFormat };
  }

  // Plain text fallback
  return { type: 'text', text: trimmed };
}

/** Generate a smart label for display in history lists */
export function getSmartLabel(parsed: ParsedContent, raw: string): string {
  switch (parsed.type) {
    case 'url':
      return parsed.domain;
    case 'wifi':
      return parsed.ssid;
    case 'contact':
      return parsed.name || 'Contact';
    case 'phone':
      return parsed.number;
    case 'sms':
      return parsed.number;
    case 'email':
      return parsed.to;
    case 'geo':
      return parsed.query || `${parsed.latitude}, ${parsed.longitude}`;
    case 'calendar':
      return parsed.title || 'Event';
    case 'product':
      return parsed.code;
    case 'text':
      return raw.substring(0, 60) + (raw.length > 60 ? '...' : '');
    default:
      return raw.substring(0, 60);
  }
}

/** Get the color token for a content type */
export function getTypeColor(type: ParsedType): string {
  const colors: Record<ParsedType, string> = {
    url: '#4D7CFF',
    wifi: '#00E5A8',
    contact: '#A855F7',
    phone: '#4D7CFF',
    sms: '#FF8C47',
    email: '#FF5470',
    geo: '#2EE59D',
    calendar: '#FF47A8',
    product: '#FFB547',
    text: '#8A94B2',
  };
  return colors[type] || colors.text;
}

/** Get the icon name (Ionicons) for a content type */
export function getTypeIcon(type: ParsedType): string {
  const icons: Record<ParsedType, string> = {
    url: 'globe-outline',
    wifi: 'wifi-outline',
    contact: 'person-outline',
    phone: 'call-outline',
    sms: 'chatbubble-outline',
    email: 'mail-outline',
    geo: 'location-outline',
    calendar: 'calendar-outline',
    product: 'barcode-outline',
    text: 'text-outline',
  };
  return icons[type] || icons.text;
}
