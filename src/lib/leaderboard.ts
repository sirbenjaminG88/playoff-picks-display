import { WeekResults } from "@/data/playoffResultsData";
import { calculateFantasyPoints } from "@/lib/utils";

export type WeeklyTotal = {
  name: "Jasper" | "Jeremy" | "Eric" | "Ben";
  totalPoints: number;
};

const COMPETITORS: WeeklyTotal["name"][] = ["Jasper", "Jeremy", "Eric", "Ben"];

export function calculateWeeklyTotals(week: WeekResults): WeeklyTotal[] {
  const totalsMap = new Map<WeeklyTotal["name"], number>();
  COMPETITORS.forEach((name) => totalsMap.set(name, 0));

  // helper to accumulate points for each player selection
  const addPointsForPlayers = (players: WeekResults[keyof WeekResults]) => {
    players.forEach((player) => {
      const points = calculateFantasyPoints(player.stats) ?? 0;
      player.selectedBy.forEach((userName) => {
        const current = totalsMap.get(userName as WeeklyTotal["name"]) ?? 0;
        totalsMap.set(userName as WeeklyTotal["name"], current + points);
      });
    });
  };

  addPointsForPlayers(week.qbs);
  addPointsForPlayers(week.rbs);
  addPointsForPlayers(week.flex);

  const totals: WeeklyTotal[] = COMPETITORS.map((name) => ({
    name,
    totalPoints: totalsMap.get(name) ?? 0,
  }));

  // sort descending by total points
  totals.sort((a, b) => b.totalPoints - a.totalPoints);

  return totals;
}
