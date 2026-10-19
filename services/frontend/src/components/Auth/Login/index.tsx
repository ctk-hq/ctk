import EmailForm from "../EmailForm";
import { authLoginSuccess } from "@/reducers";

export default function Login({
  dispatch
}: {
  dispatch: (action: ReturnType<typeof authLoginSuccess>) => void;
}) {
  return <EmailForm dispatch={dispatch} />;
}
