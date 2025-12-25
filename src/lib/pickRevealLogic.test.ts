import { describe, it, expect } from 'vitest';
import {
  isPlayoffWeek,
  isRegularSeasonWeek,
  hasCompleteSubmission,
  groupPicksByUser,
  getSubmittedUserIds,
  isPastDeadline,
  canViewPicks,
  filterPicksByRevealStatus,
  calculatePickRevealStatus,
  REQUIRED_SLOTS,
} from './pickRevealLogic';

describe('isPlayoffWeek', () => {
  it('should return true for weeks 1-4', () => {
    expect(isPlayoffWeek(1)).toBe(true);
    expect(isPlayoffWeek(2)).toBe(true);
    expect(isPlayoffWeek(3)).toBe(true);
    expect(isPlayoffWeek(4)).toBe(true);
  });

  it('should return false for weeks outside 1-4', () => {
    expect(isPlayoffWeek(0)).toBe(false);
    expect(isPlayoffWeek(5)).toBe(false);
    expect(isPlayoffWeek(14)).toBe(false);
    expect(isPlayoffWeek(17)).toBe(false);
  });
});

describe('isRegularSeasonWeek', () => {
  it('should return true for weeks 14-18', () => {
    expect(isRegularSeasonWeek(14)).toBe(true);
    expect(isRegularSeasonWeek(15)).toBe(true);
    expect(isRegularSeasonWeek(16)).toBe(true);
    expect(isRegularSeasonWeek(17)).toBe(true);
    expect(isRegularSeasonWeek(18)).toBe(true);
  });

  it('should return false for weeks outside 14-18', () => {
    expect(isRegularSeasonWeek(1)).toBe(false);
    expect(isRegularSeasonWeek(13)).toBe(false);
    expect(isRegularSeasonWeek(19)).toBe(false);
  });
});

describe('hasCompleteSubmission', () => {
  it('should return true when all required slots are filled', () => {
    const slots = new Set(['QB', 'RB', 'FLEX']);
    expect(hasCompleteSubmission(slots)).toBe(true);
  });

  it('should return true with extra slots beyond required', () => {
    const slots = new Set(['QB', 'RB', 'FLEX', 'WR']);
    expect(hasCompleteSubmission(slots)).toBe(true);
  });

  it('should return false when QB is missing', () => {
    const slots = new Set(['RB', 'FLEX']);
    expect(hasCompleteSubmission(slots)).toBe(false);
  });

  it('should return false when RB is missing', () => {
    const slots = new Set(['QB', 'FLEX']);
    expect(hasCompleteSubmission(slots)).toBe(false);
  });

  it('should return false when FLEX is missing', () => {
    const slots = new Set(['QB', 'RB']);
    expect(hasCompleteSubmission(slots)).toBe(false);
  });

  it('should return false for empty slots', () => {
    expect(hasCompleteSubmission(new Set())).toBe(false);
  });

  it('should return false for partial submission', () => {
    const slots = new Set(['QB']);
    expect(hasCompleteSubmission(slots)).toBe(false);
  });
});

describe('groupPicksByUser', () => {
  it('should group picks by user ID', () => {
    const picks = [
      { auth_user_id: 'user1', position_slot: 'QB' },
      { auth_user_id: 'user1', position_slot: 'RB' },
      { auth_user_id: 'user2', position_slot: 'QB' },
    ];

    const result = groupPicksByUser(picks);

    expect(result.size).toBe(2);
    expect(result.get('user1')).toEqual(new Set(['QB', 'RB']));
    expect(result.get('user2')).toEqual(new Set(['QB']));
  });

  it('should ignore picks with null auth_user_id', () => {
    const picks = [
      { auth_user_id: 'user1', position_slot: 'QB' },
      { auth_user_id: null, position_slot: 'RB' },
    ];

    const result = groupPicksByUser(picks);

    expect(result.size).toBe(1);
    expect(result.get('user1')).toEqual(new Set(['QB']));
  });

  it('should handle empty picks array', () => {
    const result = groupPicksByUser([]);
    expect(result.size).toBe(0);
  });

  it('should not duplicate slots for same user', () => {
    const picks = [
      { auth_user_id: 'user1', position_slot: 'QB' },
      { auth_user_id: 'user1', position_slot: 'QB' }, // Duplicate
    ];

    const result = groupPicksByUser(picks);

    expect(result.get('user1')?.size).toBe(1);
  });
});

