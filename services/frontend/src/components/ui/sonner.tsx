import { Toaster as Sonner, type ToasterProps } from "sonner";
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "!border-border !bg-popover !text-popover-foreground",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground",
          cancelButton: "!bg-muted !text-muted-foreground"
        }
      }}
      {...props}
    />
  );
}
