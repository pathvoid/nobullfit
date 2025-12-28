import { helmetContext } from "@core/contexts/HelmetContext";
import { useContext } from "react";
import type { HelmetContextValue } from "../types/helmet";

// Hook to access and update page metadata (title, meta tags, etc.)
const useHelmet = (): HelmetContextValue => {
    return useContext(helmetContext);
};

export default useHelmet;