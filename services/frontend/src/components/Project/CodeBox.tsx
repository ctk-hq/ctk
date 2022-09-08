import { useEffect, useMemo, useRef, useState } from "react";
import YAML from "yaml";
import { debounce } from "lodash";
import { manifestTypes } from "../../constants";
import { generatePayload } from "../../utils/generators";
import { checkHttpStatus } from "../../services/helpers";
import { generateHttp } from "../../services/generate";
import { toaster } from "../../utils";
import eventBus from "../../events/eventBus";
import ManifestSelect from "./ManifestSelect";
import CodeEditor from "../CodeEditor";
import useWindowDimensions from "../../hooks/useWindowDimensions";

const CodeBox = () => {
  const versionRef = useRef<string>();
  const manifestRef = useRef<string>();
  const [language, setLanguage] = useState("yaml");
  const [version, setVersion] = useState("3");
  const [copyText, setCopyText] = useState("Copy");
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [formattedCode, setFormattedCode] = useState<string>("");
  const [manifest, setManifest] = useState(manifestTypes.DOCKER_COMPOSE);
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
      setFormattedCode(
        JSON.stringify(YAML.parseAllDocuments(generatedCode), null, 2)
      );
    }

    if (language === "yaml") {
      setFormattedCode(generatedCode);
    }
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

  return (
    <>
      <div
        className={`absolute top-0 left-0 right-0 z-10 flex justify-end p-1 space-x-2 group-hover:visible invisible`}
      >
        <select
          id="version"
          onChange={versionChange}
          value={version}
          className="input-util w-min pr-8"
        >
          <option value="1">v 1</option>
          <option value="2">v 2</option>
          <option value="3">v 3</option>
        </select>

        <button
          className={`btn-util ${
            language === "json" ? `btn-util-selected` : ``
          }`}
          onClick={() => setLanguage("json")}
        >
          json
        </button>
        <button
          className={`btn-util ${
            language === "yaml" ? `btn-util-selected` : ``
          }`}
          onClick={() => setLanguage("yaml")}
        >
          yaml
        </button>
        <button className="btn-util" type="button" onClick={copy}>
          {copyText}
        </button>
      </div>

      <div
        className={`absolute top-10 left-0 right-0 z-10 flex justify-end p-1 space-x-2 group-hover:visible invisible`}
      >
        <ManifestSelect setManifest={setManifest} />
      </div>

      <CodeEditor
        data={formattedCode}
        language={language}
        onChange={() => {
          return;
        }}
        disabled={true}
        lineWrapping={false}
        height={height - 64}
      />
    </>
  );
};

export default CodeBox;
