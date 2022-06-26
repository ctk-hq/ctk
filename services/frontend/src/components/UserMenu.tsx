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
        ${current ? "bg-blue-800 text-white" : "text-blue-100 hover:bg-blue-600"},
        flex border-t border-blue-800 p-4 w-full hover:cursor-pointer hover:bg-blue-600
      `}
    >
      <div className="flex items-center">
        <div>
          <UserCircleIcon className="inline-block h-8 w-8 rounded-full" />
        </div>
        <div className="ml-3">
          <p className="text-base font-medium text-white">{username}</p>
          <p className="text-sm font-medium text-indigo-200 group-hover:text-white">View profile</p>
        </div>
      </div>
    </div>
  ) 
}