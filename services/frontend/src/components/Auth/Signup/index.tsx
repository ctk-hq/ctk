import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useFormik } from "formik";
import { Link, useNavigate } from "react-router-dom";
import Spinner from "../../../components/global/Spinner";
import { toaster } from "../../../utils";
import { checkHttpStatus } from "../../../services/helpers";
import { signup } from "../../../services/auth";
import {
  LOCAL_STORAGE,
  REACT_APP_GITHUB_CLIENT_ID,
  REACT_APP_GITHUB_SCOPE
} from "../../../constants";
import { authLoginSuccess } from "../../../reducers";
import LoginBtn from "../GitHub/LoginBtn";

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
    onSubmit: (values) => {
      const username = values.username;
      const email = values.email;
      const password1 = values.password;
      const password2 = values.confirmPassword;

      if (username && email && password1 && password2) {
        setSigningUp(true);

        signup(username, email, password1, password2)
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
            setSigningUp(false);
          });
      }
    }
  });

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col justify-center overflow-y-auto px-4 py-8 md:h-dvh md:pl-16">
      <main className="mx-auto w-full max-w-md space-y-6 px-4 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create account
        </h1>
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.email}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.password}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.confirmPassword}
            />
          </div>
          <Button className="w-full" type="submit" disabled={signingUp}>
            {signingUp && <Spinner className="size-4" />}Signup
          </Button>
        </form>
        <p className="text-center text-sm">
          <Link
            className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            to="/login"
          >
            Already have an account?
          </Link>
        </p>
        <div className="hidden">
          {REACT_APP_GITHUB_SCOPE && REACT_APP_GITHUB_CLIENT_ID && <LoginBtn />}
        </div>
      </main>
    </div>
  );
};
export default Signup;
