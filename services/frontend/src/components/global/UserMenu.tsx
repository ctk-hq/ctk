import { useNavigate } from "react-router-dom";
import { UserCircleIcon } from "@heroicons/react/solid";

interface IUserMenuProps {
  username: string;
  current: boolean;
}

export default function UserMenu(props: IUserMenuProps) {
  const { username, current } = props;
  const navigate = useNavigate();

  return (
    <div
      onClick={() => {
        navigate("/profile");
      }}
      className={`
        ${
          current ? "bg-blue-800 text-white" : "text-blue-100 hover:bg-blue-600"
        },
        flex md:border-t md:border-blue-800 p-4 md:w-full hover:cursor-pointer hover:bg-blue-600
      `}
    >
      <div className="flex items-center mx-auto">
        <UserCircleIcon className="inline-block h-8 w-8 rounded-full text-white" />
        <div className="ml-3 sm:ml-0">
          <p className="text-sm font-medium text-white sm:hidden">
            {username ? <>{username}</> : <>Log in</>}
          </p>
        </div>
      </div>
    </div>
  );
}
