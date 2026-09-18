import { GoogleAuthRequired } from "@/src/features/google/components/GoogleAuthRequired";
import { GoogleCalendar } from "@/src/features/google/components/GoogleCalendar";
import { GoogleCalendarIcon } from "@/src/components/Icons";

export default function SalesCalendarPage() {
  return (
    <div className="w-full">
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

