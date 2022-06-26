import { Fragment } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";
import { DatabaseIcon, TemplateIcon, XIcon } from "@heroicons/react/outline";
import UserMenu from "./UserMenu";
import Logo from "./logo";

interface ISideBarProps {
  state: any;
  sidebarOpen: boolean;
  setSidebarOpen: any;
}

export default function SideBar(props: ISideBarProps) {
  const { pathname } = useLocation();
  const { state, sidebarOpen, setSidebarOpen } = props;
  const navigation = [
    { name: "Templates", href: "/", icon: TemplateIcon, current: ((pathname === "/" || pathname.includes("templates")) ? true : false) },
    { name: "Connectors", href: "/connectors", icon: DatabaseIcon, current: (pathname.includes("connectors") ? true : false) }
  ];
  const classNames = (...classes: any[]) => {
    return classes.filter(Boolean).join(" ")
  };
  const userName = state.user ? state.user.username : "";

  return (
    <>
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="fixed inset-0 flex z-40 md:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-700 bg-opacity-50" />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-blue-700">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute top-0 right-0 -mr-7 pt-2">
                  <button
                    type="button"
                    className="ml-1 flex items-center justify-center h-5 w-5 rounded-full"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </Transition.Child>

              <div className="flex-shrink-0 flex items-center px-4">
                <Logo className="w-5 h-5" />
              </div>

              <div className="mt-5 flex-1 h-0 overflow-y-auto">
                <nav className="px-2 space-y-1">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className={classNames(
                        item.current ? "bg-blue-800 text-white" : "text-blue-100 hover:bg-blue-600",
                        "group flex items-center px-2 py-2 text-base font-medium rounded-md"
                      )}
                    >
                      <item.icon className="mr-4 flex-shrink-0 h-6 w-6" aria-hidden="true" />
                      {item.name}
                    </a>
                  ))}
                </nav>
              </div>

              <UserMenu username={userName} current={pathname.includes("profile")} />
            </div>
          </Transition.Child>

          <div className="flex-shrink-0 w-14" aria-hidden="true">
            {/* Dummy element to force sidebar to shrink to fit close icon */}
          </div>
        </Dialog>
      </Transition.Root>

      <div className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow pt-5 bg-blue-700 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <Logo className="w-5 h-5" />
          </div>
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={classNames(
                    item.current ? "bg-blue-800 text-white" : "text-blue-100 hover:bg-blue-600",
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md"
                  )}
                >
                  <item.icon className="mr-3 flex-shrink-0 h-5 w-5" aria-hidden="true" />
                  {item.name}
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
