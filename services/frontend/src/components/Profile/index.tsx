import { useState } from "react";
import { Link } from "react-router-dom";
import { MenuAlt2Icon, ReplyIcon } from "@heroicons/react/outline";
import SideBar from "../../components/SideBar";
import DarkModeSwitch from "../../components/DarkModeSwitch";
import { LOCAL_STORAGE } from "../../constants";
import { authSelf } from "../../reducers";

interface IProfileProps {
  dispatch: any;
  state: any;
}

const Profile = (props: IProfileProps) => {
  const { dispatch, state } = props;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logOut = () => {
    localStorage.removeItem(LOCAL_STORAGE);
    dispatch(authSelf(null));
  }

  return (
    <>
      <SideBar state={state} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="md:pl-56 flex flex-col flex-1">
        <div className="dark:bg-gray-800 sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            type="button"
            className="px-4 border-r dark:border-gray-900 border-gray-200 text-gray-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <MenuAlt2Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex-1 px-4 sm:px-6 md:px-8 flex justify-between items-center">
            <Link
              className="text-gray-700 dark:text-white"
              to="/"
            >
              <ReplyIcon className="w-4 h-4" />
            </Link>

            <div className="ml-4 flex md:ml-6">
              <DarkModeSwitch />
            </div>
          </div>
        </div>

        <main className="py-6">
          <div className="flex justify-between px-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-semibold dark:text-white text-gray-900">Profile</h1>
            <button
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded focus:outline-none focus:shadow-outline"
              onClick={logOut}
            >
              <span className="text-sm">Logout</span>
            </button>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 px-4 py-4 sm:px-6 md:flex-row md:px-8">
            {state.user &&
              <>
                {state.user.username &&
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium dark:text-gray-200 text-gray-500">
                      username
                    </dt>
                    <dd className="mt-1 text-sm dark:text-white text-gray-900">
                      {state.user.username}
                    </dd>
                  </div>
                }

                {state.user.email &&
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium dark:text-gray-200 text-gray-500">
                      email
                    </dt>
                    <dd className="mt-1 text-sm dark:text-white text-gray-900">
                      {state.user.email}
                    </dd>
                  </div>
                }
              </>
            }
          </div>
        </main>
      </div>
    </>
  )
}

export default Profile;
