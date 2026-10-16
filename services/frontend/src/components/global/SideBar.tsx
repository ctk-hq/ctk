import { Link, useLocation } from "react-router-dom";
import { BookOpen, Plus } from "lucide-react";
import UserMenu from "./UserMenu";
import Logo from "./logo";
import DarkModeSwitch from "./DarkModeSwitch";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
export default function SideBar({
  state,
  isAuthenticated
}: {
  state: any;
  isAuthenticated: boolean;
}) {
  const { pathname } = useLocation();
  const navigation = [
    {
      name: "Projects",
      href: "/projects",
      icon: BookOpen,
      visible: isAuthenticated,
      current: /^\/projects\/?$/.test(pathname) || pathname === "/"
    },
    {
      name: "New project",
      href: "/projects/new",
      icon: Plus,
      visible: true,
      current: pathname === "/projects/new"
    }
  ];
  return (
    <aside className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-3 md:fixed md:inset-y-0 md:z-40 md:h-dvh md:w-16 md:flex-col md:border-b-0 md:border-r md:px-2 md:py-4">
      <Link
        to="/"
        aria-label="Container Toolkit home"
        className="rounded-md p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Logo />
      </Link>
      <nav
        aria-label="Main navigation"
        className="flex items-center gap-1 md:mt-6 md:flex-1 md:flex-col"
      >
        {navigation
          .filter((item) => item.visible)
          .map((item) => (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant={item.current ? "secondary" : "ghost"}
                  size="icon"
                >
                  <Link
                    to={item.href}
                    aria-label={item.name}
                    aria-current={item.current ? "page" : undefined}
                  >
                    <item.icon />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.name}</TooltipContent>
            </Tooltip>
          ))}
      </nav>
      <div className="flex items-center gap-1 md:flex-col">
        <DarkModeSwitch />
        <UserMenu
          username={state.user?.username || ""}
          current={pathname.includes("profile")}
        />
      </div>
    </aside>
  );
}
