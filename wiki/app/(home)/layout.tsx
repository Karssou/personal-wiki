import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import Socials from "@/components/socials";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8 animate-slide-down">
        <Navbar />
      </header>
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
    </>
  );
}
