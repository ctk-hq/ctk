import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProjectOptions } from "@/hooks/useProjects";

export default function ProjectNameField({
  name,
  projectUuid,
  canSwitch,
  disabled,
  onRename,
  onCommit,
  onSwitch
}: {
  name: string;
  projectUuid?: string;
  canSwitch: boolean;
  disabled: boolean;
  onRename: (name: string) => void;
  onCommit: () => void;
  onSwitch: (uuid: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const query = useProjectOptions(canSwitch && open);
  const projects = query.data?.pages.flatMap((page) => page.results) ?? [];
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  const select = async (uuid: string) => {
    if (disabled || switching) return;
    if (uuid === projectUuid) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    setSwitchError("");
    try {
      await onSwitch(uuid);
      setOpen(false);
    } catch {
      setSwitchError("Unable to save this project. Try switching again.");
    } finally {
      setSwitching(false);
    }
  };
  return (
    <div
      ref={root}
      className="relative min-w-0 flex-1 md:max-w-sm"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="relative">
        <Input
          ref={input}
          className={canSwitch ? "pr-10" : undefined}
          aria-label="Project name"
          role={canSwitch ? "combobox" : undefined}
          aria-expanded={canSwitch ? open : undefined}
          aria-controls={open ? listId : undefined}
          aria-autocomplete={canSwitch ? "none" : undefined}
          aria-activedescendant={
            open && active >= 0 ? `${listId}-${active}` : undefined
          }
          autoComplete="off"
          id="name"
          name="name"
          value={name}
          onChange={(event) => {
            onRename(event.target.value);
            setOpen(false);
            setActive(-1);
          }}
          onKeyDown={(event) => {
            if (
              canSwitch &&
              (event.key === "ArrowDown" || event.key === "ArrowUp")
            ) {
              event.preventDefault();
              setOpen(true);
              setActive((index) =>
                Math.max(
                  0,
                  Math.min(
                    projects.length - 1,
                    index + (event.key === "ArrowDown" ? 1 : -1)
                  )
                )
              );
            } else if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (open && projects[active]) void select(projects[active].uuid);
              else {
                setOpen(false);
                onCommit();
              }
            }
          }}
        />
        {canSwitch && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute inset-y-0 right-0"
            aria-label="Switch project"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            disabled={disabled || switching}
            onClick={() => {
              setOpen(!open);
              setActive(-1);
              input.current?.focus();
            }}
          >
            <ChevronDown />
          </Button>
        )}
      </div>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md">
          {query.isPending ? (
            <p
              role="status"
              className="px-3 py-3 text-sm text-muted-foreground"
            >
              Loading projects…
            </p>
          ) : query.isError ? (
            <div className="px-3 py-3 text-sm">
              <p role="alert">Unable to load projects.</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void query.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : (
            <>
              <div
                id={listId}
                role="listbox"
                aria-label="Saved projects"
                className="max-h-64 overflow-y-auto p-1"
              >
                {projects.map((project, index) => (
                  <button
                    key={project.uuid}
                    id={`${listId}-${index}`}
                    role="option"
                    type="button"
                    tabIndex={-1}
                    aria-selected={project.uuid === projectUuid}
                    disabled={disabled || switching}
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent disabled:opacity-50 ${index === active ? "bg-accent" : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void select(project.uuid)}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {project.name}
                    </span>
                    {project.uuid === projectUuid && (
                      <Check className="size-4 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              {projects.length === 0 && (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                  Your saved projects will appear here.
                </p>
              )}
              {query.hasNextPage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  disabled={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  {query.isFetchingNextPage ? "Loading…" : "Load more projects"}
                </Button>
              )}
            </>
          )}
          {switchError && (
            <p role="alert" className="px-3 py-2 text-sm text-destructive">
              {switchError}
            </p>
          )}
          {switching && (
            <p
              role="status"
              className="px-3 py-2 text-sm text-muted-foreground"
            >
              Saving before switching…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
