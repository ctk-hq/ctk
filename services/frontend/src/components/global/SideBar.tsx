import { useLocation } from "react-router-dom";
import { BookOpenIcon } from "@heroicons/react/outline";
import { Link } from "react-router-dom";
import UserMenu from "./UserMenu";
import Logo from "./logo";

interface ISideBarProps {
  state: any;
  isAuthenticated: boolean;
}

export default function SideBar(props: ISideBarProps) {
  const { pathname } = useLocation();
  const { state, isAuthenticated } = props;
  const projRegex = /\/projects\/?$/;
  const navigation = [{ 
    name: "Projects",
    href: "/projects",
    icon: BookOpenIcon,
    current: (pathname.match(projRegex) ? true : false)
  }];
  const classNames = (...classes: any[]) => {
    return classes.filter(Boolean).join(" ")
  };
  const userName = state.user ? state.user.username : "";

  return (
    <>
      <div className="md:flex md:w-16 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow pt-5 bg-blue-700 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 mx-auto">
            <Link to={isAuthenticated ? "/" : "projects/new"}>
              <Logo className="" />
            </Link>
          </div>

          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={classNames(
                    item.current ? "bg-blue-800 text-white" : "text-blue-100 hover:bg-blue-600",
                    "group flex items-center justify-center px-2 py-2 text-sm font-medium rounded-md"
                  )}
                >
                  <item.icon className="mr-3 md:mr-0 flex-shrink-0 h-5 w-5" aria-hidden="true" />
                  <span className="md:hidden">
                    {item.name}
                  </span>
                </a>
              ))}
            </nav>
          </div>
          
          <UserMenu username={userName} current={pathname.includes("profile")} />
        </div>
      </div>
    </>
  );
}
