import { SearchIcon } from "./Icons";

export const SearchBar = () => {
  return (
    <div role="search" aria-label="Barra de búsqueda" className="group flex items-center bg-transparent hover:bg-white dark:hover:bg-zinc-900 hover:shadow-xl hover:border border-transparent hover:border-slate-100 dark:hover:border-slate-800 rounded-full transition-all duration-300 w-10 hover:w-64 h-10 overflow-hidden relative">
      <button type="button" aria-label="Buscar" title="Buscar" className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-slate-400 group-hover:text-sky-600 transition-colors z-10 cursor-pointer">
        <SearchIcon className="w-5 h-5" aria-hidden="true" />
      </button>
      <input
        type="text"
        aria-label="Buscar en el sistema"
        className="w-full h-full bg-transparent border-none focus:ring-0 focus:outline-none text-sm pl-4 pr-10 text-slate-600 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 placeholder-slate-400"
        placeholder="Buscar en el sistema..."
      />
    </div>
  );
};
