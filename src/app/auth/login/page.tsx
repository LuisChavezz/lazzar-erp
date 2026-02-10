import LoginForm from "@/src/features/auth/components/LoginForm";
import Image from "next/image";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description: "Ingresa a tu cuenta para continuar",
};



export default async function LoginPage() {

  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative z-10 flex h-175 w-full max-w-300 bg-white/80 dark:bg-black/60 backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">
      <div className="relative hidden md:block w-full h-full">
        <Image
          src="https://images.unsplash.com/photo-1616156027751-fc9a850fdc9b"
          alt="leftSideImage"
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <div className="w-full flex flex-col items-center justify-center p-8">
        <LoginForm />
      </div>
    </div>
  );
}
