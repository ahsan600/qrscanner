import { describe, it, expect } from 'vitest';
import {
  barcodeValidators,
  sanitizeUrl,
  truncate,
  getDateGroup,
  generateId,
} from './helpers';

describe('helpers.ts & barcodeValidators', () => {
  describe('barcodeValidators', () => {
    it('validates EAN-13 format', () => {
      const validator = barcodeValidators['EAN-13'];
      expect(validator('1234567890123')).toBeNull(); // 13 digits valid
      expect(validator('123456789012')).toBeNull(); // 12 digits valid
      expect(validator('12345')).toBe('EAN-13 requires 12 or 13 digits');
      expect(validator('12345678901234')).toBe('EAN-13 requires 12 or 13 digits');
      expect(validator('123456789012A')).toBe('EAN-13 requires 12 or 13 digits');
    });

    it('validates EAN-8 format', () => {
      const validator = barcodeValidators['EAN-8'];
      expect(validator('12345678')).toBeNull(); // 8 digits
      expect(validator('1234567')).toBeNull(); // 7 digits
      expect(validator('1234')).toBe('EAN-8 requires 7 or 8 digits');
    });

    it('validates UPC-A format', () => {
      const validator = barcodeValidators['UPC-A'];
      expect(validator('123456789012')).toBeNull();
      expect(validator('12345678901')).toBeNull();
      expect(validator('12345')).toBe('UPC-A requires 11 or 12 digits');
    });

    it('validates Code 128 format', () => {
      const validator = barcodeValidators['Code 128'];
      expect(validator('ABC-123_xyz')).toBeNull();
      expect(validator('')).toBe('Value cannot be empty');
    });

    it('validates Code 39 format', () => {
      const validator = barcodeValidators['Code 39'];
      expect(validator('CODE39 123-.$/+%')).toBeNull();
      expect(validator('lowercase!#')).toBe('Code 39 supports A-Z, 0-9, and special chars');
    });

    it('validates ITF format (even number of digits)', () => {
      const validator = barcodeValidators['ITF'];
      expect(validator('123456')).toBeNull();
      expect(validator('12345')).toBe('ITF requires an even number of digits');
      expect(validator('12345A')).toBe('ITF requires an even number of digits');
    });
  });

  describe('utility helpers', () => {
    it('sanitizes URLs correctly', () => {
      expect(sanitizeUrl('https://valid.com')).toBe('https://valid.com');
      expect(sanitizeUrl('http://valid.com')).toBe('http://valid.com');
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('data:text/html,evil')).toBe('');
    });

    it('truncates strings properly', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
      expect(truncate('A very long text that exceeds limit', 10)).toBe('A very lon...');
    });

    it('calculates date groups for today', () => {
      const now = Date.now();
      expect(getDateGroup(now)).toBe('Today');
    });

    it('generates unique random IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
    });
  });
});
