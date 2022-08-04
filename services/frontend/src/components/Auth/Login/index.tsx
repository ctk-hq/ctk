import { useState } from "react";
import { useFormik } from "formik";
import { Link, useNavigate } from "react-router-dom";
import Spinner from "../../../components/global/Spinner";
import { toaster } from "../../../utils";
import { checkHttpStatus } from "../../../services/helpers";
import { logIn } from "../../../services/auth";
import { LOCAL_STORAGE } from "../../../constants";
import { authLoginSuccess } from "../../../reducers";

interface IProfileProps {
  dispatch: any;
}

const Login = (props: IProfileProps) => {
  const { dispatch } = props;
  const [loggingIn, setLoggingIn] = useState(false);
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      username: "",
      password: ""
    },
    onSubmit: (values) => {
      const username = values.username;
      const password = values.password;
      setLoggingIn(true);

      if (username && password) {
        logIn(username, password)
          .then(checkHttpStatus)
          .then((data) => {
            localStorage.setItem(
              LOCAL_STORAGE,
              JSON.stringify({
                access_token: data.access_token,
                refresh_token: data.refresh_token
              })
            );
            dispatch(authLoginSuccess(data));
            navigate("/");
          })
          .catch((err) => {
            if (err) {
              err.text().then((e: string) => {
                toaster(e, "error");
              });
            }
          })
          .finally(() => {
            setLoggingIn(false);
          });
      }
    }
  });

  return (
    <>
      <div className="flex flex-col">
        <main className="py-6 md:w-1/3 lg:w-1/4 mx-auto">
          <h2 className="mb-4 px-4 sm:px-6 md:flex-row md:px-8 text-xl font-extrabold dark:text-white text-gray-900">
            Sign in
          </h2>
          <form autoComplete="off">
            <div className="px-4 sm:px-6 md:flex-row md:px-8">
              <input
                className={`
                  bg-gray-100
                  dark:bg-gray-900
                  appearance-none
                  w-full
                  block
                  text-gray-700
                  dark:text-white
                  border
                  border-gray-100
                  dark:border-gray-900
                  rounded
                  py-2
                  px-3
                  leading-tight
                  focus:outline-none
                  focus:border-indigo-400
                  focus:ring-0
                  mb-2
                `}
                type="text"
                placeholder="username"
                autoComplete="off"
                id="username"
                name="username"
                onChange={formik.handleChange}
                value={formik.values.username}
              />
            </div>

            <div className="px-4 sm:px-6 md:flex-row md:px-8">
              <input
                className={`
                  bg-gray-100
                  dark:bg-gray-900
                  appearance-none
                  w-full
                  block
                  text-gray-700
                  dark:text-white
                  border
                  border-gray-100
                  dark:border-gray-900
                  rounded
                  py-2
                  px-3
                  leading-tight
                  focus:outline-none
                  focus:border-indigo-400
                  focus:ring-0
                  mb-2
                `}
                type="password"
                placeholder="password"
                autoComplete="new-password"
                id="password"
                name="password"
                onChange={formik.handleChange}
                value={formik.values.password}
              />
            </div>

            <div className="flex justify-end px-4 sm:px-6 md:flex-row md:px-8 mb-2">
              <button
                onClick={() => formik.handleSubmit()}
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-2.5 py-1.5 bg-green-600 text-sm font-medium text-white hover:bg-green-700 sm:w-auto text-sm"
              >
                <div className="flex justify-center items-center space-x-2">
                  {loggingIn && <Spinner className="w-5 h-5 text-green-300" />}
                  <span>Login</span>
                </div>
              </button>
            </div>
          </form>

          <div className="text-center px-4">
            <Link
              className="font-medium px-3 dark:text-blue-400 dark:hover:text-blue-500 text-blue-600 hover:text-blue-700"
              to="/signup"
            >
              <span className="text-sm">Create account</span>
            </Link>
          </div>
        </main>
      </div>
    </>
  );
};

export default Login;
