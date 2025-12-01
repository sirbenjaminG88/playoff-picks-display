// Basic shared types
export type Position = "QB" | "RB" | "WR" | "TE";
export type PositionSlot = "QB" | "RB" | "FLEX";

// Users are the actual people (can be in many leagues)
export interface User {
  id: string;
  displayName: string;
  email?: string;
  photoUrl?: string; // avatar or selfie from their phone
}

// A league is one EMMA game with a group of friends
export interface League {
  id: string;
  name: string;
  season: number; // e.g. 2024
  joinCode: string; // for invites later
  commissionerId: string; // User.id
  createdAt: string; // ISO date
}

export type LeagueRole = "commissioner" | "member";

// LeagueMember connects a User to a League.
// This lets a single user be in multiple leagues with different roles.
export interface LeagueMember {
  id: string;
  leagueId: string;
  userId: string;
  role: LeagueRole;
}

// A Week is a playoff week within a season.
export interface Week {
  id: string;
  season: number;
  weekNumber: number; // 1–4 for playoffs
  // When this week becomes available for making picks
  openAt: string; // ISO date-time
  // When picks lock for this week (kickoff of first game)
  deadlineAt: string; // ISO date-time
}

// NFL player
export interface Player {
  id: string;
  name: string;
  team: string;
  position: Position;
  externalPlayerId?: string; // ID from the external NFL API
}

// Individual NFL game (primarily for future API usage)
export interface Game {
  id: string;
  weekId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string; // ISO date-time
  externalGameId?: string; // ID from the external NFL API
}

// Stats for a single player in a given week
export interface PlayerStats {
  playerId: string;
  weekId: string;
  gameId?: string;

  passYards: number;
  passTDs: number;
  rushYards: number;
  recYards: number;
  rushTDs: number;
  recTDs: number;
  interceptions: number;
  fumblesLost: number;
  twoPtConversions: number;

  source: "manual" | "api";
}

// A user's weekly pick in a league.
export interface Pick {
  id: string;
  leagueId: string;
  userId: string;
  weekId: string;
  positionSlot: PositionSlot; // QB, RB, or FLEX (WR/TE)
  playerId: string;
  submittedAt: string; // ISO date-time
}
