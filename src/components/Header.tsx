import { SearchBar } from "./SearchBar";
import { Notifications } from "./Notifications";
import { HeaderTitle } from "./HeaderTitle";
import { WorkspaceInfo } from "./WorkspaceInfo";

export const Header = () => {
  return (
    <header className="hidden md:flex h-20 items-center justify-between px-8 bg-transparent shrink-0 z-30">
      <div className="flex items-center gap-4 text-slate-400">
        <HeaderTitle />
      </div>
      <div className="flex items-center gap-6">
        {/* Workspace Info */}
        <WorkspaceInfo />
        
        {/* Search Bar (Hover Expand) */}
        <SearchBar />

        {/* Notifications */}
        <Notifications />

        <div className="w-8 h-8 rounded-full bg-linear-to-tr from-sky-500 to-cyan-500 ring-2 ring-white dark:ring-slate-800 cursor-pointer shadow-lg shadow-sky-500/20"></div>
      </div>
    </header>
  );
};
