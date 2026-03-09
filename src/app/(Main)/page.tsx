import { HomedGrid } from "@/src/components/HomeGrid";


export default async function HomePage() {
  return (
    <div className="w-full">
      <section id="home" className="animate-in fade-in duration-500">
        <HomedGrid />
      </section>
    </div>
  );
}
