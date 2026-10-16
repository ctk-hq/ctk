import { Link } from "react-router-dom";
import { UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function UserMenu({
  username,
  current
}: {
  username: string;
  current: boolean;
}) {
  const label = username ? `Profile: ${username}` : "Log in";
  return (
    <Button asChild variant={current ? "secondary" : "ghost"} size="icon">
      <Link
        to={username ? "/profile" : "/login"}
        aria-label={label}
        title={label}
      >
        <UserCircle />
      </Link>
    </Button>
  );
}
