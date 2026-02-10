import RegisterForm from "@/src/features/auth/components/RegisterForm";
import Image from "next/image";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Registro",
  description: "Crea una nueva cuenta para empezar",
};

// redirect to dashboard always
redirect("/dashboard");


export default function RegisterPage() {
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
        <RegisterForm />
      </div>
    </div>
  );
}
