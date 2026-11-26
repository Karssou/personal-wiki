import type { Metadata } from "next";
import { Geist_Mono, Stack_Sans_Headline } from "next/font/google";
import "./globals.css";


const StackSans = Stack_Sans_Headline({
  variable: "--font-stack-sans-headline",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wiki Alexandre LARUE",
  description:
    "Ce site web est le wiki de Alexandre Larue Développeur Full-Stack et étudiant à l'EPSI",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${StackSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        {children} 
      </body>
    </html>
  );
}
