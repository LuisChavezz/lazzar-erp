import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getQualityInspections } from "../services/actions";

export const useQualityInspections = () => {
  const { data, isInitialError, ...rest } = useGuardedQuery(
    { queryKey: ["quality-inspections", "list"], queryFn: getQualityInspections },
    { toastId: "quality-inspections-refetch-error" },
  );
  return { inspecciones: data ?? [], isInitialError, ...rest };
};
