import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <SignIn 
        routing="path" 
        path={`${basePath}/sign-in`} 
        signUpUrl={`${basePath}/sign-up`} 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-card border border-border shadow-lg rounded-xl",
            headerTitle: "text-foreground font-bold font-sans",
            headerSubtitle: "text-muted-foreground font-sans",
            socialButtonsBlockButton: "border-border text-foreground hover:bg-muted/50 font-sans",
            socialButtonsBlockButtonText: "font-semibold",
            dividerLine: "bg-border",
            dividerText: "text-muted-foreground font-sans",
            formFieldLabel: "text-foreground font-semibold font-sans",
            formFieldInput: "bg-background border-border text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-sans",
            formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-sans",
            footerActionText: "text-muted-foreground font-sans",
            footerActionLink: "text-primary hover:text-primary/90 font-semibold font-sans",
            identityPreviewText: "text-foreground font-sans",
            identityPreviewEditButton: "text-primary hover:text-primary/90 font-sans",
          }
        }}
      />
    </div>
  );
}
