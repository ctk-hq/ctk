import { useLocation } from "react-router-dom";
import { BookOpenIcon, PlusIcon } from "@heroicons/react/outline";
import { Link } from "react-router-dom";
import ModalNewProject from "../modals/new-project";
import UserMenu from "./UserMenu";
import Logo from "./logo";
import { classNames } from "../../utils/styles";
import { useState } from "react";

interface ISideBarProps {
  state: any;
  isAuthenticated: boolean;
}

export default function SideBar(props: ISideBarProps) {
  const { pathname } = useLocation();
  const { state, isAuthenticated } = props;
  const projRegex = /\/projects\/?$/;
  const navigation = [
    {
      name: "Projects",
      href: "/projects",
      icon: BookOpenIcon,
      current: pathname.match(projRegex) || pathname == "/" ? true : false,
      visible: isAuthenticated
    }
  ];
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const userName = state.user ? state.user.username : "";

  return (
    <>
      {showNewProjectModal ? (
        <ModalNewProject onHide={() => setShowNewProjectModal(false)} />
      ) : null}

      <div className="md:flex md:w-16 md:flex-col md:fixed md:inset-y-0">
        <div className="flex justify-between flex-col sm:flex-row md:flex-col md:flex-grow md:pt-5 bg-blue-700 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 mx-auto p-2 ">
            <Link to={isAuthenticated ? "/" : "login"}>
              <Logo />
            </Link>
          </div>

          <div className="md:mt-5 flex-1 flex flex-col items-center sm:flex-row md:flex-col justify-end">
            <nav className="flex md:flex-1 flex-col sm:flex-row md:flex-col items-center md:space-y-1">
              {navigation.map((item) => {
                if (item.visible) {
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className={classNames(
                        item.current
                          ? "bg-blue-800 text-white"
                          : "text-blue-100 hover:bg-blue-600",
                        "group flex items-center justify-center p-2 text-sm font-medium rounded-md"
                      )}
                    >
                      <item.icon
                        className="mr-3 sm:mr-0 flex-shrink-0 h-5 w-5"
                        aria-hidden="true"
                      />
                      <span className="sm:hidden">{item.name}</span>
                    </a>
                  );
                }
              })}

              <button
                onClick={() => setShowNewProjectModal(true)}
                className={classNames(
                  "text-blue-100 hover:bg-blue-600",
                  "group flex items-center justify-center p-2 text-sm font-medium rounded-md"
                )}
              >
                <PlusIcon
                  className="mr-3 sm:mr-0 flex-shrink-0 h-5 w-5"
                  aria-hidden="true"
                />
                <span className="sm:hidden">New project</span>
              </button>
            </nav>

            <UserMenu
              username={userName}
              current={pathname.includes("profile")}
            />
          </div>
        </div>
      </div>
    </>
  );
}
