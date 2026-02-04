import { HomedGrid } from "@/src/components/HomeGrid";
import { redirect } from "next/navigation";


export default function Home() {

  // redirect to dashboard
  redirect("/dashboard");

  return (
    <div className="w-full">
      <section id="homeDashboard" className="animate-in fade-in duration-500">
        <HomedGrid />
      </section>
    </div>
  );
}
