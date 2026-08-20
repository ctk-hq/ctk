import { lazy, Suspense } from "react";

const Editor = lazy(() => import("@monaco-editor/react"));

interface ICodeEditorProps {
  data: string;
  language: string;
  onChange: any;
  disabled: boolean;
  lineWrapping: boolean;
  height: number;
}

const CodeEditor = (props: ICodeEditorProps) => {
  const { data, language, onChange, disabled, lineWrapping, height } = props;
  const supportedLanguage = language === "json" || language === "yaml";
  const monacoLanguage = supportedLanguage ? language : "plaintext";

  return (
    <div className="overflow-hidden" style={{ height }}>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center bg-slate-950 text-xs text-slate-500">
            Loading editor…
          </div>
        }
      >
        <Editor
          height={height}
          defaultLanguage={monacoLanguage}
          language={monacoLanguage}
          value={data}
          theme="vs-dark"
          onChange={(value) => onChange(value ?? "")}
          options={{
            readOnly: disabled,
            minimap: { enabled: false },
            wordWrap: lineWrapping ? "on" : "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2
          }}
        />
      </Suspense>
    </div>
  );
};

export default CodeEditor;