describe('getSubmittedUserIds', () => {
  it('should return users with complete submissions', () => {
    const userSlots = new Map<string, Set<string>>([
      ['user1', new Set(['QB', 'RB', 'FLEX'])],
      ['user2', new Set(['QB', 'RB'])], // Incomplete
      ['user3', new Set(['QB', 'RB', 'FLEX'])],
    ]);

    const result = getSubmittedUserIds(userSlots);

    expect(result).toContain('user1');
    expect(result).toContain('user3');
    expect(result).not.toContain('user2');
    expect(result.length).toBe(2);
  });

  it('should return empty array when no one has submitted', () => {
    const userSlots = new Map<string, Set<string>>([
      ['user1', new Set(['QB'])],
      ['user2', new Set(['RB', 'FLEX'])],
    ]);

    const result = getSubmittedUserIds(userSlots);

    expect(result).toEqual([]);
  });

  it('should handle empty map', () => {
    const result = getSubmittedUserIds(new Map());
    expect(result).toEqual([]);
  });
});

describe('isPastDeadline', () => {
  it('should return true when now is after kickoff', () => {
    const now = new Date('2025-01-10T20:00:00Z');
    const kickoff = '2025-01-10T18:00:00Z';

    expect(isPastDeadline(now, kickoff)).toBe(true);
  });

  it('should return true when now equals kickoff exactly', () => {
    const now = new Date('2025-01-10T18:00:00Z');
    const kickoff = '2025-01-10T18:00:00Z';

    expect(isPastDeadline(now, kickoff)).toBe(true);
  });

  it('should return false when now is before kickoff', () => {
    const now = new Date('2025-01-10T16:00:00Z');
    const kickoff = '2025-01-10T18:00:00Z';

    expect(isPastDeadline(now, kickoff)).toBe(false);
  });

  it('should return false when kickoff is null', () => {
    const now = new Date('2025-01-10T20:00:00Z');

    expect(isPastDeadline(now, null)).toBe(false);
  });

  it('should handle timezone differences correctly', () => {
    // 1pm EST = 18:00 UTC
    const now = new Date('2025-01-10T18:01:00Z');
    const kickoff = '2025-01-10T18:00:00Z';

    expect(isPastDeadline(now, kickoff)).toBe(true);
  });
});

describe('canViewPicks', () => {
  it('should return true when user has submitted', () => {
    expect(canViewPicks(true, false)).toBe(true);
  });

  it('should return true when past deadline', () => {
    expect(canViewPicks(false, true)).toBe(true);
  });

  it('should return true when both submitted and past deadline', () => {
    expect(canViewPicks(true, true)).toBe(true);
  });

  it('should return false when not submitted and before deadline', () => {
    expect(canViewPicks(false, false)).toBe(false);
  });
});

