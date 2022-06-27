import { TrashIcon, PencilIcon } from "@heroicons/react/solid";
export const Popover = ({
  onEditClick,
  onDeleteClick
}: {
    onEditClick: Function
    onDeleteClick: Function
}) => {
  return (
    <div className="relative flex flex-col items-center">
      <div className="flex absolute -bottom-2 flex flex-col items-center p-2">
        <span className="relative z-10 p-2.5 text-xs leading-none text-white whitespace-no-wrap bg-gray-700 shadow-lg rounded-md">
          <div className="flex space-x-2.5">
            <TrashIcon onClick={() => onDeleteClick()} className="w-3 h-3 text-red-400"></TrashIcon>
            <PencilIcon onClick={() => onEditClick()} className="w-3 h-3"></PencilIcon>
          </div>
        </span>
        <div className="w-3 h-3 -mt-2.5 rotate-45 bg-gray-600"></div>
      </div>
    </div>
  );
};