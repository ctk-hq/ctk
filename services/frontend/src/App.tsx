import { lazy, Suspense, useEffect, useReducer } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { LOCAL_STORAGE } from "./constants";
import { reducer, initialState } from "./reducers";
import { useLocalStorageAuth } from "./hooks/auth";
import { checkHttpStatus } from "./services/helpers";
import { authSelf } from "./reducers";
import { refresh, self } from "./services/auth";

import SideBar from "./components/global/SideBar";
import Intro from "./components/Intro";

import { ProtectedRouteProps } from "./partials/ProtectedRoute";
import ProtectedRoute from "./partials/ProtectedRoute";

import "./index.css";
import { lightTheme } from "./utils/theme";
import { SuperFormProvider } from "./components/SuperFormProvider";
import { ThemeProvider } from "@mui/material/styles";

const Projects = lazy(() => import("./components/Projects"));
const Project = lazy(() => import("./components/Project"));
const Profile = lazy(() => import("./components/Profile"));
const Signup = lazy(() => import("./components/Auth/Signup"));
const Login = lazy(() => import("./components/Auth/Login"));
const GitHub = lazy(() => import("./components/Auth/GitHub"));

const queryClient = new QueryClient();

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const auth = useLocalStorageAuth();
  const navigate = useNavigate();
  const isAuthenticated = !!(auth && Object.keys(auth).length);

  const defaultProtectedRouteProps: Omit<ProtectedRouteProps, "outlet"> = {
    isAuthenticated: isAuthenticated,
    authenticationPath: "/login"
  };

  const setViewHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  };

  useEffect(() => {
    if (isAuthenticated) {
      self()
        .then(checkHttpStatus)
        .then((data) => {
          dispatch(authSelf(data));
        })
        .catch((err) => {
          // since auth is set in localstorage,
          // try to refresh the existing token,
          // on error clear localstorage
          if (err.status === 401) {
            err.json().then((errObj: any) => {
              if (errObj.code === "user_not_found") {
                localStorage.removeItem(LOCAL_STORAGE);
                navigate("/login");
              }
            });

            refresh()
              .then(checkHttpStatus)
              .then((data) => {
                const localData = localStorage.getItem(LOCAL_STORAGE);

                if (localData) {
                  const localDataParsed = JSON.parse(localData);
                  if (localDataParsed && Object.keys(localDataParsed).length) {
                    localDataParsed.access_token = data.access;
                    localStorage.setItem(
                      LOCAL_STORAGE,
                      JSON.stringify(localDataParsed)
                    );
                  }
                }
              })
              .catch(() => {
                localStorage.removeItem(LOCAL_STORAGE);
                navigate("/login");
              });
          }
        });
    }
  }, [dispatch, isAuthenticated, navigate]);

  useEffect(() => {
    setViewHeight();
    window.addEventListener("resize", setViewHeight);

    return () => {
      window.removeEventListener("resize", setViewHeight);
    };
  }, []);

  return (
    <ThemeProvider theme={lightTheme}>
      <QueryClientProvider client={queryClient}>
        <SuperFormProvider>
          <div>
            <Toaster />
            <SideBar isAuthenticated={isAuthenticated} state={state} />
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
                  Loading workspace…
                </div>
              }
            >
              <Routes>
                <Route
                  path="/projects/:uuid"
                  element={<Project isAuthenticated={isAuthenticated} />}
                />

                <Route
                  path="/projects/new"
                  element={<Project isAuthenticated={isAuthenticated} />}
                />

                <Route
                  path="/"
                  element={isAuthenticated ? <Projects /> : <Intro />}
                />

                <Route
                  path="/projects/"
                  element={
                    <ProtectedRoute
                      {...defaultProtectedRouteProps}
                      outlet={<Projects />}
                    />
                  }
                />

                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute
                      {...defaultProtectedRouteProps}
                      outlet={<Profile dispatch={dispatch} state={state} />}
                    />
                  }
                />

                <Route
                  path="/signup"
                  element={<Signup dispatch={dispatch} />}
                />
                <Route path="/login" element={<Login dispatch={dispatch} />} />
                <Route
                  path="/github/cb"
                  element={<GitHub dispatch={dispatch} />}
                />
              </Routes>
            </Suspense>
          </div>
        </SuperFormProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
