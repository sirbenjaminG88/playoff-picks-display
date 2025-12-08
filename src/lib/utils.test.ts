import { describe, it, expect } from 'vitest';
import { calculateFantasyPoints, cn } from './utils';

describe('cn (className utility)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should merge tailwind classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });
});

describe('calculateFantasyPoints', () => {
  it('should return null for undefined stats', () => {
    expect(calculateFantasyPoints(undefined)).toBeNull();
    expect(calculateFantasyPoints(null)).toBeNull();
  });

  it('should calculate points for a QB with only passing stats', () => {
    const stats = {
      passYards: 300,
      passTDs: 3,
    };
    // 300/25 = 12 + 3*5 = 15 = 27
    expect(calculateFantasyPoints(stats)).toBe(27);
  });

  it('should calculate points for a RB with only rushing stats', () => {
    const stats = {
      rushYards: 100,
      rushTDs: 1,
    };
    // 100/10 = 10 + 1*6 = 6 = 16
    expect(calculateFantasyPoints(stats)).toBe(16);
  });

  it('should calculate points for a WR/TE with receiving stats', () => {
    const stats = {
      recYards: 120,
      recTDs: 2,
    };
    // 120/10 = 12 + 2*6 = 12 = 24
    expect(calculateFantasyPoints(stats)).toBe(24);
  });

  it('should handle combined rushing and receiving (flex player)', () => {
    const stats = {
      rushYards: 50,
      recYards: 75,
      rushTDs: 1,
      recTDs: 0,
    };
    // (50+75)/10 = 12.5 + 1*6 = 6 = 18.5
    expect(calculateFantasyPoints(stats)).toBe(18.5);
  });

  it('should subtract points for interceptions', () => {
    const stats = {
      passYards: 200,
      passTDs: 1,
      interceptions: 2,
    };
    // 200/25 = 8 + 1*5 = 5 - 2*2 = -4 = 9
    expect(calculateFantasyPoints(stats)).toBe(9);
  });

  it('should subtract points for fumbles lost', () => {
    const stats = {
      rushYards: 80,
      rushTDs: 1,
      fumblesLost: 1,
    };
    // 80/10 = 8 + 1*6 = 6 - 1*2 = -2 = 12
    expect(calculateFantasyPoints(stats)).toBe(12);
  });

  it('should add points for two-point conversions', () => {
    const stats = {
      passYards: 100,
      passTDs: 1,
      twoPtConversions: 2,
    };
    // 100/25 = 4 + 1*5 = 5 + 2*2 = 4 = 13
    expect(calculateFantasyPoints(stats)).toBe(13);
  });

  it('should calculate complex stat line correctly (Baker Mayfield style)', () => {
    const stats = {
      passYards: 254,
      passTDs: 3,
      interceptions: 0,
      rushYards: 28,
      rushTDs: 0,
      recYards: 0,
      recTDs: 0,
      fumblesLost: 1,
      twoPtConversions: 0,
    };
    // 254/25 = 10.16 + 3*5 = 15 + 28/10 = 2.8 - 1*2 = -2 = 25.96
    expect(calculateFantasyPoints(stats)).toBe(25.96);
  });

  it('should handle zero stats', () => {
    const stats = {
      passYards: 0,
      passTDs: 0,
      rushYards: 0,
      rushTDs: 0,
      recYards: 0,
      recTDs: 0,
      interceptions: 0,
      fumblesLost: 0,
      twoPtConversions: 0,
    };
    expect(calculateFantasyPoints(stats)).toBe(0);
  });

  it('should handle only turnovers (negative points)', () => {
    const stats = {
      interceptions: 3,
      fumblesLost: 2,
    };
    // 0 - 3*2 - 2*2 = -10
    expect(calculateFantasyPoints(stats)).toBe(-10);
  });
});
