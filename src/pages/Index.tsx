import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, BarChart3, Users } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo/Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-6 shadow-lg">
            <Trophy className="w-10 h-10 text-primary-foreground" />
          </div>

          {/* Title */}
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            EMMA
          </h1>
          <p className="text-2xl font-semibold text-foreground mb-3">
            Extra Month of More Action
          </p>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            The ultimate fantasy football playoff showdown. Four competitors, four weeks, one champion.
          </p>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card border-2 border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Users className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">4 Competitors</h3>
              <p className="text-sm text-muted-foreground">
                Elite fantasy managers battle for supremacy
              </p>
            </div>

            <div className="bg-card border-2 border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
              <BarChart3 className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Weekly Picks</h3>
              <p className="text-sm text-muted-foreground">
                QB, RB, and WR/TE selections each playoff week
              </p>
            </div>

            <div className="bg-card border-2 border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Trophy className="w-8 h-8 text-accent mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">No Repeats</h3>
              <p className="text-sm text-muted-foreground">
                Once a player is used, they're out for good
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <Link to="/results">
            <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
              View 2024-2025 Results
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
