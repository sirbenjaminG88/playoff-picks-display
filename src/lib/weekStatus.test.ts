import { describe, it, expect } from 'vitest';
import { getWeekStatus, getCurrentOpenWeek } from './weekStatus';
import { Week, Pick } from '@/domain/types';

// Helper to create a mock week
function createMockWeek(overrides?: Partial<Week>): Week {
  return {
    id: 'week-1',
    season: 2025,
    weekNumber: 1,
    openAt: '2025-01-01T12:00:00Z',
    deadlineAt: '2025-01-05T18:00:00Z',
    ...overrides,
  };
}

// Helper to create a mock pick
function createMockPick(overrides?: Partial<Pick>): Pick {
  return {
    id: 'pick-1',
    leagueId: 'league-1',
    userId: 'user-1',
    weekId: 'week-1',
    positionSlot: 'QB',
    playerId: 'player-123',
    submittedAt: '2025-01-02T12:00:00Z',
    ...overrides,
  };
}

describe('getWeekStatus', () => {
  it('should return SUBMITTED when user has picks', () => {
    const week = createMockWeek();
    const picks = [createMockPick()];
    
    const status = getWeekStatus({
      week,
      userPicksForWeek: picks,
      now: new Date('2025-01-03T12:00:00Z'),
    });
    
    expect(status).toBe('SUBMITTED');
  });

  it('should return OPEN_NOT_SUBMITTED when within window and no picks', () => {
    const week = createMockWeek({
      openAt: '2025-01-01T12:00:00Z',
      deadlineAt: '2025-01-05T18:00:00Z',
    });
    
    const status = getWeekStatus({
      week,
      userPicksForWeek: [],
      now: new Date('2025-01-03T12:00:00Z'), // Within window
    });
    
    expect(status).toBe('OPEN_NOT_SUBMITTED');
  });

  it('should return FUTURE_LOCKED when before open time', () => {
    const week = createMockWeek({
      openAt: '2025-01-10T12:00:00Z',
      deadlineAt: '2025-01-15T18:00:00Z',
    });
    
    const status = getWeekStatus({
      week,
      userPicksForWeek: [],
      now: new Date('2025-01-05T12:00:00Z'), // Before open
    });
    
    expect(status).toBe('FUTURE_LOCKED');
  });

  it('should return PAST_NO_PICKS when after deadline with no picks', () => {
    const week = createMockWeek({
      openAt: '2025-01-01T12:00:00Z',
      deadlineAt: '2025-01-05T18:00:00Z',
    });
    
    const status = getWeekStatus({
      week,
      userPicksForWeek: [],
      now: new Date('2025-01-10T12:00:00Z'), // After deadline
    });
    
    expect(status).toBe('PAST_NO_PICKS');
  });

  it('should return SUBMITTED even after deadline if user has picks', () => {
    const week = createMockWeek({
      openAt: '2025-01-01T12:00:00Z',
      deadlineAt: '2025-01-05T18:00:00Z',
    });
    const picks = [createMockPick()];
    
    const status = getWeekStatus({
      week,
      userPicksForWeek: picks,
      now: new Date('2025-01-10T12:00:00Z'), // After deadline
    });
    
    expect(status).toBe('SUBMITTED');
  });

  it('should handle edge case at exact open time', () => {
    const week = createMockWeek({
      openAt: '2025-01-01T12:00:00Z',
      deadlineAt: '2025-01-05T18:00:00Z',
    });
    
    const status = getWeekStatus({
      week,
      userPicksForWeek: [],
      now: new Date('2025-01-01T12:00:00Z'), // Exactly at open time
    });
    
    expect(status).toBe('OPEN_NOT_SUBMITTED');
  });

  it('should handle edge case at exact deadline', () => {
    const week = createMockWeek({
      openAt: '2025-01-01T12:00:00Z',
      deadlineAt: '2025-01-05T18:00:00Z',
    });
    
    const status = getWeekStatus({
      week,
      userPicksForWeek: [],
      now: new Date('2025-01-05T18:00:00Z'), // Exactly at deadline
    });
    
    expect(status).toBe('OPEN_NOT_SUBMITTED');
  });
});

describe('getCurrentOpenWeek', () => {
  it('should return the open week when one exists', () => {
    const weeks: Week[] = [
      createMockWeek({ id: 'w1', weekNumber: 1, openAt: '2025-01-01T12:00:00Z', deadlineAt: '2025-01-05T18:00:00Z' }),
      createMockWeek({ id: 'w2', weekNumber: 2, openAt: '2025-01-08T12:00:00Z', deadlineAt: '2025-01-12T18:00:00Z' }),
    ];
    
    const now = new Date('2025-01-03T12:00:00Z');
    const result = getCurrentOpenWeek(weeks, now);
    
    expect(result).not.toBeNull();
    expect(result?.weekNumber).toBe(1);
  });

  it('should return null when no week is open', () => {
    const weeks: Week[] = [
      createMockWeek({ id: 'w1', weekNumber: 1, openAt: '2025-01-01T12:00:00Z', deadlineAt: '2025-01-05T18:00:00Z' }),
      createMockWeek({ id: 'w2', weekNumber: 2, openAt: '2025-01-08T12:00:00Z', deadlineAt: '2025-01-12T18:00:00Z' }),
    ];
    
    const now = new Date('2025-01-06T12:00:00Z'); // Between weeks
    const result = getCurrentOpenWeek(weeks, now);
    
    expect(result).toBeNull();
  });

  it('should return null for empty weeks array', () => {
    const result = getCurrentOpenWeek([], new Date());
    expect(result).toBeNull();
  });
});
