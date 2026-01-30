import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/src/lib/auth";

export const metadata = {
  title: "Login",
  description: "Login to your account",
};

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  // Si hay sesión, redirigir al dashboard
  if (session) {
    redirect("/");
  }

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen flex items-center justify-center transition-colors duration-300 relative selection:bg-sky-500 selection:text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(110%_70%_at_50%_-10%,rgba(56,189,248,0.28),rgba(255,255,255,0))] dark:bg-[radial-gradient(120%_85%_at_50%_-20%,rgba(56,189,248,0.22),rgba(17,17,19,0))]"></div>
      {children}
    </div>
  );
}
