import { useState, type FormEvent } from "react";
import { Copy, Download, KeyRound, Trash2 } from "lucide-react";
import Modal from "../Modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { SegmentedControl } from "../ui/segmented-control";
import type { ProjectVariable } from "../../types";
import {
  downloadText,
  generateEnvExample,
  referencedVariables,
  variableNamePattern
} from "../../utils/variables";
import PrivateValues from "./PrivateValues";
import { exportPrivateEnv } from "../../services/variables";

export default function VariablesModal({
  variables,
  graph,
  onChange,
  onHide,
  projectUuid,
  canManageValues,
  onSaveBeforeExport
}: {
  variables: ProjectVariable[];
  graph: unknown;
  onChange: (variables: ProjectVariable[]) => void;
  onHide: () => void;
  projectUuid?: string;
  canManageValues: boolean;
  onSaveBeforeExport: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"project" | "private">("project");
  const [name, setName] = useState("");
  const [secret, setSecret] = useState(true);
  const [defaultValue, setDefaultValue] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const references = referencedVariables(graph);
  const undeclared = references.filter(
    (reference) => !variables.some((variable) => variable.name === reference)
  );

  const add = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!variableNamePattern.test(name)) {
      setError(
        "Use a shell variable name such as DB_PASSWORD, up to 128 characters."
      );
      return;
    }
    if (variables.some((variable) => variable.name === name)) {
      setError(
        "This variable already exists. Remove it before changing its definition."
      );
      return;
    }
    if (variables.length >= 200) {
      setError("A project can define up to 200 variables.");
      return;
    }
    onChange([
      ...variables,
      { name, secret, ...(!secret ? { default: defaultValue } : {}) }
    ]);
    setName("");
    setDefaultValue("");
  };

  const copyReference = async (variableName: string) => {
    try {
      await navigator.clipboard.writeText(`\${${variableName}}`);
      setNotice(`Copied \${${variableName}}`);
    } catch {
      setError("Unable to copy. Select the reference and copy it manually.");
    }
  };

  const envDownloads = (
    <div className="shrink-0 space-y-3 border-t px-6 py-4">
      <h3 className="text-sm font-medium">Environment files</h3>
      <p className="text-sm text-muted-foreground">
        The example includes shared defaults and empty secret fields.
        {canManageValues
          ? " A private .env download contains your saved values; keep it out of source control."
          : " Copy the example to .env and supply your own values locally."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            downloadText(generateEnvExample(graph, variables), ".env.example")
          }
        >
          <Download className="size-4" />
          Download .env.example
        </Button>
        {canManageValues && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!projectUuid || exporting}
            onClick={async () => {
              if (!projectUuid) return;
              setExporting(true);
              setError("");
              try {
                await onSaveBeforeExport();
                const text = await exportPrivateEnv(projectUuid);
                downloadText(text, ".env");
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setExporting(false);
              }
            }}
          >
            <LockKeyholeIcon />
            {exporting ? "Preparing .env…" : "Download my private .env"}
          </Button>
        )}
      </div>
      {canManageValues && !projectUuid && (
        <p className="text-xs text-muted-foreground">
          Save the project first to download an .env with your private values or
          set project overrides.
        </p>
      )}
    </div>
  );

  return (
    <Modal title="Variables" onHide={onHide}>
      <div className="flex min-h-0 flex-col">
        {canManageValues && (
          <div className="shrink-0 px-6 pt-4">
            <SegmentedControl
              aria-label="Variable settings"
              value={tab}
              onValueChange={setTab}
              options={[
                { value: "project", label: "Project references" },
                ...(canManageValues
                  ? [{ value: "private" as const, label: "My private values" }]
                  : [])
              ]}
            />
          </div>
        )}
        <div className="min-h-0 space-y-5 overflow-y-auto p-6">
          {tab === "private" && canManageValues ? (
            <PrivateValues projectUuid={projectUuid} />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Use{" "}
                <code className="text-foreground">{"${VARIABLE_NAME}"}</code> in
                environment values, volume paths, or other Compose fields.
                References stay in the generated file; Docker Compose fills them
                from your local .env.
              </p>
              <p className="text-sm text-muted-foreground">
                Definitions and shared defaults are included when this project
                is public.{" "}
                {canManageValues ? (
                  <>
                    Secret values are saved separately under{" "}
                    <span className="font-medium text-foreground">
                      My private values
                    </span>
                    .
                  </>
                ) : (
                  "Supply your own secret values in a local .env file."
                )}
              </p>
              {variables.length ? (
                <ul>
                  {variables.map((variable) => (
                    <li
                      key={variable.name}
                      className="flex items-start justify-between gap-3 border-b py-3 last:border-b-0"
                    >
                      <div className="min-w-0 space-y-1">
                        <code className="break-all text-sm">{`\${${variable.name}}`}</code>
                        <p className="break-all text-xs text-muted-foreground">
                          {variable.secret
                            ? "Secret · no value in project"
                            : variable.default !== undefined
                              ? `Shared default: ${variable.default || "(empty)"}`
                              : "Variable · supply your own value"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Copy reference ${variable.name}`}
                          onClick={() => void copyReference(variable.name)}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove reference ${variable.name}`}
                          onClick={() =>
                            onChange(
                              variables.filter(
                                (item) => item.name !== variable.name
                              )
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-1 py-3">
                  <h3 className="text-sm font-medium">
                    Define once, reference anywhere
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Add DB_PASSWORD for a credential, or BASE_PATH for a
                    reusable volume path.
                  </p>
                </div>
              )}
              {undeclared.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    References found in your configuration:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {undeclared.map((reference) => (
                      <Button
                        key={reference}
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          variables.length >= 200 ||
                          !variableNamePattern.test(reference)
                        }
                        onClick={() =>
                          onChange([
                            ...variables,
                            { name: reference, secret: true }
                          ])
                        }
                      >
                        <KeyRound className="size-3.5" />
                        Add {reference}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <form
                onSubmit={add}
                className="space-y-4 border-t pt-5"
                autoComplete="off"
              >
                <h3 className="text-sm font-medium">Add a project variable</h3>
                <div className="space-y-2">
                  <Label htmlFor="project-variable-name">Variable name</Label>
                  <Input
                    id="project-variable-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="DB_PASSWORD"
                    maxLength={128}
                    required
                    spellCheck={false}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="project-variable-secret"
                    checked={secret}
                    onCheckedChange={(checked) => {
                      setSecret(checked === true);
                      setDefaultValue("");
                    }}
                  />
                  <Label htmlFor="project-variable-secret">Secret</Label>
                </div>
                {!secret && (
                  <div className="space-y-2">
                    <Label htmlFor="project-variable-default">
                      Shared default (included in the project)
                    </Label>
                    <Input
                      id="project-variable-default"
                      value={defaultValue}
                      onChange={(event) => setDefaultValue(event.target.value)}
                      placeholder="e.g. UTC"
                    />
                    <p className="text-xs text-muted-foreground">
                      {canManageValues
                        ? "Use My private values for personal paths, domains, or any value you do not want to publish."
                        : "Supply personal paths, domains, and other private values in your local .env."}
                    </p>
                  </div>
                )}
                <Button type="submit">Add variable</Button>
              </form>
            </>
          )}
        </div>
        {(notice || error) && (
          <div className="shrink-0 space-y-2 px-6 pb-4">
            {notice && (
              <p
                role="status"
                className="break-words text-sm text-muted-foreground"
              >
                {notice}
              </p>
            )}
            {error && (
              <p role="alert" className="break-words text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )}
        {tab === "project" && envDownloads}
      </div>
    </Modal>
  );
}

function LockKeyholeIcon() {
  return <KeyRound className="size-4" aria-hidden="true" />;
}
