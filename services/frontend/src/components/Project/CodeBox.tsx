import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent
} from "react";
import { Check, Copy, Download, Upload } from "lucide-react";
import debounce from "lodash/debounce";
import YAML from "yaml";

import { manifestTypes } from "../../constants";
import type { ManifestSource } from "../../types";
import { generatePayload } from "../../utils/generators";
import { parseManifest, type ManifestImport } from "../../utils/manifests";
import { generateManifest } from "../../services/generate";
import { toaster } from "../../utils";
import CodeEditor from "../CodeEditor";
import { Button } from "../ui/button";
import { SegmentedControl } from "../ui/segmented-control";
import { CanvasConnection } from "../Canvas/graphState";
import { CanvasNodeMap } from "../Canvas/plumbing/synchronizeNodes";
import ManifestSelect from "./ManifestSelect";

interface ICodeBoxProps {
  graphData: {
    connections: CanvasConnection[];
    networks: Record<string, unknown>;
    nodes: CanvasNodeMap;
    manifestSource?: ManifestSource;
  };
  onCodeUpdate: (imported: ManifestImport) => void;
  canEdit?: boolean;
}

type ManifestType = (typeof manifestTypes)[keyof typeof manifestTypes];
type Language = "yaml" | "json";

const CodeBox = ({
  graphData,
  onCodeUpdate,
  canEdit = true
}: ICodeBoxProps) => {
  const skipGeneration = useRef<{
    manifest: ManifestType;
    language: Language;
  } | null>(null);
  const pendingDraft = useRef<{ text: string; language: Language } | null>(
    null
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const fileRequest = useRef(0);
  const [language, setLanguage] = useState<Language>("yaml");
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [manifest, setManifest] = useState<ManifestType>(
    manifestTypes.DOCKER_COMPOSE
  );

  const applyCode = useCallback(
    (text: string, sourceLanguage: Language, replaceSource = false) => {
      if (!canEdit) return false;
      try {
        const imported = parseManifest(text, sourceLanguage);
        skipGeneration.current = {
          manifest: imported.type,
          language: sourceLanguage
        };
        onCodeUpdate({ ...imported, replaceSource });
        pendingDraft.current = null;
        setManifest(imported.type);
        setError("");
        const count = Object.keys(imported.data.services).length;
        setStatus(
          `Graph updated · ${count} ${count === 1 ? "service" : "services"}`
        );
        return true;
      } catch (cause) {
        setError(
          `${(cause as Error).message} The graph still shows the last valid manifest.`
        );
        setStatus("");
        return false;
      }
    },
    [canEdit, onCodeUpdate]
  );

  const debouncedImport = useMemo(() => debounce(applyCode, 400), [applyCode]);

  useEffect(() => {
    const skip = skipGeneration.current;
    skipGeneration.current = null;
    if (skip?.manifest === manifest && skip.language === language) return;
    if (pendingDraft.current) return;
    const timer = window.setTimeout(() => {
      // Edits may arrive after this timer was scheduled.
      if (pendingDraft.current) return;
      const result = generateManifest(generatePayload(graphData), manifest);
      setError(result.error ?? "");
      let nextCode = result.code;
      if (language === "json" && nextCode) {
        const docs = YAML.parseAllDocuments(nextCode).map((document) =>
          document.toJSON()
        );
        nextCode = JSON.stringify(docs.length === 1 ? docs[0] : docs, null, 2);
      }
      setCode(nextCode);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [graphData, manifest, language]);

  useEffect(
    () => () => {
      debouncedImport.cancel();
      fileRequest.current++;
    },
    [debouncedImport]
  );

  const finishDraft = () => {
    debouncedImport.cancel();
    const draft = pendingDraft.current;
    return !draft || applyCode(draft.text, draft.language);
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canEdit) return;
    const request = ++fileRequest.current;
    debouncedImport.cancel();
    try {
      const text = await file.text();
      if (request !== fileRequest.current) return;
      const sourceLanguage = file.name.toLowerCase().endsWith(".json")
        ? "json"
        : "yaml";
      pendingDraft.current = { text, language: sourceLanguage };
      setCode(text);
      skipGeneration.current = { manifest, language: sourceLanguage };
      setLanguage(sourceLanguage);
      applyCode(text, sourceLanguage, true);
    } catch {
      setError(
        "Unable to read this file. Choose a YAML or JSON manifest and try again."
      );
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      toaster("Unable to copy the manifest", "error");
    }
  };

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const download = () => {
    const fileName =
      manifest === manifestTypes.KUBERNETES ? "kubernetes" : "compose";
    const blob = new Blob([code], {
      type: language === "json" ? "application/json" : "application/yaml"
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${fileName}.${language}`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  const warnings = graphData.manifestSource?.warnings ?? [];
  const statusText = status || (canEdit ? "" : "Manifest preview · read only");
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-border bg-background px-2 py-1.5">
        <ManifestSelect
          manifest={manifest}
          setManifest={(next) => {
            if (finishDraft()) {
              setStatus("");
              setManifest(next);
            }
          }}
        />
        <SegmentedControl
          aria-label="Code language"
          value={language}
          onValueChange={(next) => {
            if (finishDraft()) setLanguage(next);
          }}
          options={[
            { value: "yaml", label: "YAML" },
            { value: "json", label: "JSON" }
          ]}
        />
        <div className="ml-auto flex items-center gap-1">
          {canEdit && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept=".yaml,.yml,.json,application/json,application/yaml,text/yaml"
                className="hidden"
                aria-label="Manifest file"
                onChange={importFile}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => fileInput.current?.click()}
                aria-label="Import manifest file"
                title="Import YAML or JSON file"
              >
                <Upload />
                <span>Import</span>
              </Button>
            </>
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={copy}
            disabled={!code}
            aria-label="Copy manifest"
            title="Copy manifest"
          >
            {copied ? <Check /> : <Copy />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={download}
            disabled={!code}
            aria-label="Download manifest"
            title="Download manifest"
          >
            <Download />
          </Button>
        </div>
      </div>
      {(error || statusText || warnings.length > 0) && (
        <div className="shrink-0 space-y-1 border-b px-3 py-2 text-xs text-muted-foreground">
          {error ? (
            <p role="alert" className="break-words text-destructive">
              {error}
            </p>
          ) : statusText ? (
            <p role="status">{statusText}</p>
          ) : null}
          {warnings.length > 0 && (
            <details>
              <summary className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
                Conversion notes ({warnings.length})
              </summary>
              <ul className="mt-2 max-h-32 list-disc space-y-1 overflow-y-auto pl-4 pr-2">
                {warnings.map((warning) => (
                  <li key={warning} className="break-words">
                    {warning}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      <CodeEditor
        data={code}
        language={language}
        onChange={(value: string) => {
          if (!canEdit || value === code) return;
          fileRequest.current++;
          pendingDraft.current = { text: value, language };
          setCode(value);
          setStatus("Updating graph…");
          debouncedImport(value, language);
        }}
        disabled={!canEdit}
        lineWrapping={false}
      />
    </div>
  );
};

export default CodeBox;
