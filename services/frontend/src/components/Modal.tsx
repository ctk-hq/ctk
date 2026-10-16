import { type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useDialogReturnFocus } from "@/hooks/useDialogReturnFocus";
export interface IModalProps {
  title: string;
  onHide: () => void;
  children: ReactNode;
}
export default function Modal({ title, onHide, children }: IModalProps) {
  const returnFocus = useDialogReturnFocus();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onHide();
      }}
    >
      <DialogContent onCloseAutoFocus={returnFocus}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
