import { useState } from "react";
import { useFormik } from "formik";
import * as yup from "yup";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Spinner from "@/components/global/Spinner";
import { LOCAL_STORAGE } from "@/constants";
import { authLoginSuccess } from "@/reducers";
import { logIn, signup } from "@/services/auth";
import { authErrorMessage, checkHttpStatus } from "@/services/helpers";

export default function EmailForm({
  registering = false,
  dispatch
}: {
  registering?: boolean;
  dispatch: (action: ReturnType<typeof authLoginSuccess>) => void;
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const client = useQueryClient();
  const [error, setError] = useState("");
  const next = params.get("next");
  const destination =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/projects/new";
  const form = useFormik({
    initialValues: { email: "", password: "", confirmPassword: "" },
    validationSchema: yup.object({
      email: yup
        .string()
        .trim()
        .email("Enter a valid email address.")
        .max(200)
        .required("Enter your email address."),
      password: registering
        ? yup
            .string()
            .min(8, "Use at least 8 characters.")
            .required("Enter a password.")
        : yup.string().required("Enter your password."),
      confirmPassword: registering
        ? yup
            .string()
            .oneOf([yup.ref("password")], "Passwords must match.")
            .required("Confirm your password.")
        : yup.string()
    }),
    onSubmit: async ({ email, password, confirmPassword }) => {
      setError("");
      try {
        const response = registering
          ? await signup(email.trim(), password, confirmPassword)
          : await logIn(email.trim(), password);
        const data = await checkHttpStatus(response);
        client.clear();
        localStorage.setItem(
          LOCAL_STORAGE,
          JSON.stringify({
            access_token: data.access_token,
            refresh_token: data.refresh_token
          })
        );
        dispatch(authLoginSuccess(data));
        navigate(destination, { replace: true });
      } catch (failure) {
        setError(await authErrorMessage(failure));
      }
    }
  });
  const fields = [
    {
      name: "email" as const,
      label: "Email",
      type: "email",
      autoComplete: "email"
    },
    {
      name: "password" as const,
      label: "Password",
      type: "password",
      autoComplete: registering ? "new-password" : "current-password"
    },
    ...(registering
      ? [
          {
            name: "confirmPassword" as const,
            label: "Confirm password",
            type: "password",
            autoComplete: "new-password"
          }
        ]
      : [])
  ];
  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col justify-center overflow-y-auto px-4 py-8 md:h-dvh md:pl-16">
      <main className="mx-auto w-full max-w-md space-y-6 px-4 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {registering ? "Create account" : "Sign in"}
        </h1>
        <form className="space-y-4" noValidate onSubmit={form.handleSubmit}>
          {fields.map(({ name, label, ...input }) => (
            <div key={name} className="space-y-2">
              <Label htmlFor={name}>{label}</Label>
              <Input
                {...input}
                id={name}
                name={name}
                value={form.values[name]}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                required
                aria-invalid={!!(form.touched[name] && form.errors[name])}
                aria-describedby={
                  form.touched[name] && form.errors[name]
                    ? `${name}-error`
                    : undefined
                }
              />
              {form.touched[name] && form.errors[name] && (
                <p
                  id={`${name}-error`}
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {form.errors[name]}
                </p>
              )}
            </div>
          ))}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button className="w-full" type="submit" disabled={form.isSubmitting}>
            {form.isSubmitting && <Spinner className="size-4" />}
            {registering ? "Create account" : "Log in"}
          </Button>
        </form>
        <p className="text-center text-sm">
          <Link
            className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            to={`${registering ? "/login" : "/signup"}?next=${encodeURIComponent(destination)}`}
          >
            {registering ? "Already have an account?" : "Create account"}
          </Link>
        </p>
      </main>
    </div>
  );
}
