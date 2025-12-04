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
}

export interface LeagueMembership {
  id: string;
  league_id: string;
  user_id: string;
  role: LeagueRole;
  joined_at: string;
  league: League;
}

interface LeagueContextType {
  memberships: LeagueMembership[];
  currentLeague: League | null;
  currentRole: LeagueRole | null;
  setCurrentLeagueId: (leagueId: string) => void;
  isCommissioner: boolean;
  loading: boolean;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<LeagueMembership[]>([]);
  const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setMemberships([]);
      setCurrentLeagueId(null);
      setLoading(false);
      return;
    }

    const fetchMemberships = async () => {
      setLoading(true);
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
            league:leagues(id, name, season, season_type, created_at)
          `)
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching league memberships:", error);
          setMemberships([]);
        } else if (data) {
          // Transform the data to flatten the league object
          const transformedMemberships: LeagueMembership[] = data.map((m: any) => ({
            id: m.id,
            league_id: m.league_id,
            user_id: m.user_id,
            role: m.role as LeagueRole,
            joined_at: m.joined_at,
            league: m.league as League,
          }));
          
          setMemberships(transformedMemberships);

          // Default to the beta league or first league
          if (transformedMemberships.length > 0 && !currentLeagueId) {
            const betaLeague = transformedMemberships.find(
              m => m.league.name === "2025 Regular Season Beta Test"
            );
            setCurrentLeagueId(betaLeague?.league_id || transformedMemberships[0].league_id);
          }
        }
      } catch (err) {
        console.error("Error fetching memberships:", err);
        setMemberships([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberships();
  }, [user, authLoading]);

  const currentMembership = memberships.find(m => m.league_id === currentLeagueId);
  const currentLeague = currentMembership?.league || null;
  const currentRole = currentMembership?.role || null;
  const isCommissioner = currentRole === "commissioner";

  return (
    <LeagueContext.Provider value={{
      memberships,
      currentLeague,
      currentRole,
      setCurrentLeagueId,
      isCommissioner,
      loading,
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
