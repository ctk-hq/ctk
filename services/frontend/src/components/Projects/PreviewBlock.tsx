import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrashIcon } from "@heroicons/react/outline";
import { truncateStr } from "../../utils";
import { IProject } from "../../types";
import ModalConfirmDelete from "../../components/Modal/ConfirmDelete";
import { useDeleteProject } from "../../hooks/useProject";

interface IPreviewBlockProps {
  project: IProject;
}

const PreviewBlock = (props: IPreviewBlockProps) => {
  const { project } = props;
  const [isHovering, setIsHovering] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const mutation = useDeleteProject(project.uuid);
  const navigate = useNavigate();

  const handleMouseOver = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleClick = (e: any) => {
    navigate(`/projects/${project.uuid}`);
  };

  const onDelete = (e: any) => {
    e.stopPropagation();
    setShowDeleteConfirmModal(true);
  };

  const onDeleteConfirmed = () => {
    mutation.mutate();
  };

  return (
    <>
      <div
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        key={project.id}
        className={`
          cursor-pointer
          relative
          rounded-lg
          dark:bg-gray-900
          bg-gray-100
          px-6
          py-5
          shadow-sm
          flex
          items-center
          space-x-3
          hover:bg-gray-200
        `}
      >
        <div className="flex-1 min-w-0">{truncateStr(project.name, 25)}</div>

        {isHovering && (
          <div className="flex space-x-1 absolute top-2 right-2">
            <button
              onClick={onDelete}
              className="flex justify-center items-center p-2 hover:bg-gray-100 shadow bg-white rounded-md"
            >
              <TrashIcon className="w-3 h-3 text-red-500 hover:text-red-600" />
            </button>
          </div>
        )}
      </div>

      {showDeleteConfirmModal && (
        <ModalConfirmDelete
          onConfirm={() => onDeleteConfirmed()}
          onHide={() => {
            setShowDeleteConfirmModal(false);
          }}
        />
      )}
    </>
  );
};

export default PreviewBlock;
