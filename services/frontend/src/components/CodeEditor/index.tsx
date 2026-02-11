import Editor from "@monaco-editor/react";

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
    <div className="overflow-y-auto py-2" style={{ height }}>
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
    </div>
  );
};

export default CodeEditor;
