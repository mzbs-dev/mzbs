import { useState } from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RiDeleteBinLine } from "react-icons/ri";
const DelConfirmMsg = ({
  OnDelete,
  title = "Are you sure?",
  text = "You want to delete this item?",
}: {
  rowId: number;
  OnDelete: (confirmed: boolean) => void;
  title?: string;
  text?: string;
}) => {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    OnDelete(true);
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <RiDeleteBinLine className="text-red-600 text-lg cursor-pointer hover:text-red-700" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <p>{text}</p>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Yes, Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>    
  );
};

export default DelConfirmMsg;
