import { StreamLanguage } from "@codemirror/stream-parser";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  keymap,
} from '@codemirror/view'
import { jsonLanguage } from "@codemirror/lang-json";
import { yaml } from "@codemirror/legacy-modes/mode/yaml";

import { history, historyKeymap } from '@codemirror/history'
import { foldGutter, foldKeymap } from '@codemirror/fold'
import { bracketMatching } from '@codemirror/matchbrackets'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/closebrackets'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { rectangularSelection } from '@codemirror/rectangular-selection'
import { commentKeymap } from '@codemirror/comment'
import { lintKeymap } from '@codemirror/lint'
import { indentOnInput, LanguageSupport } from '@codemirror/language'
import { lineNumbers } from '@codemirror/gutter';
import { defaultKeymap, indentMore, indentLess } from '@codemirror/commands'
import { defaultHighlightStyle } from '@codemirror/highlight'
import { solarizedDark } from './themes/ui/dark'
import darkHighlightStyle from './themes/highlight/dark'
import useCodeMirror from "./useCodeMirror";


interface ICodeEditorProps {
  data: string;
  language: string;
  onChange: any;
  disabled: boolean;
  lineWrapping: boolean;
  height: number
}

const languageExtensions: any = {
  json: [new LanguageSupport(jsonLanguage)],
  yaml: [StreamLanguage.define(yaml)],
  blank: undefined
}

const themeExtensions = {
  light: [defaultHighlightStyle],
  dark: [solarizedDark]
}

const highlightExtensions = {
  dark: darkHighlightStyle
}

const CodeEditor = (props: ICodeEditorProps) => {
  const { data, language, onChange, disabled, lineWrapping, height } = props;
  const extensions = [[
    lineNumbers(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    ...(languageExtensions[language]
      ? languageExtensions[language]
      : []),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...commentKeymap,
      ...completionKeymap,
      ...lintKeymap,
      {
        key: "Tab",
        preventDefault: true,
        run: indentMore,
      },
      {
        key: "Shift-Tab",
        preventDefault: true,
        run: indentLess,
      },
      /*{
        key: "Ctrl-S",
        preventDefault: true,
        run: indentLess,
      }*/
    ]),
    EditorView.updateListener.of((update) => {
      if (update.changes) {
        onChange(update.state.doc.toString());
      }
    }),
    EditorState.allowMultipleSelections.of(true),
    ...(disabled
      ? [EditorState.readOnly.of(true)]
      : [EditorState.readOnly.of(false)]),
    ...(lineWrapping
      ? [EditorView.lineWrapping]
      : []),
    ...[themeExtensions["dark"]],
    ...[highlightExtensions["dark"]]
  ]];

  const { ref } = useCodeMirror(extensions, data);

  return (
    <div className={`overflow-y-auto py-2`} style={{ height: height }} ref={ref}>
    </div>
  )
}

export default CodeEditor;
