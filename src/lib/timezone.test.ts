import { describe, it, expect } from 'vitest';
import {
  formatGameDateET,
  formatGameDateShortET,
  formatTimeET,
  formatDateOnlyET,
  isDeadlinePassed,
  isWindowOpen,
  formatDeadlineET,
} from './timezone';

describe('formatGameDateET', () => {
  it('should return TBD for null/undefined', () => {
    expect(formatGameDateET(null)).toBe('TBD');
    expect(formatGameDateET(undefined)).toBe('TBD');
  });

  it('should format a valid date string', () => {
    // This test may vary based on the actual date, but should end with "ET"
    const result = formatGameDateET('2025-01-05T18:00:00Z');
    expect(result).toContain('ET');
    expect(result).toContain('Jan');
  });

  it('should handle Date objects', () => {
    const date = new Date('2025-01-05T18:00:00Z');
    const result = formatGameDateET(date);
    expect(result).toContain('ET');
  });
});

describe('formatGameDateShortET', () => {
  it('should return TBD for null/undefined', () => {
    expect(formatGameDateShortET(null)).toBe('TBD');
    expect(formatGameDateShortET(undefined)).toBe('TBD');
  });

  it('should format without day of week', () => {
    const result = formatGameDateShortET('2025-01-05T18:00:00Z');
    expect(result).toContain('ET');
    expect(result).toContain('Jan');
    expect(result).not.toContain('Sun'); // Short format excludes day of week
  });
});

describe('formatTimeET', () => {
  it('should return TBD for null/undefined', () => {
    expect(formatTimeET(null)).toBe('TBD');
    expect(formatTimeET(undefined)).toBe('TBD');
  });

  it('should format just the time', () => {
    const result = formatTimeET('2025-01-05T18:00:00Z');
    expect(result).toContain('ET');
    expect(result).toContain('PM');
    expect(result).not.toContain('Jan'); // Time only, no date
  });
});

describe('formatDateOnlyET', () => {
  it('should return TBD for null/undefined', () => {
    expect(formatDateOnlyET(null)).toBe('TBD');
    expect(formatDateOnlyET(undefined)).toBe('TBD');
  });

  it('should format just the date without time', () => {
    const result = formatDateOnlyET('2025-01-05T18:00:00Z');
    expect(result).toContain('Jan');
    expect(result).not.toContain('PM'); // Date only, no time
    expect(result).not.toContain('ET'); // No timezone for date-only
  });
});

describe('isDeadlinePassed', () => {
  it('should return true when now is after deadline', () => {
    const deadline = '2025-01-05T18:00:00Z';
    const now = new Date('2025-01-06T12:00:00Z');
    
    expect(isDeadlinePassed(deadline, now)).toBe(true);
  });

  it('should return false when now is before deadline', () => {
    const deadline = '2025-01-05T18:00:00Z';
    const now = new Date('2025-01-04T12:00:00Z');
    
    expect(isDeadlinePassed(deadline, now)).toBe(false);
  });

  it('should return false when now equals deadline', () => {
    const deadline = '2025-01-05T18:00:00Z';
    const now = new Date('2025-01-05T18:00:00Z');
    
    expect(isDeadlinePassed(deadline, now)).toBe(false);
  });

  it('should handle Date objects', () => {
    const deadline = new Date('2025-01-05T18:00:00Z');
    const now = new Date('2025-01-06T12:00:00Z');
    
    expect(isDeadlinePassed(deadline, now)).toBe(true);
  });
});

describe('isWindowOpen', () => {
  it('should return true when within window', () => {
    const openAt = '2025-01-01T12:00:00Z';
    const deadline = '2025-01-05T18:00:00Z';
    const now = new Date('2025-01-03T12:00:00Z');
    
    expect(isWindowOpen(openAt, deadline, now)).toBe(true);
  });

  it('should return false when before window', () => {
    const openAt = '2025-01-01T12:00:00Z';
    const deadline = '2025-01-05T18:00:00Z';
    const now = new Date('2024-12-31T12:00:00Z');
    
    expect(isWindowOpen(openAt, deadline, now)).toBe(false);
  });

  it('should return false when after window', () => {
    const openAt = '2025-01-01T12:00:00Z';
    const deadline = '2025-01-05T18:00:00Z';
    const now = new Date('2025-01-06T12:00:00Z');
    
    expect(isWindowOpen(openAt, deadline, now)).toBe(false);
  });

  it('should return true at exact open time', () => {
    const openAt = '2025-01-01T12:00:00Z';
    const deadline = '2025-01-05T18:00:00Z';
    const now = new Date('2025-01-01T12:00:00Z');
    
    expect(isWindowOpen(openAt, deadline, now)).toBe(true);
  });

  it('should return true at exact deadline', () => {
    const openAt = '2025-01-01T12:00:00Z';
    const deadline = '2025-01-05T18:00:00Z';
    const now = new Date('2025-01-05T18:00:00Z');
    
    expect(isWindowOpen(openAt, deadline, now)).toBe(true);
  });
});

describe('formatDeadlineET', () => {
  it('should return empty string for null/undefined', () => {
    expect(formatDeadlineET(null)).toBe('');
    expect(formatDeadlineET(undefined)).toBe('');
  });

  it('should format with "Picks lock" prefix', () => {
    const result = formatDeadlineET('2025-01-05T18:00:00Z');
    expect(result).toContain('Picks lock');
    expect(result).toContain('ET');
  });
});