describe('filterPicksByRevealStatus', () => {
  const picks = [
    { auth_user_id: 'user1', position_slot: 'QB', player_name: 'Player A' },
    { auth_user_id: 'user2', position_slot: 'QB', player_name: 'Player B' },
    { auth_user_id: 'user3', position_slot: 'QB', player_name: 'Player C' },
  ];

  it('should return all picks when past deadline', () => {
    const result = filterPicksByRevealStatus(picks, ['user1'], true);
    expect(result.length).toBe(3);
  });

  it('should filter to only submitted users before deadline', () => {
    const result = filterPicksByRevealStatus(picks, ['user1', 'user3'], false);

    expect(result.length).toBe(2);
    expect(result.map(p => p.auth_user_id)).toContain('user1');
    expect(result.map(p => p.auth_user_id)).toContain('user3');
    expect(result.map(p => p.auth_user_id)).not.toContain('user2');
  });

  it('should return empty array when no submitted users before deadline', () => {
    const result = filterPicksByRevealStatus(picks, [], false);
    expect(result.length).toBe(0);
  });

  it('should filter out picks with null auth_user_id', () => {
    const picksWithNull = [
      { auth_user_id: 'user1', position_slot: 'QB' },
      { auth_user_id: null, position_slot: 'RB' },
    ];

    const result = filterPicksByRevealStatus(picksWithNull, ['user1'], false);
    expect(result.length).toBe(1);
  });
});

describe('calculatePickRevealStatus', () => {
  it('should correctly identify submitted user', () => {
    const picks = [
      { auth_user_id: 'user1', position_slot: 'QB' },
      { auth_user_id: 'user1', position_slot: 'RB' },
      { auth_user_id: 'user1', position_slot: 'FLEX' },
    ];

    const result = calculatePickRevealStatus(
      picks,
      'user1',
      '2025-01-10T18:00:00Z',
      new Date('2025-01-09T12:00:00Z') // Before deadline
    );

    expect(result.currentUserSubmitted).toBe(true);
    expect(result.pastDeadline).toBe(false);
    expect(result.submittedUserIds).toContain('user1');
  });

  it('should correctly identify non-submitted user', () => {
    const picks = [
      { auth_user_id: 'user1', position_slot: 'QB' },
      { auth_user_id: 'user1', position_slot: 'RB' },
      // Missing FLEX
    ];

    const result = calculatePickRevealStatus(
      picks,
      'user1',
      '2025-01-10T18:00:00Z',
      new Date('2025-01-09T12:00:00Z')
    );

    expect(result.currentUserSubmitted).toBe(false);
    expect(result.submittedUserIds).not.toContain('user1');
  });

  it('should handle user with no picks', () => {
    const picks = [
      { auth_user_id: 'user2', position_slot: 'QB' },
      { auth_user_id: 'user2', position_slot: 'RB' },
      { auth_user_id: 'user2', position_slot: 'FLEX' },
    ];

    const result = calculatePickRevealStatus(
      picks,
      'user1', // Different user
      '2025-01-10T18:00:00Z',
      new Date('2025-01-09T12:00:00Z')
    );

    expect(result.currentUserSubmitted).toBe(false);
    expect(result.submittedUserIds).toContain('user2');
    expect(result.submittedUserIds).not.toContain('user1');
  });

  it('should correctly identify past deadline', () => {
    const result = calculatePickRevealStatus(
      [],
      'user1',
      '2025-01-10T18:00:00Z',
      new Date('2025-01-10T20:00:00Z') // After deadline
    );

    expect(result.pastDeadline).toBe(true);
  });

  it('should handle multiple users with various submission states', () => {
    const picks = [
      // User1: complete
      { auth_user_id: 'user1', position_slot: 'QB' },
      { auth_user_id: 'user1', position_slot: 'RB' },
      { auth_user_id: 'user1', position_slot: 'FLEX' },
      // User2: incomplete
      { auth_user_id: 'user2', position_slot: 'QB' },
      // User3: complete
      { auth_user_id: 'user3', position_slot: 'QB' },
      { auth_user_id: 'user3', position_slot: 'RB' },
      { auth_user_id: 'user3', position_slot: 'FLEX' },
    ];

    const result = calculatePickRevealStatus(
      picks,
      'user2',
      '2025-01-10T18:00:00Z',
      new Date('2025-01-09T12:00:00Z')
    );

    expect(result.currentUserSubmitted).toBe(false);
    expect(result.submittedUserIds).toEqual(expect.arrayContaining(['user1', 'user3']));
    expect(result.submittedUserIds).not.toContain('user2');
    expect(result.submittedUserIds.length).toBe(2);
  });
});

