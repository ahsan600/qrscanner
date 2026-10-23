import { describe, it, expect } from 'vitest';
import { parseContent, getSmartLabel, ParsedUrl, ParsedWifi, ParsedContact } from './parser';

describe('parser.ts', () => {
  describe('URLs', () => {
    it('parses standard https URLs', () => {
      const res = parseContent('https://example.com/path?foo=bar') as ParsedUrl;
      expect(res.type).toBe('url');
      expect(res.domain).toBe('example.com');
      expect(res.isSuspicious).toBe(false);
    });

    it('flags non-HTTPS URLs as suspicious', () => {
      const res = parseContent('http://insecure-site.org') as ParsedUrl;
      expect(res.type).toBe('url');
      expect(res.isSuspicious).toBe(true);
      expect(res.suspiciousReasons).toContain('Not using HTTPS');
    });

    it('flags IP address URLs as suspicious', () => {
      const res = parseContent('http://192.168.1.1:8080') as ParsedUrl;
      expect(res.type).toBe('url');
      expect(res.isSuspicious).toBe(true);
      expect(res.suspiciousReasons).toContain('IP address instead of domain name');
    });

    it('flags shortened URLs as suspicious', () => {
      const res = parseContent('https://bit.ly/xyz123') as ParsedUrl;
      expect(res.type).toBe('url');
      expect(res.isSuspicious).toBe(true);
      expect(res.suspiciousReasons.some((r) => r.includes('shortener'))).toBe(true);
    });
  });

  describe('Wi-Fi', () => {
    it('parses WPA Wi-Fi format', () => {
      const res = parseContent('WIFI:T:WPA;S:MyHomeNetwork;P:SecretPass123;H:false;;') as ParsedWifi;
      expect(res.type).toBe('wifi');
      expect(res.ssid).toBe('MyHomeNetwork');
      expect(res.password).toBe('SecretPass123');
      expect(res.security).toBe('WPA');
      expect(res.hidden).toBe(false);
      expect(getSmartLabel(res, '')).toBe('MyHomeNetwork');
    });

    it('parses open Wi-Fi network without password', () => {
      const res = parseContent('WIFI:T:nopass;S:PublicCafe;;') as ParsedWifi;
      expect(res.type).toBe('wifi');
      expect(res.ssid).toBe('PublicCafe');
      expect(res.security).toBe('nopass');
      expect(res.password).toBe('');
    });
  });

  describe('Contacts', () => {
    it('parses vCard format', () => {
      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:Jane Doe
TEL:+1234567890
EMAIL:jane@example.com
ORG:Acme Corp
END:VCARD`;
      const res = parseContent(vcard) as ParsedContact;
      expect(res.type).toBe('contact');
      expect(res.name).toBe('Jane Doe');
      expect(res.phone).toBe('+1234567890');
      expect(res.email).toBe('jane@example.com');
      expect(res.org).toBe('Acme Corp');
      expect(getSmartLabel(res, vcard)).toBe('Jane Doe');
    });

    it('parses MECARD format', () => {
      const mecard = 'MECARD:N:Smith,John;TEL:555-1234;EMAIL:john@smith.org;;';
      const res = parseContent(mecard) as ParsedContact;
      expect(res.type).toBe('contact');
      expect(res.name).toBe('John Smith');
      expect(res.phone).toBe('555-1234');
      expect(res.email).toBe('john@smith.org');
    });
  });

  describe('Phone and SMS', () => {
    it('parses tel: scheme', () => {
      const res = parseContent('tel:+18005550199');
      expect(res.type).toBe('phone');
      if (res.type === 'phone') {
        expect(res.number).toBe('+18005550199');
      }
    });

    it('parses smsto: scheme', () => {
      const res = parseContent('smsto:+18005550199:Hello there!');
      expect(res.type).toBe('sms');
      if (res.type === 'sms') {
        expect(res.number).toBe('+18005550199');
        expect(res.body).toBe('Hello there!');
      }
    });
  });

  describe('Email', () => {
    it('parses mailto: URI', () => {
      const res = parseContent('mailto:dev@example.com?subject=Inquiry&body=Testing');
      expect(res.type).toBe('email');
      if (res.type === 'email') {
        expect(res.to).toBe('dev@example.com');
        expect(res.subject).toBe('Inquiry');
        expect(res.body).toBe('Testing');
      }
    });

    it('parses MATMSG format', () => {
      const res = parseContent('MATMSG:TO:test@user.com;SUB:Hello;BODY:World;;');
      expect(res.type).toBe('email');
      if (res.type === 'email') {
        expect(res.to).toBe('test@user.com');
        expect(res.subject).toBe('Hello');
        expect(res.body).toBe('World');
      }
    });
  });

  describe('Geo and Calendar', () => {
    it('parses geo: URI', () => {
      const res = parseContent('geo:37.7749,-122.4194?q=San+Francisco');
      expect(res.type).toBe('geo');
      if (res.type === 'geo') {
        expect(res.latitude).toBeCloseTo(37.7749);
        expect(res.longitude).toBeCloseTo(-122.4194);
      }
    });

    it('parses VEVENT format', () => {
      const vevent = `BEGIN:VEVENT
SUMMARY:Sprint Review
LOCATION:Conference Room B
DTSTART:20261017T100000Z
DTEND:20261017T110000Z
DESCRIPTION:Bi-weekly sprint demonstration
END:VEVENT`;
      const res = parseContent(vevent);
      expect(res.type).toBe('calendar');
      if (res.type === 'calendar') {
        expect(res.title).toBe('Sprint Review');
        expect(res.location).toBe('Conference Room B');
      }
    });
  });

  describe('Products and Plain Text', () => {
    it('identifies EAN_13 barcodes as product barcodes', () => {
      const res = parseContent('737628064502', 'EAN_13');
      expect(res.type).toBe('product');
      if (res.type === 'product') {
        expect(res.code).toBe('737628064502');
      }
    });

    it('falls back to plain text for general text strings', () => {
      const res = parseContent('Just some normal text 12345');
      expect(res.type).toBe('text');
      if (res.type === 'text') {
        expect(res.text).toBe('Just some normal text 12345');
      }
    });

    it('handles null, undefined, empty and malformed input gracefully without crashing', () => {
      expect(parseContent('')).toEqual({ type: 'text', text: '' });
      expect(parseContent(null as unknown as string)).toEqual({ type: 'text', text: '' });
      expect(parseContent('WIFI:malformed;;')).toBeDefined();
      expect(parseContent('BEGIN:VCARD malformed')).toBeDefined();
    });
  });
});
