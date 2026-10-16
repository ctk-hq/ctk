import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LOCAL_STORAGE } from "../../../constants";
import { toaster } from "../../../utils";
import { socialAuth } from "../../../hooks/useSocialAuth";
import { authLoginSuccess } from "../../../reducers";
import Spinner from "../../global/Spinner";

interface IGitHubProps {
  dispatch: any;
}

const GitHub = (props: IGitHubProps) => {
  const navigate = useNavigate();
  const { dispatch } = props;
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const code = searchParams.get("code");

  useEffect(() => {
    if (code) {
      setLoading(true);
      socialAuth(code)
        .then((data: any) => {
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
        .catch(() => {
          localStorage.removeItem(LOCAL_STORAGE);
          navigate(`/login`);
          toaster(`Something went wrong! Session may have expired.`, "error");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      navigate(`/login`);
    }
  }, [code, dispatch, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <div className="flex">
        {loading && (
          <div className="flex flex-row items-center space-x-2">
            <Spinner className="w-4 h-4 text-foreground" />
            <span className="text-base text-foreground">logging in...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHub;
