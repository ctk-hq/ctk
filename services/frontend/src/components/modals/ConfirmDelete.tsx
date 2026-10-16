import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useDialogReturnFocus } from "@/hooks/useDialogReturnFocus";
interface IModalConfirmDeleteProps {
  onConfirm: () => void;
  onHide: () => void;
}
export default function ModalConfirmDelete({
  onConfirm,
  onHide
}: IModalConfirmDeleteProps) {
  const returnFocus = useDialogReturnFocus();
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onHide();
      }}
    >
      <AlertDialogContent onCloseAutoFocus={returnFocus}>
        <AlertDialogTitle className="text-lg font-semibold">
          Confirm delete
        </AlertDialogTitle>
        <AlertDialogDescription className="text-sm text-muted-foreground">
          Careful! This action cannot be undone.
        </AlertDialogDescription>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel asChild>
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={() => {
                onHide();
                onConfirm();
              }}
            >
              Delete
            </Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
