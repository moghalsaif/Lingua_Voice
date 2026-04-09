import { useUser, useClerk } from "@clerk/react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic2, LogOut, User as UserIcon, Home } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Mic2 className="h-5 w-5" />
          </div>
          <span className="font-bold tracking-tight">Lingua Voice</span>
          <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 border-primary/40 text-primary/70 font-medium uppercase tracking-wider">
            Demo
          </Badge>
        </Link>

        <div className="flex items-center gap-4">
          {isLoaded && isSignedIn && user ? (
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <Link href="/dashboard">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </Link>
              </Button>
              <div className="hidden md:flex flex-col items-end text-sm">
                <span className="font-medium leading-none">{user.fullName || user.emailAddresses[0]?.emailAddress}</span>
                <span className="text-xs text-muted-foreground">Student</span>
              </div>
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={user.imageUrl} />
                <AvatarFallback>
                  <UserIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut()}
                title="Sign out"
                data-testid="button-signout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : isLoaded && !isSignedIn ? (
            <div className="flex items-center gap-2">
              <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
                Sign In
              </Link>
              <Button asChild size="sm">
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
