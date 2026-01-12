import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type LeagueRole = "commissioner" | "player";

export interface League {
  id: string;
  name: string;
  season: number;
  season_type: string;
  created_at: string;
  icon_url: string | null;
  member_count?: number;
  pick_count?: number;
}

export interface LeagueMembership {
  id: string;
  league_id: string;
  user_id: string;
  role: LeagueRole;
  joined_at: string;
  league: League;
  isFounderView?: boolean; // True when admin is viewing a league they're not a member of
}

interface LeagueContextType {
  memberships: LeagueMembership[];
  currentLeague: League | null;
  currentRole: LeagueRole | null;
  setCurrentLeagueId: (leagueId: string) => void;
  isCommissioner: boolean;
  loading: boolean;
  // Founder mode (admin only)
  founderMode: boolean;
  setFounderMode: (enabled: boolean) => void;
  isFounderViewing: boolean; // True when currently viewing a league as founder (not a member)
  allLeagues: League[]; // All leagues (for founder mode)
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<LeagueMembership[]>([]);
  const [allLeagues, setAllLeagues] = useState<League[]>([]);
  const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [founderMode, setFounderMode] = useState(false);

  // Fetch user's actual memberships
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setMemberships([]);
      setAllLeagues([]);
      setCurrentLeagueId(null);
      setLoading(false);
      return;
    }

    const fetchMemberships = async () => {
      setLoading(true);
      console.log("[LeagueContext] Fetching memberships for user:", user.id);
      try {
        // Fetch user's league memberships with league data
        const { data, error } = await supabase
          .from("league_members")
          .select(`
            id,
            league_id,
            user_id,
            role,
            joined_at,
            league:leagues(id, name, season, season_type, created_at, icon_url)
          `)
          .eq("user_id", user.id);

        console.log("[LeagueContext] Query result:", { data, error });

        if (error) {
          console.error("[LeagueContext] Error fetching league memberships:", error);
          setMemberships([]);
        } else if (data) {
          console.log("[LeagueContext] Raw data:", JSON.stringify(data, null, 2));
          
          // Transform the data to flatten the league object
          const transformedMemberships: LeagueMembership[] = data.map((m: any) => ({
            id: m.id,
            league_id: m.league_id,
            user_id: m.user_id,
            role: m.role as LeagueRole,
            joined_at: m.joined_at,
            league: m.league as League,
            isFounderView: false,
          }));
          
          console.log("[LeagueContext] Transformed memberships:", transformedMemberships);
          setMemberships(transformedMemberships);

          // Default to the beta league or first league
          if (transformedMemberships.length > 0 && !currentLeagueId) {
            const betaLeague = transformedMemberships.find(
              m => m.league.name === "2025 Regular Season Beta Test"
            );
            const selectedId = betaLeague?.league_id || transformedMemberships[0].league_id;
            console.log("[LeagueContext] Setting currentLeagueId to:", selectedId);
            setCurrentLeagueId(selectedId);
          }
        }
      } catch (err) {
        console.error("[LeagueContext] Error fetching memberships:", err);
        setMemberships([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberships();
  }, [user, authLoading]);

  // Fetch all leagues for founder mode (admin only) with activity counts
  useEffect(() => {
    if (!isAdmin || !user) {
      setAllLeagues([]);
      return;
    }

    const fetchAllLeagues = async () => {
      console.log("[LeagueContext] Admin detected, fetching all leagues with activity...");
      
      // Fetch leagues with member counts
      const { data: leaguesData, error: leaguesError } = await supabase
        .from("leagues")
        .select("id, name, season, season_type, created_at, icon_url")
        .order("created_at", { ascending: false });

      if (leaguesError) {
        console.error("[LeagueContext] Error fetching all leagues:", leaguesError);
        return;
      }

      if (!leaguesData) {
        setAllLeagues([]);
        return;
      }

      // Fetch member counts per league
      const { data: memberCounts } = await supabase
        .from("league_members")
        .select("league_id");

      // Fetch pick counts per league (activity indicator)
      const { data: pickCounts } = await supabase
        .from("user_picks")
        .select("league_id");

      // Count members and picks per league
      const memberCountMap = new Map<string, number>();
      const pickCountMap = new Map<string, number>();

      memberCounts?.forEach(m => {
        const count = memberCountMap.get(m.league_id) || 0;
        memberCountMap.set(m.league_id, count + 1);
      });

      pickCounts?.forEach(p => {
        const count = pickCountMap.get(p.league_id) || 0;
        pickCountMap.set(p.league_id, count + 1);
      });

      // Enrich leagues with counts and sort by activity (pick count + member count)
      const enrichedLeagues: League[] = leaguesData.map(league => ({
        ...league,
        member_count: memberCountMap.get(league.id) || 0,
        pick_count: pickCountMap.get(league.id) || 0,
      }));

      // Sort by activity: pick_count desc, then member_count desc, then created_at desc
      enrichedLeagues.sort((a, b) => {
        const activityA = (a.pick_count || 0) + (a.member_count || 0);
        const activityB = (b.pick_count || 0) + (b.member_count || 0);
        if (activityB !== activityA) return activityB - activityA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      console.log("[LeagueContext] Fetched all leagues with activity:", enrichedLeagues.length);
      setAllLeagues(enrichedLeagues);
    };

    fetchAllLeagues();
  }, [isAdmin, user]);

  // Combine real memberships with founder-view synthetic memberships
  const effectiveMemberships: LeagueMembership[] = founderMode && isAdmin
    ? allLeagues.map(league => {
        // Check if user is actually a member
        const realMembership = memberships.find(m => m.league_id === league.id);
        if (realMembership) {
          return realMembership;
        }
        // Create synthetic membership for founder viewing
        return {
          id: `founder-${league.id}`,
          league_id: league.id,
          user_id: user?.id || "",
          role: "player" as LeagueRole,
          joined_at: new Date().toISOString(),
          league,
          isFounderView: true,
        };
      })
    : memberships;

  const currentMembership = effectiveMemberships.find(m => m.league_id === currentLeagueId);
  const currentLeague = currentMembership?.league || null;
  const currentRole = currentMembership?.role || null;
  const isCommissioner = currentRole === "commissioner";
  const isFounderViewing = currentMembership?.isFounderView === true;

  return (
    <LeagueContext.Provider value={{
      memberships: effectiveMemberships,
      currentLeague,
      currentRole,
      setCurrentLeagueId,
      isCommissioner,
      loading,
      founderMode,
      setFounderMode,
      isFounderViewing,
      allLeagues,
    }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const context = useContext(LeagueContext);
  if (context === undefined) {
    throw new Error("useLeague must be used within a LeagueProvider");
  }
  return context;
}
