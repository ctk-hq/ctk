import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useFormik } from "formik";
import { Link, useNavigate } from "react-router-dom";
import {
  REACT_APP_GITHUB_CLIENT_ID,
  REACT_APP_GITHUB_SCOPE
} from "../../../constants";
import Spinner from "../../../components/global/Spinner";
import { toaster } from "../../../utils";
import { checkHttpStatus } from "../../../services/helpers";
import { logIn } from "../../../services/auth";
import { LOCAL_STORAGE } from "../../../constants";
import { authLoginSuccess } from "../../../reducers";
import LoginBtn from "../GitHub/LoginBtn";

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

      if (username && password) {
        setLoggingIn(true);

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
              err.json().then((e: any) => {
                Object.keys(e).forEach(function (key) {
                  toaster(e[key] as string, "error");
                });
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
    <div className="flex h-[calc(100dvh-4rem)] flex-col justify-center overflow-y-auto px-4 py-8 md:h-dvh md:pl-16">
      <main className="mx-auto w-full max-w-md space-y-6 px-4 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <form className="space-y-4" noValidate onSubmit={formik.handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.username}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.password}
            />
          </div>
          <Button className="w-full" type="submit" disabled={loggingIn}>
            {loggingIn && <Spinner className="size-4" />}Login
          </Button>
        </form>
        <p className="text-center text-sm">
          <Link
            className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            to="/signup"
          >
            Create account
          </Link>
        </p>
        <div className="hidden">
          {REACT_APP_GITHUB_SCOPE && REACT_APP_GITHUB_CLIENT_ID && <LoginBtn />}
        </div>
      </main>
    </div>
  );
};
export default Login;
