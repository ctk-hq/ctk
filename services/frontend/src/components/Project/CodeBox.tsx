import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import debounce from "lodash/debounce";
import YAML from "yaml";

import { manifestTypes } from "../../constants";
import { generatePayload } from "../../utils/generators";
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
  };
  onCodeUpdate: (composeData: unknown) => void;
}

type ManifestType = (typeof manifestTypes)[keyof typeof manifestTypes];

const parseComposeCode = (
  data: string,
  sourceLanguage: string
): Record<string, unknown> | null => {
  if (!data.trim()) return null;

  try {
    const parsed =
      sourceLanguage === "json" ? JSON.parse(data) : YAML.parse(data);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0]?.constructor === Object ? parsed[0] : null;
    }

    return parsed?.constructor === Object ? parsed : null;
  } catch {
    return null;
  }
};

const CodeBox = ({ graphData, onCodeUpdate }: ICodeBoxProps) => {
  const codeDrivenGraphUpdateRef = useRef(false);
  const lastGeneratedCodeRef = useRef("");
  const [language, setLanguage] = useState<"yaml" | "json">("yaml");
  const [copied, setCopied] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [formattedCode, setFormattedCode] = useState("");
  const [manifest, setManifest] = useState<ManifestType>(
    manifestTypes.DOCKER_COMPOSE
  );

  const getCode = useCallback(
    (payload: ReturnType<typeof generatePayload>, type: ManifestType) => {
      const result = generateManifest(payload, type);

      if (result.error) {
        setGeneratedCode("");
        toaster(`Error: ${result.error}`, "error");
        return;
      }

      setGeneratedCode(result.code);
    },
    []
  );

  const debouncedOnGraphUpdate = useMemo(
    () =>
      debounce(
        (payload: ReturnType<typeof generatePayload>, type: ManifestType) => {
          getCode(payload, type);
        },
        250
      ),
    [getCode]
  );

  const debouncedOnCodeUpdate = useMemo(
    () =>
      debounce((data: string, sourceLanguage: string) => {
        const parsedCompose = parseComposeCode(data, sourceLanguage);

        if (!parsedCompose) {
          return;
        }

        codeDrivenGraphUpdateRef.current = true;
        onCodeUpdate(parsedCompose);
      }, 400),
    [onCodeUpdate]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formattedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toaster("Unable to copy the manifest", "error");
    }
  };

  const download = () => {
    const fileName =
      manifest === manifestTypes.KUBERNETES
        ? "kubernetes.yaml"
        : "compose.yaml";
    const blob = new Blob([formattedCode], { type: "application/yaml" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  useEffect(() => {
    if (language === "json") {
      try {
        const docs = YAML.parseAllDocuments(generatedCode).map((doc) =>
          doc.toJSON()
        );
        const jsonValue = docs.length <= 1 ? docs[0] || {} : docs;
        const nextCode = JSON.stringify(jsonValue, null, 2);
        lastGeneratedCodeRef.current = nextCode;
        setFormattedCode(nextCode);
      } catch {
        lastGeneratedCodeRef.current = generatedCode;
        setFormattedCode(generatedCode);
      }
      return;
    }

    lastGeneratedCodeRef.current = generatedCode;
    setFormattedCode(generatedCode);
  }, [language, generatedCode]);

  useEffect(() => {
    if (codeDrivenGraphUpdateRef.current) {
      codeDrivenGraphUpdateRef.current = false;
      return;
    }

    debouncedOnGraphUpdate(generatePayload(graphData), manifest);
  }, [debouncedOnGraphUpdate, graphData, manifest]);

  useEffect(
    () => () => {
      debouncedOnGraphUpdate.cancel();
      debouncedOnCodeUpdate.cancel();
    },
    [debouncedOnCodeUpdate, debouncedOnGraphUpdate]
  );

  const isCompose = manifest === manifestTypes.DOCKER_COMPOSE;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-border bg-background px-2 py-1.5">
        <ManifestSelect manifest={manifest} setManifest={setManifest} />

        <SegmentedControl
          aria-label="Code language"
          value={language}
          onValueChange={setLanguage}
          options={[
            { value: "yaml", label: "YAML" },
            { value: "json", label: "JSON" }
          ]}
        />

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={copy}
            disabled={!formattedCode}
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
            disabled={!formattedCode}
            aria-label="Download manifest"
            title="Download manifest"
          >
            <Download />
          </Button>
        </div>
      </div>

      <CodeEditor
        data={formattedCode}
        language={language}
        onChange={(value: string) => {
          setFormattedCode(value);

          if (!isCompose || value === lastGeneratedCodeRef.current) {
            return;
          }

          debouncedOnCodeUpdate(value, language);
        }}
        disabled={!isCompose}
        lineWrapping={false}
      />
    </div>
  );
};

export default CodeBox;
