import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PlayerStats } from "@/data/playoffResultsData";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateFantasyPoints(stats?: PlayerStats | null): number | null {
  if (!stats) return null;

  const passYards = stats.passYards ?? 0;
  const passTDs = stats.passTDs ?? 0;

  // Combine rushing & receiving yards
  const totalYards = (stats.rushYards ?? 0) + (stats.recYards ?? 0);

  // Combine rushing & receiving TDs
  const totalTDs = (stats.rushTDs ?? 0) + (stats.recTDs ?? 0);

  // Turnovers = interceptions + fumbles LOST only
  const turnovers = (stats.interceptions ?? 0) + (stats.fumblesLost ?? 0);

  const twoPtConversions = stats.twoPtConversions ?? 0;

  const points =
    passYards / 25 +
    passTDs * 5 +
    totalYards / 10 +
    totalTDs * 6 -
    turnovers * 2 +
    twoPtConversions * 2;

  return Math.round(points * 100) / 100;
}
