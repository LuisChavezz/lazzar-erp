import ModuleNav from "@/src/components/ModuleNav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full space-y-6">
      <ModuleNav moduleKey="settings" />
      {children}
    </div>
  );
}
