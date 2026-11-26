import type { Metadata } from "next";
import { Geist_Mono, Stack_Sans_Headline } from "next/font/google";
import "./globals.css";
import Footer from "@/components/footer";
import Socials from "@/components/socials";

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
        <div className="fixed top-0 right-0 w-1/2 min-h-200 text-primary h-screen opacity-40 pointer-events-none z-0">
          <svg
            className="w-full h-full text-primary transition-colors duration-300"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <line
              stroke="currentColor"
              strokeWidth="0.5"
              x1="0"
              x2="100"
              y1="100"
              y2="0"
            ></line>
            <line
              stroke="currentColor"
              strokeWidth="0.2"
              x1="0"
              x2="100"
              y1="80"
              y2="-20"
            ></line>
            <line
              stroke="currentColor"
              strokeWidth="0.3"
              x1="20"
              x2="120"
              y1="100"
              y2="0"
            ></line>
          </svg>
        </div>
        {children}
        <section
          className="fixed bottom-6 inset-x-0 mx-auto w-full max-w-fit z-50 animate-slide-up"
          id="social"
        >
          <Socials />
        </section>
        <Footer />
      </body>
    </html>
  );
}
