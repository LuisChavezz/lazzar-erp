export function getPageTitle(path: string | undefined | null) {
  if (!path) return "Dashboard";
  if (path === "/") return "Inicio";
  const segments = path.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) return "Dashboard";

  return lastSegment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
