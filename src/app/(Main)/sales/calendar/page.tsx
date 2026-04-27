import { GoogleAuthRequired } from "@/src/features/google/components/GoogleAuthRequired";
import { GoogleCalendar } from "@/src/features/google/components/GoogleCalendar";
import { GoogleCalendarIcon } from "@/src/components/Icons";

export default function SalesCalendarPage() {
  return (
    <div className="w-full space-y-3 sm:space-y-4">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
          Visualiza tus eventos y citas de Google Calendar directamente desde el ERP.
        </p>
      </div>
      <GoogleAuthRequired
        featureName="Google Calendar"
        description="Conecta tu cuenta de Google para visualizar tus eventos y citas del calendario directamente desde el ERP."
        icon={<GoogleCalendarIcon className="w-4 h-4" />}
      >
        <GoogleCalendar />
      </GoogleAuthRequired>
    </div>
  );
}

