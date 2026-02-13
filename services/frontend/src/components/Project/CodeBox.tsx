import { useEffect, useMemo, useRef, useState } from "react";
import YAML from "yaml";
import { debounce } from "lodash";
import { manifestTypes } from "../../constants";
import { generatePayload } from "../../utils/generators";
import { checkHttpStatus } from "../../services/helpers";
import { generateHttp } from "../../services/generate";
import { toaster } from "../../utils";
import eventBus from "../../events/eventBus";
import CodeEditor from "../CodeEditor";
import useWindowDimensions from "../../hooks/useWindowDimensions";

interface ICodeBoxProps {
  onCodeUpdate: (composeData: unknown) => string;
}

const CodeBox = (props: ICodeBoxProps) => {
  const { onCodeUpdate } = props;
  const versionRef = useRef<string>();
  const manifestRef = useRef<string>();
  const lastGeneratedCodeRef = useRef<string>("");
  const [language, setLanguage] = useState("yaml");
  const [version, setVersion] = useState("latest");
  const [copyText, setCopyText] = useState("Copy");
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [formattedCode, setFormattedCode] = useState<string>("");
  const [manifest] = useState(manifestTypes.DOCKER_COMPOSE);
  const { height } = useWindowDimensions();

  versionRef.current = version;
  manifestRef.current = manifest;

  const getCode = (payload: any, manifest: string) => {
    generateHttp(JSON.stringify(payload), manifest)
      .then(checkHttpStatus)
      .then((data) => {
        if (data["code"]) {
          setGeneratedCode(data["code"]);
        } else {
          setGeneratedCode("");
        }

        if (data["error"]) {
          setGeneratedCode("");
          toaster(`error ${data["error"]}`, "error");
        }
      });
  };

  const debouncedOnGraphUpdate = useMemo(
    () =>
      debounce((payload, manifest) => {
        getCode(payload, manifest);
      }, 600),
    []
  );

  const parseComposeCode = (
    data: string,
    sourceLanguage: string
  ): Record<string, unknown> | null => {
    if (!data.trim()) {
      return null;
    }

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

  const debouncedOnCodeUpdate = useMemo(
    () =>
      debounce((data: string, sourceLanguage: string) => {
        const parsedCompose = parseComposeCode(data, sourceLanguage);

        if (!parsedCompose) {
          return;
        }

        const parsedVersion = onCodeUpdate(parsedCompose);
        if (parsedVersion && parsedVersion !== versionRef.current) {
          setVersion(parsedVersion);
        }
      }, 600),
    [onCodeUpdate]
  );

  const versionChange = (e: any) => {
    setVersion(e.target.value);
  };

  const copy = () => {
    navigator.clipboard.writeText(formattedCode);
    setCopyText("Copied");

    setTimeout(() => {
      setCopyText("Copy");
    }, 300);
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
    eventBus.dispatch("GENERATE", {
      message: {
        id: ""
      }
    });
  }, [version, manifest]);

  useEffect(() => {
    eventBus.on("FETCH_CODE", (data) => {
      const graphData = data.detail.message;
      graphData.version = versionRef.current;
      debouncedOnGraphUpdate(generatePayload(graphData), manifestRef.current);
    });

    return () => {
      eventBus.remove("FETCH_CODE", () => undefined);
    };
  }, []);

  useEffect(() => {
    return () => {
      debouncedOnGraphUpdate.cancel();
      debouncedOnCodeUpdate.cancel();
    };
  }, [debouncedOnCodeUpdate, debouncedOnGraphUpdate]);

  return (
    <>
      <div
        className={`absolute top-0 right-0 z-10 flex p-1 space-x-2 group-hover:visible invisible pointer-events-none`}
      >
        <select
          id="version"
          onChange={versionChange}
          value={version}
          className="input-util w-min pr-8 pointer-events-auto"
        >
          <option value="latest">latest (spec)</option>
          <option value="1">v 1</option>
          <option value="2">v 2</option>
          <option value="3">v 3</option>
        </select>

        <button
          className={`btn-util ${
            language === "json" ? `btn-util-selected` : ``
          } pointer-events-auto`}
          onClick={() => setLanguage("json")}
        >
          json
        </button>
        <button
          className={`btn-util ${
            language === "yaml" ? `btn-util-selected` : ``
          } pointer-events-auto`}
          onClick={() => setLanguage("yaml")}
        >
          yaml
        </button>
        <button
          className="btn-util pointer-events-auto"
          type="button"
          onClick={copy}
        >
          {copyText}
        </button>
      </div>

      <CodeEditor
        data={formattedCode}
        language={language}
        onChange={(value: string) => {
          setFormattedCode(value);

          if (value === lastGeneratedCodeRef.current) {
            return;
          }

          debouncedOnCodeUpdate(value, language);
        }}
        disabled={false}
        lineWrapping={false}
        height={height - 64}
      />
    </>
  );
};

export default CodeBox;
