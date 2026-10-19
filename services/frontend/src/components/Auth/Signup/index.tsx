import EmailForm from "../EmailForm";
import { authLoginSuccess } from "@/reducers";

export default function Signup({
  dispatch
}: {
  dispatch: (action: ReturnType<typeof authLoginSuccess>) => void;
}) {
  return <EmailForm registering dispatch={dispatch} />;
}
