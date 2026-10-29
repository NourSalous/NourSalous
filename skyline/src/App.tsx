import { useMemo } from "react";
import ContributionSkyline from "@/components/ui/contribution-skyline";
import { buildDiverseContributions } from "@/lib/contributions";
import { ArrowUpRight, CalendarDays, Flame, Github } from "lucide-react";

const PALETTE = {
  light: ["#f5e1c8", "#edbd84", "#df8a5c", "#c1534f"],
  dark: ["#3f2a1e", "#8a4a2c", "#c96a3e", "#f0a96a"],
};

export default function App() {
  const data = useMemo(() => buildDiverseContributions(new Date()), []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#faf5ee] text-[#3b2c22]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#e8a86a]/40 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#d2695f]/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#f0c987]/40 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4 py-14 sm:px-8">
        <header className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d98e3f]/30 bg-white/40 px-4 py-1.5 text-sm text-[#8a6a52] backdrop-blur">
            <Flame className="h-4 w-4 text-[#d2695f]" />
            A year of building, in glass
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Contribution{" "}
            <span className="bg-gradient-to-r from-[#d98e3f] to-[#d2695f] bg-clip-text text-transparent">
              Skyline
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-[#9a8577]">
            Nour Salous — a year of commits, folded up into an isometric glass skyline.
          </p>
        </header>

        <div className="w-full">
          <ContributionSkyline
            data={data}
            palette={PALETTE}
            unit="commit"
            heightScale={1}
            defaultView="3d"
          />
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-[#9a8577]">
          <a
            href="https://github.com/NourSalous"
            className="inline-flex items-center gap-2 rounded-full border border-[#d98e3f]/30 bg-white/40 px-4 py-2 backdrop-blur transition hover:bg-white/60"
          >
            <Github className="h-4 w-4" /> NourSalous
          </a>
          <a
            href="https://github.com/NourSalous/NourSalous"
            className="inline-flex items-center gap-2 rounded-full border border-[#d98e3f]/30 bg-white/40 px-4 py-2 backdrop-blur transition hover:bg-white/60"
          >
            <CalendarDays className="h-4 w-4" /> Back to profile <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </footer>
      </main>
    </div>
  );
}
