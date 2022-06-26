import { useState } from "react";
import { useFormik } from "formik";
import { Link, useNavigate } from "react-router-dom";
import DarkModeSwitch from "../../../components/DarkModeSwitch";
import Spinner from "../../../components/Spinner";
import { toaster } from "../../../utils";
import { checkHttpStatus } from "../../../services/helpers";
import { signup } from "../../../services/auth";
import { LOCAL_STORAGE } from "../../../constants";
import { authLoginSuccess } from "../../../reducers";

interface IProfileProps {
  dispatch: any;
}

const Signup = (props: IProfileProps) => {
  const { dispatch } = props;
  const [signingUp, setSigningUp] = useState(false);
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: ""
    },
    onSubmit: values => {
      const username = values.username;
      const email = values.email;
      const password1 = values.password;
      const password2 = values.confirmPassword;

      setSigningUp(true);
      if (username && email && password1 && password2) {
        signup(username, email, password1, password2)
          .then(checkHttpStatus)
          .then(data => {
            localStorage.setItem(LOCAL_STORAGE, JSON.stringify({
              "access_token": data.access_token,
              "refresh_token": data.refresh_token
            }))
            dispatch(authLoginSuccess(data))
            navigate("/");
          })
          .catch(err => {
            if (err) {
              err.text().then((e: string) => {
                toaster(e, "error");
              })
            }
          }).finally(() => {
            setSigningUp(false);
          })
      }
    },
  });

  return (
    <>

      <div className="flex flex-col">
        <div className="dark:bg-gray-800 sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <div className="flex-1 px-4 sm:px-6 md:px-8 flex justify-end items-center">
            <div className="ml-4 flex md:ml-6">
              <DarkModeSwitch />
            </div>
          </div>
        </div>

        <main className="py-6 md:w-2/3 lg:w-1/4 mx-auto">
          <h2 className="mb-4 px-4 sm:px-6 md:flex-row md:px-8 text-xl font-extrabold dark:text-white text-gray-900">
            Create account
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
                type="text"
                placeholder="email"
                autoComplete="off"
                id="email"
                name="email"
                onChange={formik.handleChange}
                value={formik.values.email}
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
                  mb-4
                `}
                type="password"
                placeholder="confirm password"
                autoComplete="new-password"
                id="confirmPassword"
                name="confirmPassword"
                onChange={formik.handleChange}
                value={formik.values.confirmPassword}
              />
            </div>

            <div className="flex justify-end px-4 sm:px-6 md:flex-row md:px-8 mb-4">
              <button
                onClick={() => formik.handleSubmit()}
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 py-1 bg-green-600 text-sm font-medium text-white hover:bg-green-700 sm:w-auto text-sm"
              >
                <div className="flex justify-center items-center space-x-2">
                  {signingUp &&
                    <Spinner className="w-5 h-5 text-green-300" />
                  }
                  <span>Signup</span>
                </div>
              </button>
            </div>
          </form>

          <div className="text-center px-4">
            <Link
              className="font-medium px-3 dark:text-blue-400 dark:hover:text-blue-500 text-blue-600 hover:text-blue-700"
              to="/login"
            >
              <span className="text-sm">Already have an account?</span>
            </Link>
          </div>
        </main>
      </div>
    </>
  )
}

export default Signup;
