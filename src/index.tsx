import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import App from "./App";
import routes from "@core/routes";

import "@assets/styles/tailwind.css";
import "@assets/styles/index.scss";

// Create browser router for client-side navigation
const router = createBrowserRouter(routes);

// Hydrate SSR-rendered HTML with React (client-side entry point)
ReactDOM.hydrateRoot(
	document.getElementById("app") as HTMLElement,
	<App>
		<RouterProvider router={router} fallbackElement={null} />
	</App>
);
