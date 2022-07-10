import { LOCAL_STORAGE } from "../../constants";
import { authSelf } from "../../reducers";

interface IProfileProps {
  dispatch: any;
  state: any;
}

const Profile = (props: IProfileProps) => {
  const { dispatch, state } = props;

  const logOut = () => {
    localStorage.removeItem(LOCAL_STORAGE);
    dispatch(authSelf(null));
  };

  return (
    <>
      <div className="md:pl-16 flex flex-col flex-1">
        <main className="py-6">
          <div className="flex justify-between px-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-semibold dark:text-white text-gray-900">
              Profile
            </h1>
            <button
              className="btn-util text-white bg-blue-600 hover:bg-blue-700 sm:w-auto"
              onClick={logOut}
            >
              <span>Logout</span>
            </button>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 px-4 py-4 sm:px-6 md:flex-row md:px-8">
            {state.user && (
              <>
                {state.user.username && (
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium dark:text-gray-200 text-gray-500">
                      username
                    </dt>
                    <dd className="mt-1 text-sm dark:text-white text-gray-900">
                      {state.user.username}
                    </dd>
                  </div>
                )}

                {state.user.email && (
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium dark:text-gray-200 text-gray-500">
                      email
                    </dt>
                    <dd className="mt-1 text-sm dark:text-white text-gray-900">
                      {state.user.email}
                    </dd>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Profile;
