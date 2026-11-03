import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/src/hooks/useDebounce";
import { searchSampleSkus } from "../services/actions";

/**
 * Autocompletado de SKUs de muestra (`GET /inventarios/skus-muestra/`): busca
 * por SKU o folio, máx. 10 resultados. Debounce de 250 ms para no disparar una
 * petición por tecla; cada búsqueda queda en caché, así que volver a un texto
 * ya buscado es inmediato.
 */
export function useSampleSkuSearch(search: string) {
  const term = useDebounce(search.trim(), 250);
  const query = useQuery({
    queryKey: ["skus-muestra", term],
    queryFn: () => searchSampleSkus(term),
    enabled: term.length >= 1,
    staleTime: 60_000,
  });
  return {
    results: query.data ?? [],
    // Mientras corre el debounce o la petición: el texto aún no tiene respuesta.
    isSearching: search.trim() !== term || query.isFetching,
    isError: query.isError,
    term,
  };
}
