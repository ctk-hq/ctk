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
import useWindowDimensions from "../../hooks/useWindowDimensions";
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
  const { height } = useWindowDimensions();

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

  const editorHeight = Math.max(height - 116, 240);
  const isCompose = manifest === manifestTypes.DOCKER_COMPOSE;

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900 px-2 py-1.5">
        <ManifestSelect manifest={manifest} setManifest={setManifest} />

        <div className="ml-auto flex items-center gap-1">
          <div className="flex rounded-md bg-slate-800 p-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={language === "yaml"}
              className={
                language === "yaml"
                  ? "h-7 bg-slate-700 px-2 text-white hover:bg-slate-700"
                  : "h-7 px-2 text-slate-400 hover:bg-slate-700 hover:text-white"
              }
              onClick={() => setLanguage("yaml")}
            >
              YAML
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={language === "json"}
              className={
                language === "json"
                  ? "h-7 bg-slate-700 px-2 text-white hover:bg-slate-700"
                  : "h-7 px-2 text-slate-400 hover:bg-slate-700 hover:text-white"
              }
              onClick={() => setLanguage("json")}
            >
              JSON
            </Button>
          </div>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-300 hover:bg-slate-800 hover:text-white"
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
            className="h-8 w-8 text-slate-300 hover:bg-slate-800 hover:text-white"
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
        height={editorHeight}
      />
    </div>
  );
};

export default CodeBox;
