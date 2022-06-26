import { useCallback, useEffect, useState } from "react";
import { EditorView } from '@codemirror/view'
import { EditorState } from "@codemirror/state";
import { Extension } from "@codemirror/state";

export default function useCodeMirror(extensions: Extension[], doc: any) {
    const [element, setElement] = useState<HTMLElement>();

    const ref = useCallback((node: HTMLElement | null) => {
        if (!node) return;

        setElement(node);
    }, []);

    useEffect(() => {
        if (!element) return;

        const view = new EditorView({
            state: EditorState.create({
                doc: doc,
                extensions: [...extensions],
            }),
            parent: element,
        });

        return () => view?.destroy();
    }, [element, extensions, doc]);

    return { ref };
}
