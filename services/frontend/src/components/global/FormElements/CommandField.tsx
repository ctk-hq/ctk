import { useLayoutEffect, useRef, useState } from "react";
import { useField } from "formik";
import { ChevronDown, ChevronRight, ChevronUp, Plus, X } from "lucide-react";
import type { ContainerCommand } from "@/types";
import {
  formatCommandArguments,
  parseArgumentPaste,
  parseCommandText
} from "@/utils/commands";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";

type CommandMode = "default" | "text" | "arguments";

export default function CommandField({
  name,
  label,
  id = name
}: {
  name: "command" | "entrypoint";
  label: string;
  id?: string;
}) {
  const [field, meta, helpers] = useField<ContainerCommand>(name);
  const [localError, setLocalError] = useState("");
  const [paste, setPaste] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [isAppending, setIsAppending] = useState(false);
  const editVersion = useRef(0);
  const lastOverride = useRef(field.value);
  const argumentRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const addRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const mode: CommandMode =
    field.value == null
      ? "default"
      : Array.isArray(field.value)
        ? "arguments"
        : "text";
  const args = Array.isArray(field.value) ? field.value : [];
  const error = localError || (meta.touched && meta.error) || "";
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = `${descriptionId}${error ? ` ${errorId}` : ""}`;

  useLayoutEffect(() => {
    if (pendingFocus.current === null) return;
    const index = pendingFocus.current;
    pendingFocus.current = null;
    (argumentRefs.current[index] ?? addRef.current)?.focus();
  }, [field.value]);

  const update = (value: ContainerCommand) => {
    editVersion.current += 1;
    if (value !== null) lastOverride.current = value;
    setLocalError("");
    void helpers.setValue(value);
  };

  const selectMode = (next: CommandMode) => {
    const value = field.value ?? lastOverride.current;
    try {
      if (next === "default") update(null);
      else if (next === "text")
        update(
          Array.isArray(value) ? formatCommandArguments(value) : (value ?? "")
        );
      else
        update(
          Array.isArray(value) ? [...value] : parseCommandText(value ?? "")
        );
    } catch (error) {
      setLocalError((error as Error).message);
    }
  };

  const move = (index: number, direction: number) => {
    const next = [...args];
    const destination = index + direction;
    [next[index], next[destination]] = [next[destination], next[index]];
    pendingFocus.current = destination;
    update(next);
    setNotice(`Moved argument ${index + 1} to position ${destination + 1}.`);
  };

  const append = async () => {
    if (isAppending) return;
    const version = editVersion.current;
    setIsAppending(true);
    try {
      const pasted = await parseArgumentPaste(paste);
      if (version !== editVersion.current) {
        setLocalError(
          "Arguments changed while parsing. Append the pasted arguments again."
        );
        return;
      }
      pendingFocus.current = args.length;
      update([...args, ...pasted]);
      setPaste("");
      setNotice(
        `Added ${pasted.length} ${pasted.length === 1 ? "argument" : "arguments"}.`
      );
    } catch (error) {
      setLocalError((error as Error).message);
    } finally {
      setIsAppending(false);
    }
  };

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      className="min-w-0 space-y-3"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <span id={`${id}-label`} className="text-sm font-medium">
          {label}
        </span>
        <SegmentedControl
          aria-label={`${label} format`}
          value={mode}
          onValueChange={selectMode}
          options={[
            { value: "default", label: "Image default" },
            { value: "text", label: "Text" },
            { value: "arguments", label: "Arguments" }
          ]}
        />
      </div>

      {mode === "text" && (
        <Textarea
          id={`${id}-text`}
          name={name}
          aria-label={label}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          value={typeof field.value === "string" ? field.value : ""}
          onChange={(event) => update(event.target.value)}
          onBlur={() => void helpers.setTouched(true)}
          rows={3}
          spellCheck={false}
          autoCapitalize="off"
          className="font-mono leading-relaxed"
        />
      )}

      {mode === "arguments" && (
        <div className="space-y-3">
          <ol className="min-w-0 space-y-2" aria-label={`${label} arguments`}>
            {args.map((argument, index) => (
              <li
                key={index}
                className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1 sm:grid-cols-[1rem_minmax(0,1fr)_auto]"
              >
                <span
                  aria-hidden="true"
                  className="w-4 shrink-0 pt-2 text-right text-xs tabular-nums text-muted-foreground"
                >
                  {index + 1}
                </span>
                <Label htmlFor={`${id}-argument-${index}`} className="sr-only">
                  {label} argument {index + 1}
                </Label>
                <Textarea
                  id={`${id}-argument-${index}`}
                  ref={(element) => {
                    argumentRefs.current[index] = element;
                  }}
                  value={argument}
                  onChange={(event) =>
                    update(
                      args.map((value, item) =>
                        item === index ? event.target.value : value
                      )
                    )
                  }
                  onBlur={() => void helpers.setTouched(true)}
                  aria-describedby={describedBy}
                  aria-invalid={Boolean(error)}
                  rows={1}
                  spellCheck={false}
                  autoCapitalize="off"
                  className="field-sizing-content min-h-9 max-h-40 flex-1 font-mono leading-relaxed"
                />
                <div className="col-start-2 flex justify-end sm:col-start-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${label}: move argument ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronUp aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${label}: move argument ${index + 1} down`}
                    disabled={index === args.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDown aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${label}: remove argument ${index + 1}`}
                    onClick={() => {
                      pendingFocus.current = Math.max(
                        0,
                        Math.min(index, args.length - 2)
                      );
                      update(args.filter((_, item) => item !== index));
                      setNotice(`Removed argument ${index + 1}.`);
                    }}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
          <Button
            ref={addRef}
            variant="outline"
            size="sm"
            aria-label={`Add ${label.toLowerCase()} argument`}
            onClick={() => {
              pendingFocus.current = args.length;
              update([...args, ""]);
            }}
          >
            <Plus aria-hidden="true" />
            Add argument
          </Button>
          <Collapsible
            open={pasteOpen}
            onOpenChange={setPasteOpen}
            className="w-full min-w-0 space-y-3"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto w-full justify-start px-2"
              >
                {pasteOpen ? (
                  <ChevronDown className="size-4" aria-hidden="true" />
                ) : (
                  <ChevronRight className="size-4" aria-hidden="true" />
                )}
                <span>Paste arguments</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3">
              <Label htmlFor={`${id}-paste`}>{label} bulk arguments</Label>
              <Textarea
                id={`${id}-paste`}
                value={paste}
                onChange={(event) => {
                  setPaste(event.target.value);
                  setLocalError("");
                }}
                rows={3}
                spellCheck={false}
                className="font-mono"
                aria-describedby={`${id}-paste-help`}
              />
              <p
                id={`${id}-paste-help`}
                className="text-xs text-muted-foreground"
              >
                Paste a JSON/YAML string list or one argument per line. Empty
                lines are skipped; use [""] for an empty argument.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={append}
                disabled={isAppending}
              >
                {isAppending ? "Reading arguments…" : "Append arguments"}
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      <p
        id={descriptionId}
        className="text-xs leading-relaxed text-muted-foreground"
      >
        {mode === "default"
          ? `Uses the image’s default ${name === "command" ? "command" : "entrypoint"}.`
          : mode === "arguments"
            ? "Each row is one argument. Spaces, commas and empty arguments are preserved."
            : "Use quotes to keep an argument together. For shell scripts, specify a shell explicitly, such as sh -c '…'."}
      </p>
      {mode !== "default" &&
        (field.value === "" ||
          (Array.isArray(field.value) && field.value.length === 0)) && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            An empty override clears the image default in Compose. Kubernetes
            may need an explicit executable; select Image default to inherit it.
          </p>
        )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <span role="status" className="sr-only">
        {notice}
      </span>
    </div>
  );
}
