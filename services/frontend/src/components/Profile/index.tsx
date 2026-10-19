import { LOCAL_STORAGE } from "@/constants";
import { authSelf } from "@/reducers";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import PrivateValues from "../Project/PrivateValues";
interface IProfileProps {
  dispatch: any;
  state: any;
}
export default function Profile({ dispatch, state }: IProfileProps) {
  const client = useQueryClient();
  const logOut = () => {
    client.clear();
    localStorage.removeItem(LOCAL_STORAGE);
    dispatch(authSelf(null));
  };
  return (
    <div className="h-[calc(100dvh-4rem)] overflow-y-auto md:h-dvh md:pl-16">
      <main className="px-4 py-6 sm:px-6 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Profile</h1>
          <Button variant="outline" onClick={logOut}>
            Logout
          </Button>
        </div>
        <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {["username", "email"].map(
            (key) =>
              state.user?.[key] && (
                <div key={key}>
                  <dt className="text-sm text-muted-foreground">{key}</dt>
                  <dd className="mt-1 text-sm">{state.user[key]}</dd>
                </div>
              )
          )}
        </dl>
        <section
          className="mt-10 max-w-3xl space-y-4 border-t pt-6"
          aria-labelledby="profile-private-values"
        >
          <h2 id="profile-private-values" className="text-lg font-semibold">
            My private values
          </h2>
          <PrivateValues />
        </section>
      </main>
    </div>
  );
}
