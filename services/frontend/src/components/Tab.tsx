import { useCallback } from "react";
import { styled } from "@mui/material";
import { useTabContext } from "../hooks";

export interface ITabProps {
  value: string;
  title: string;
  hidden?: boolean;
}

interface IRootProps {
  active: boolean;
  hidden?: boolean;
}

const Root = styled("div", {
  shouldForwardProp: (name) => !["hidden", "active"].includes(name.toString())
})<IRootProps>(({ hidden, active }) => ({
  paddingLeft: "0.25rem",
  paddingRight: "0.25rem",
  paddingTop: "1rem",
  paddingBottom: "1rem",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  fontWeight: 500,
  whiteSpace: "nowrap",
  borderBottomWidth: 2,
  cursor: "pointer",

  ...(active
    ? { color: "#4f46e5", borderColor: "#6366f1" }
    : {
        color: "#6B7280",
        borderColor: "transparent",

        "&:hover": {
          color: "#374151",
          borderColor: "#D1D5DB"
        }
      }),

  display: hidden ? "none" : undefined
}));

const Tab = (props: ITabProps) => {
  const { value, title, hidden } = props;
  const { value: open, onChange } = useTabContext();

  const handleClick = useCallback((event) => {
    event.preventDefault();
    onChange(value);
  }, []);

  return (
    <Root hidden={hidden} active={open === value} onClick={handleClick}>
      {title}
    </Root>
  );
};

export default Tab;
