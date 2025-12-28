import type { MetaHTMLAttributes, LinkHTMLAttributes, ScriptHTMLAttributes } from "react";

// Type definitions for helmet (page metadata) system

export type MetaTag = MetaHTMLAttributes<HTMLMetaElement>;
export type LinkTag = LinkHTMLAttributes<HTMLLinkElement>;

// Script tag with optional inline script content
export interface ScriptTag extends Omit<ScriptHTMLAttributes<HTMLScriptElement>, "children"> {
    children?: string;
}

export type StyleValue = string | string[];

// Complete helmet values for page metadata
export interface HelmetValues {
    title: string;
    meta: MetaTag[];
    link: LinkTag[];
    script: ScriptTag[];
    style: StyleValue;
}

// Helmet context value - provides getters and setters for all metadata types
export interface HelmetContextValue {
    title: string;
    setTitle: (title: string) => void;
    meta: MetaTag[];
    setMeta: (meta: MetaTag[]) => void;
    link: LinkTag[];
    setLink: (link: LinkTag[]) => void;
    script: ScriptTag[];
    setScript: (script: ScriptTag[]) => void;
    style: StyleValue;
    setStyle: (style: StyleValue) => void;
}
