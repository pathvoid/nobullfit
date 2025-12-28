import React, { useState, useRef } from "react";
import type { HelmetValues, HelmetContextValue, MetaTag, LinkTag, ScriptTag, StyleValue } from "../../types/helmet";

const helmetContext = React.createContext<HelmetContextValue>({
    title: "",
    setTitle: () => {},
    meta: [],
    setMeta: () => {},
    link: [],
    setLink: () => {},
    script: [],
    setScript: () => {},
    style: "",
    setStyle: () => {}
});

interface HelmetProviderProps extends React.PropsWithChildren {
    onHelmetChange?: (helmet: HelmetValues) => void;
}

const HelmetProvider = (props: HelmetProviderProps) => {
    // Use refs to store values for SSR - refs update synchronously during renderToString
    // This allows components to set helmet values during SSR render
    const titleRef = useRef<string>("NoBullFit");
    const metaRef = useRef<MetaTag[]>([]);
    const linkRef = useRef<LinkTag[]>([]);
    const scriptRef = useRef<ScriptTag[]>([]);
    const styleRef = useRef<StyleValue>("");

    // State for client-side reactivity (updates DOM when values change)
    const [title, setTitleState] = useState<string>("NoBullFit");
    const [meta, setMetaState] = useState<MetaTag[]>([]);
    const [link, setLinkState] = useState<LinkTag[]>([]);
    const [script, setScriptState] = useState<ScriptTag[]>([]);
    const [style, setStyleState] = useState<StyleValue>("");

    // Wrapper functions that update refs synchronously (for SSR) and defer state updates (for client-side)
    // This avoids React warnings about updating state during render
    const setTitle = React.useCallback((newTitle: string) => {
        titleRef.current = newTitle;
        // Defer state update to avoid "Cannot update component during render" warning
        setTimeout(() => setTitleState(newTitle), 0);
    }, []);

    const setMeta = React.useCallback((newMeta: MetaTag[]) => {
        metaRef.current = newMeta;
        // Defer state update to avoid "Cannot update component during render" warning
        setTimeout(() => setMetaState(newMeta), 0);
    }, []);

    const setLink = React.useCallback((newLink: LinkTag[]) => {
        linkRef.current = newLink;
        setLinkState(newLink);
    }, []);

    const setScript = React.useCallback((newScript: ScriptTag[]) => {
        scriptRef.current = newScript;
        setScriptState(newScript);
    }, []);

    const setStyle = React.useCallback((newStyle: StyleValue) => {
        styleRef.current = newStyle;
        setStyleState(newStyle);
    }, []);

    // Wrapper component that calls callback after children render
    // This ensures helmet values are captured after all child components have set them
    const CallbackWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        const renderedChildren = <>{children}</>;
        
        // Call callback with current ref values (updated by children during render)
        // In SSR, renderToString is synchronous, so refs are updated before this executes
        if (props.onHelmetChange) {
            props.onHelmetChange({
                title: titleRef.current,
                meta: metaRef.current,
                link: linkRef.current,
                script: scriptRef.current,
                style: styleRef.current
            });
        }
        
        return renderedChildren;
    };

    return (
        <helmetContext.Provider
            value={{ title, setTitle, meta, setMeta, link, setLink, script, setScript, style, setStyle }}>
            {/* Render helmet tags in DOM for client-side updates */}
            {title && <title>{title}</title>}
            {meta && meta.map((m: MetaTag, i: number) => <meta key={i} {...m} />)}
            {link && link.map((l: LinkTag, i: number) => <link key={i} {...l} />)}
            {script && script.map((s: ScriptTag, i: number) => <script key={i} {...s} />)}
            {style && typeof style === "string" && <style>{style}</style>}
            {style && Array.isArray(style) && style.map((s: string, i: number) => <style key={i}>{s}</style>)}
            {/* Wrap children to capture helmet values after render */}
            <CallbackWrapper>{props.children}</CallbackWrapper>
        </helmetContext.Provider>
    );
};

export { helmetContext };
export default HelmetProvider;
