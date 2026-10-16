import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { IProject } from "@/types";
import ModalConfirmDelete from "@/components/modals/ConfirmDelete";
import { useDeleteProject } from "@/hooks/useProject";
import { Button } from "@/components/ui/button";
export default function PreviewBlock({ project }: { project: IProject }) {
  const [confirm, setConfirm] = useState(false);
  const mutation = useDeleteProject(project.uuid);
  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border bg-background p-5 transition-colors hover:bg-muted/50">
        <Link
          className="min-w-0 flex-1 truncate rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          to={`/projects/${project.uuid}`}
          title={project.name}
        >
          {project.name}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          aria-label={`Delete project ${project.name}`}
          onClick={() => setConfirm(true)}
        >
          <Trash2 />
        </Button>
      </div>
      {confirm && (
        <ModalConfirmDelete
          onConfirm={() => mutation.mutate()}
          onHide={() => setConfirm(false)}
        />
      )}
    </>
  );
}
