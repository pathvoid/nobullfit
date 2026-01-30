declare module '*.svg' {
    const content: string;
    export default content;
}

declare module 'react-hotkeys-hook' {
    import { DependencyList, RefObject } from 'react';

    export interface Options {
        enabled?: boolean | ((event: KeyboardEvent) => boolean);
        enableOnFormTags?: boolean | string[];
        enableOnContentEditable?: boolean;
        combinationKey?: string;
        splitKey?: string;
        scopes?: string | string[];
        keyup?: boolean;
        keydown?: boolean;
        preventDefault?: boolean | ((event: KeyboardEvent) => boolean);
        description?: string;
    }

    export interface HotkeysEvent {
        key: string;
        keys: string[];
        ctrl: boolean;
        alt: boolean;
        shift: boolean;
        meta: boolean;
    }

    export function useHotkeys<T extends HTMLElement = HTMLElement>(
        keys: string | string[],
        callback: (event: KeyboardEvent, handler: HotkeysEvent) => void,
        options?: Options | DependencyList,
        deps?: DependencyList
    ): RefObject<T>;

    export function isHotkeyPressed(keys: string | string[], splitKey?: string): boolean;
}