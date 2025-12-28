import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// ScrollToTop component - scrolls to top of page on route change
const ScrollToTop: React.FC = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // Scroll to top when pathname changes
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

export default ScrollToTop;
