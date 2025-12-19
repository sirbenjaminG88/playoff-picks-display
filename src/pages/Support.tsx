import { Mail, HelpCircle, Shield, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Support = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">E</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Emma Playoff Picks</h1>
              <p className="text-muted-foreground text-sm">Support Center</p>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Emma Playoff Picks is a fantasy football app for the NFL playoffs. Create or join leagues with friends, 
            pick your favorite players each week, and compete to see who can earn the most fantasy points throughout 
            the playoff season.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        {/* Contact Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Contact Support</h2>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-muted-foreground mb-3">
              Have a question or need help? We're here for you.
            </p>
            <a 
              href="mailto:support@playoffpicks.app" 
              className="text-primary hover:underline font-medium"
            >
              support@playoffpicks.app
            </a>
            <p className="text-sm text-muted-foreground mt-2">
              We typically respond within 24 hours.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="bg-card border border-border rounded-lg">
            <AccordionItem value="create-league" className="border-border">
              <AccordionTrigger className="px-6 hover:no-underline text-foreground">
                How do I create a league?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-muted-foreground">
                To create a league, tap the "Leagues" tab and select "Create League." Enter a name for your league 
                and you'll receive a unique join code to share with friends. As the league commissioner, you can 
                manage members and settings.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="make-picks" className="border-border">
              <AccordionTrigger className="px-6 hover:no-underline text-foreground">
                How do I make my picks?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-muted-foreground">
                Navigate to the "Picks" tab to see available players for the current playoff week. Select one player 
                for each position slot (QB, RB, WR, etc.) from teams playing that week. Your picks are locked once 
                the first game of the week kicks off, so make sure to submit before then!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="invite-friends" className="border-border">
              <AccordionTrigger className="px-6 hover:no-underline text-foreground">
                How do I invite friends to my league?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-muted-foreground">
                Each league has a unique join code. Share this code with your friends and they can join by tapping 
                "Join League" and entering the code. You can find your league's join code in the league details screen.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="scoring" className="border-border">
              <AccordionTrigger className="px-6 hover:no-underline text-foreground">
                How does scoring work?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-muted-foreground">
                <p className="mb-2">Players earn fantasy points based on their real NFL playoff performance:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Passing: 1 point per 25 yards, 4 points per TD</li>
                  <li>Rushing: 1 point per 10 yards, 6 points per TD</li>
                  <li>Receiving: 1 point per 10 yards, 6 points per TD</li>
                  <li>Interceptions thrown: -2 points</li>
                  <li>Fumbles lost: -2 points</li>
                </ul>
                <p className="mt-2">Your total score is the sum of all your picked players' points across all playoff weeks.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reset-password" className="border-border">
              <AccordionTrigger className="px-6 hover:no-underline text-foreground">
                How do I reset my password?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-muted-foreground">
                On the sign-in screen, tap "Forgot password?" and enter your email address. You'll receive an email 
                with a link to create a new password. If you don't see the email, check your spam folder.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="picks-locked" className="border-border">
              <AccordionTrigger className="px-6 hover:no-underline text-foreground">
                Why can't I change my picks?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-muted-foreground">
                Picks are locked once the first playoff game of the week begins. This ensures fair competition 
                among all league members. Make sure to submit your picks before the first kickoff each week!
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Privacy & Legal */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Privacy & Legal</h2>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <Link 
              to="/privacy" 
              className="text-primary hover:underline font-medium"
            >
              Privacy Policy →
            </Link>
            <p className="text-sm text-muted-foreground mt-2">
              Learn how we collect, use, and protect your information.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Emma Playoff Picks. All rights reserved.
          </p>
          <p className="text-xs text-tertiary-text mt-2">
            NFL and all related marks are trademarks of the National Football League.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Support;
