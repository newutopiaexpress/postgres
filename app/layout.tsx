import "./globals.css";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "next-themes";
import { ClerkProvider,SignedIn, SignedOut, SignInButton, UserButton  } from '@clerk/nextjs'


export const metadata = {
  metadataBase: new URL("https://natural-language-postgres.vercel.app"),
  title: "Lucy",
  description:
    "Lucy is a natural language interface for querying PostgreSQL databases.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${GeistMono.className} ${GeistSans.className}`}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="min-h-screen  relative">
                <div className="absolute right-4 top-4">
                      <SignedIn>
                        {/* Mount the UserButton component */}
                        <UserButton />
                      </SignedIn>
                      <SignedOut>
                        {/* Signed out users get sign in button */}
                        <SignInButton />
                      </SignedOut>
                </div>
              <main className="flex-1">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
