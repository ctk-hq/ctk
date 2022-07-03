import { useReducer, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";

import { LOCAL_STORAGE } from "./constants";
import { reducer, initialState } from "./reducers";
import { useLocalStorageAuth } from "./hooks/auth";
import { checkHttpStatus } from "./services/helpers";
import { authSelf } from "./reducers";
import { refresh, self } from "./services/auth";

import Project from "./components/Project";
import Profile from "./components/Profile";
import Signup from "./components/Auth/Signup";
import Login from "./components/Auth/Login";

import { ProtectedRouteProps } from "./partials/ProtectedRoute";
import ProtectedRoute from "./partials/ProtectedRoute";

import "./index.css";

const queryClient = new QueryClient();

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const auth = useLocalStorageAuth();
  const isAuthenticated = !!(auth && Object.keys(auth).length);

  const defaultProtectedRouteProps: Omit<ProtectedRouteProps, "outlet"> = {
    isAuthenticated: isAuthenticated,
    authenticationPath: "/login"
  }

  useEffect(() => {
    if (isAuthenticated) {
      self()
        .then(checkHttpStatus)
        .then(data => {
          dispatch(authSelf(data));
        })
        .catch(err => {
          // since auth is set in localstorage,
          // try to refresh the existing token,
          // on error clear localstorage
          if (err.status === 401) {
            err.text().then((text: string) => {
              const textObj = JSON.parse(text);
              if (textObj.code === "user_not_found") {
                localStorage.removeItem(LOCAL_STORAGE);
              }
            });

            refresh()
              .then(checkHttpStatus)
              .then(data => {
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
              .catch(err => {
                localStorage.removeItem(LOCAL_STORAGE);
              })
          }
        })
    }
  }, [dispatch, isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <Toaster />
        <Routes>
          <Route
            path="/projects/:uuid"
            element={<Project />}
          />

          <Route
            path="/projects/new"
            element={<Project />}
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
        </Routes>
      </div>

      <ReactQueryDevtools initialIsOpen={true} />
    </QueryClientProvider>
  )
}
