import { lazy, Suspense } from "react";
import { useTheme } from "@/hooks/useTheme";

const Editor = lazy(() => import("@monaco-editor/react"));

interface ICodeEditorProps {
  data: string;
  language: string;
  onChange: any;
  disabled: boolean;
  lineWrapping: boolean;
}

const CodeEditor = (props: ICodeEditorProps) => {
  const { isDark } = useTheme();
  const { data, language, onChange, disabled, lineWrapping } = props;
  const supportedLanguage = language === "json" || language === "yaml";
  const monacoLanguage = supportedLanguage ? language : "plaintext";

  return (
    <div className="h-full min-h-0 flex-1 overflow-hidden">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center bg-background text-xs text-muted-foreground">
            Loading editor…
          </div>
        }
      >
        <Editor
          height="100%"
          defaultLanguage={monacoLanguage}
          language={monacoLanguage}
          value={data}
          theme={isDark ? "vs-dark" : "vs"}
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
