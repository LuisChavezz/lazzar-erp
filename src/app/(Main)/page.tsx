import { HomedGrid } from "@/src/components/HomeGrid";


export default function Home() {
  return (
    <main className="flex-1 w-full overflow-y-auto px-6 pb-6 md:px-8 md:pb-8 pt-20 md:pt-0">
      <section id="homeDashboard" className="animate-in fade-in duration-500">
        <HomedGrid />
      </section>
    </main>
  );
}
