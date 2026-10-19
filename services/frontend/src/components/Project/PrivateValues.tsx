import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, LockKeyhole, Pencil, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import type { PrivateVariable } from "../../types";
import {
  deletePrivateVariable,
  listPrivateVariables,
  revealPrivateVariable,
  savePrivateVariable
} from "../../services/variables";
import { variableNamePattern } from "../../utils/variables";

function PrivateValueRow({
  variable,
  onEdit,
  onDelete,
  onUse
}: {
  variable: PrivateVariable;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onUse?: () => void;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const request = useRef({ generation: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hideValue = useCallback(() => {
    request.current.generation++;
    clearTimeout(timer.current);
    setValue(null);
    setBusy(false);
  }, []);

  useEffect(() => {
    const state = request.current;
    hideValue();
    window.addEventListener("blur", hideValue);
    document.addEventListener("visibilitychange", hideValue);
    return () => {
      state.generation++;
      clearTimeout(timer.current);
      window.removeEventListener("blur", hideValue);
      document.removeEventListener("visibilitychange", hideValue);
    };
  }, [variable, hideValue]);

  const reveal = async () => {
    if (value !== null) {
      hideValue();
      return;
    }
    const current = ++request.current.generation;
    setBusy(true);
    setError("");
    try {
      const revealed = await revealPrivateVariable(variable.id);
      if (current !== request.current.generation) return;
      setValue(revealed);
      timer.current = setTimeout(() => setValue(null), 30_000);
    } catch (cause) {
      if (current === request.current.generation)
        setError((cause as Error).message);
    } finally {
      if (current === request.current.generation) setBusy(false);
    }
  };

  return (
    <li className="space-y-2 border-b py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="break-all font-mono text-sm">{variable.name}</p>
          <p className="text-xs text-muted-foreground">
            {variable.project_uuid ? "This project" : "Across my projects"} ·{" "}
            {variable.secret ? "Secret" : "Variable"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {onUse && (
            <Button type="button" size="sm" variant="outline" onClick={onUse}>
              Use in project
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void reveal()}
            aria-label={`${value === null ? "Reveal" : "Hide"} ${variable.name}`}
          >
            {value === null ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4" />
            )}
            {busy ? "Revealing…" : value === null ? "Reveal" : "Hide"}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Replace saved value ${variable.name}`}
            title={`Replace ${variable.name}`}
            onClick={() => {
              hideValue();
              onEdit();
            }}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Delete saved value ${variable.name}`}
            title={`Delete ${variable.name}`}
            onClick={() => {
              hideValue();
              setConfirmDelete(true);
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {value !== null && (
        <output
          aria-label={`Value of ${variable.name}`}
          className="block max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-sm"
        >
          {value || "(empty value)"}
        </output>
      )}
      {confirmDelete && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Delete this saved value?</span>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onDelete();
              } catch (cause) {
                setError((cause as Error).message);
                setBusy(false);
              }
            }}
          >
            Delete value
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

export default function PrivateValues({
  projectUuid,
  onUse
}: {
  projectUuid?: string;
  onUse?: (variable: PrivateVariable) => void;
}) {
  // Only metadata enters the query cache. Decrypted values stay in the row.
  const query = useQuery({
    queryKey: ["private-variables", projectUuid ?? "account"],
    queryFn: () => listPrivateVariables(projectUuid),
    retry: false
  });
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [secret, setSecret] = useState(true);
  const [scope, setScope] = useState("account");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!variableNamePattern.test(name)) {
      setError(
        "Use a name such as DB_PASSWORD: letters, numbers, and underscores; start with a letter or underscore."
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      await savePrivateVariable(
        name,
        value,
        secret,
        scope === "project" ? projectUuid : undefined
      );
      setName("");
      setValue("");
      setEditing(false);
      await query.refetch();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        <LockKeyhole className="mr-1 inline size-4" aria-hidden="true" />
        Only you can access these values. They are encrypted separately from
        projects. Revealed values hide after 30 seconds or when you leave this
        window.
      </p>
      {query.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading saved values…
        </p>
      ) : query.error ? (
        <div role="alert" className="space-y-2 text-sm">
          <p>{query.error.message}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : (
        <>
          {!query.data?.storage_available && (
            <p role="status" className="text-sm text-muted-foreground">
              Private storage is unavailable. Ask the server administrator to
              configure its encryption key. You can still use project references
              and supply values in your local .env.
            </p>
          )}
          {query.data?.variables.length ? (
            <ul className="divide-border">
              {query.data.variables.map((variable) => (
                <PrivateValueRow
                  key={variable.id}
                  variable={variable}
                  onEdit={() => {
                    setName(variable.name);
                    setValue("");
                    setSecret(variable.secret);
                    setScope(variable.project_uuid ? "project" : "account");
                    setEditing(true);
                    setError("");
                  }}
                  onDelete={async () => {
                    await deletePrivateVariable(variable.id);
                    await query.refetch();
                  }}
                  onUse={onUse ? () => onUse(variable) : undefined}
                />
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              No private values saved. Add one below to reuse it across your
              projects.
            </p>
          )}
          <form
            autoComplete="off"
            onSubmit={(event) => void save(event)}
            className="space-y-4 border-t pt-5"
          >
            <h3 className="text-sm font-medium">
              {editing ? `Replace ${name}` : "Save a private value"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="private-variable-name">Variable name</Label>
                <Input
                  id="private-variable-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="DB_PASSWORD"
                  readOnly={editing}
                  maxLength={128}
                  required
                  spellCheck={false}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="private-variable-scope">Use value in</Label>
                <select
                  id="private-variable-scope"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                  disabled={editing}
                >
                  <option value="account">All my projects</option>
                  {projectUuid && (
                    <option value="project">This project only</option>
                  )}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="private-variable-value">
                {editing ? "New value" : "Private value"}
              </Label>
              <Input
                id="private-variable-value"
                type="password"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                autoComplete="new-password"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="private-variable-secret"
                checked={secret}
                onCheckedChange={(checked) => setSecret(checked === true)}
              />
              <Label htmlFor="private-variable-secret">Treat as a secret</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Project values override your account values. Saving here never
              adds a value to the project or its public preview.
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={saving || !query.data?.storage_available}
              >
                {saving
                  ? "Saving…"
                  : editing
                    ? "Replace value"
                    : "Save private value"}
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setName("");
                    setValue("");
                    setError("");
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
