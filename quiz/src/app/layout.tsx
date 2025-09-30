import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import NavigationLayout from "@/components/navigation/NavigationLayout";
import "./globals.css";

// Force all pages to be dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Education Portal",
  description: "A comprehensive learning platform for quizzes and courses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <NavigationLayout>
            {children}
          </NavigationLayout>
        </Providers>
      </body>
    </html>
  );
}
