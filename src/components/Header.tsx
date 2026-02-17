import { SearchBar } from "./SearchBar";
import { Notifications } from "../features/notifications/components/Notifications";
import { HeaderTitle } from "./HeaderTitle";
import { WorkspaceInfo } from "./WorkspaceInfo";

import { UserMenu } from "./UserMenu";

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

        <UserMenu />
      </div>
    </header>
  );
};
