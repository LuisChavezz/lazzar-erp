import { HomedGrid } from "@/src/components/HomeGrid";


export default function Home() {
  return (
    <div className="w-full">
      <section id="homeDashboard" className="animate-in fade-in duration-500">
        <HomedGrid />
      </section>
    </div>
  );
}
