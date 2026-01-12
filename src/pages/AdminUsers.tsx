import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getInitials } from "@/lib/displayName";

interface LeagueMembership {
  membership_id: string;
  league_id: string;
  league_name: string;
  season: number;
  season_type: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  league_role: "commissioner" | "player";
  app_role: "admin" | "player" | null;
  joined_at: string | null;
}

const AdminUsers = () => {
  const [memberships, setMemberships] = useState<LeagueMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const { data, error } = await supabase
          .from("v_league_memberships")
          .select("*")
          .order("league_name", { ascending: true })
          .order("display_name", { ascending: true });

        if (error) throw error;
        setMemberships(data as LeagueMembership[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchMemberships();
  }, []);

  const getInitialsWithFallback = (name: string | null, email: string) => {
    if (name) {
      return getInitials(name);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Users & Leagues</h1>
          <p className="text-muted-foreground text-sm">
            Admin view of all users and their league memberships
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>League Memberships</CardTitle>
          <CardDescription>
            {memberships.length} membership{memberships.length !== 1 ? "s" : ""} across all leagues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>{error}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Make sure you have admin access to view this data.
              </p>
            </div>
          ) : memberships.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No memberships found.</p>
              <p className="text-sm mt-2">
                This could mean you don't have admin access or no users have joined any leagues yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Season</TableHead>
                    <TableHead>League Role</TableHead>
                    <TableHead>App Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships.map((m) => (
                    <TableRow key={m.membership_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                            <AvatarFallback name={m.display_name || m.email} className="text-xs">
                              {getInitialsWithFallback(m.display_name, m.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {m.display_name || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {m.email}
                      </TableCell>
                      <TableCell>{m.league_name}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {m.season} {m.season_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={m.league_role === "commissioner" ? "default" : "secondary"}
                        >
                          {m.league_role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {m.app_role === "admin" ? (
                          <Badge variant="destructive">{m.app_role}</Badge>
                        ) : m.app_role ? (
                          <Badge variant="outline">{m.app_role}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(m.joined_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