describe('REQUIRED_SLOTS constant', () => {
  it('should contain QB, RB, and FLEX', () => {
    expect(REQUIRED_SLOTS).toContain('QB');
    expect(REQUIRED_SLOTS).toContain('RB');
    expect(REQUIRED_SLOTS).toContain('FLEX');
    expect(REQUIRED_SLOTS.length).toBe(3);
  });
});

// Integration-style tests for common scenarios
describe('Pick Reveal Scenarios', () => {
  describe('Scenario: User has not submitted, before deadline', () => {
    it('should not allow viewing picks', () => {
      const picks = [
        { auth_user_id: 'other', position_slot: 'QB' },
        { auth_user_id: 'other', position_slot: 'RB' },
        { auth_user_id: 'other', position_slot: 'FLEX' },
      ];

      const status = calculatePickRevealStatus(
        picks,
        'me',
        '2025-01-10T18:00:00Z',
        new Date('2025-01-09T12:00:00Z')
      );

      expect(canViewPicks(status.currentUserSubmitted, status.pastDeadline)).toBe(false);
    });
  });

  describe('Scenario: User has submitted, before deadline', () => {
    it('should allow viewing only submitted users picks', () => {
      const picks = [
        // Me: complete
        { auth_user_id: 'me', position_slot: 'QB' },
        { auth_user_id: 'me', position_slot: 'RB' },
        { auth_user_id: 'me', position_slot: 'FLEX' },
        // Other1: complete
        { auth_user_id: 'other1', position_slot: 'QB' },
        { auth_user_id: 'other1', position_slot: 'RB' },
        { auth_user_id: 'other1', position_slot: 'FLEX' },
        // Other2: incomplete (shouldn't see their picks)
        { auth_user_id: 'other2', position_slot: 'QB' },
      ];

      const status = calculatePickRevealStatus(
        picks,
        'me',
        '2025-01-10T18:00:00Z',
        new Date('2025-01-09T12:00:00Z')
      );

      expect(canViewPicks(status.currentUserSubmitted, status.pastDeadline)).toBe(true);

      const filtered = filterPicksByRevealStatus(picks, status.submittedUserIds, status.pastDeadline);

      // Should only see picks from me and other1 (both submitted)
      const visibleUsers = [...new Set(filtered.map(p => p.auth_user_id))];
      expect(visibleUsers).toContain('me');
      expect(visibleUsers).toContain('other1');
      expect(visibleUsers).not.toContain('other2');
    });
  });

  describe('Scenario: After deadline', () => {
    it('should allow viewing all picks regardless of submission status', () => {
      const picks = [
        { auth_user_id: 'user1', position_slot: 'QB' }, // Incomplete
        { auth_user_id: 'user2', position_slot: 'QB' },
        { auth_user_id: 'user2', position_slot: 'RB' },
        { auth_user_id: 'user2', position_slot: 'FLEX' },
      ];

      const status = calculatePickRevealStatus(
        picks,
        'user1',
        '2025-01-10T18:00:00Z',
        new Date('2025-01-10T20:00:00Z') // After deadline
      );

      expect(canViewPicks(status.currentUserSubmitted, status.pastDeadline)).toBe(true);

      const filtered = filterPicksByRevealStatus(picks, status.submittedUserIds, status.pastDeadline);

      // Should see all picks including incomplete user1
      expect(filtered.length).toBe(4);
    });
  });

  describe('Scenario: Edge case - exactly at deadline', () => {
    it('should treat exact deadline time as past deadline', () => {
      const status = calculatePickRevealStatus(
        [],
        'user1',
        '2025-01-10T18:00:00Z',
        new Date('2025-01-10T18:00:00Z') // Exactly at deadline
      );

      expect(status.pastDeadline).toBe(true);
    });
  });
});
