import { useReducer, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import { CssVarsProvider } from "@mui/joy/styles";

import { LOCAL_STORAGE } from "./constants";
import { reducer, initialState } from "./reducers";
import { useLocalStorageAuth } from "./hooks/auth";
import { checkHttpStatus } from "./services/helpers";
import { authSelf } from "./reducers";
import { refresh, self } from "./services/auth";

import SideBar from "./components/global/SideBar";
import Projects from "./components/Projects";
import Project from "./components/Project";
import Profile from "./components/Profile";
import Signup from "./components/Auth/Signup";
import Login from "./components/Auth/Login";
import GitHub from "./components/Auth/GitHub";

import { ProtectedRouteProps } from "./partials/ProtectedRoute";
import ProtectedRoute from "./partials/ProtectedRoute";

import "./index.css";
import { lightTheme } from "./utils/theme";
import { SuperFormProvider } from "./components/SuperFormProvider";

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
              .catch((err) => {
                localStorage.removeItem(LOCAL_STORAGE);
                navigate("/login");
              });
          }
        });
    }
  }, [dispatch, isAuthenticated]);

  return (
    <CssVarsProvider theme={lightTheme}>
      <QueryClientProvider client={queryClient}>
        <SuperFormProvider>
          <div>
            <Toaster />
            <SideBar isAuthenticated={isAuthenticated} state={state} />
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
                element={
                  <ProtectedRoute
                    {...defaultProtectedRouteProps}
                    outlet={<Projects />}
                  />
                }
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

              <Route path="/signup" element={<Signup dispatch={dispatch} />} />
              <Route path="/login" element={<Login dispatch={dispatch} />} />
              <Route
                path="/github/cb"
                element={<GitHub dispatch={dispatch} />}
              />
            </Routes>
          </div>
        </SuperFormProvider>
        <ReactQueryDevtools initialIsOpen={true} />
      </QueryClientProvider>
    </CssVarsProvider>
  );
}
