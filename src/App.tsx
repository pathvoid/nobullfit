import HelmetProvider from "@core/contexts/HelmetContext";
import { AuthProvider } from "@core/contexts/AuthContext";
import { Toaster } from "sonner";
import type { HelmetValues } from "./types/helmet";

interface AppProps extends React.PropsWithChildren {
	onHelmetChange?: (helmet: HelmetValues) => void;
}

// Root App component - provides Helmet and Auth contexts for managing page metadata and authentication
function App(props: AppProps) {
	return (
		<>
			<HelmetProvider onHelmetChange={props.onHelmetChange}>
				<AuthProvider>
					{props.children}
					<Toaster
						position="bottom-right"
						closeButton
						theme="dark"
						toastOptions={{
							style: {
								background: "rgb(39 39 42)", // zinc-800
								border: "1px solid rgb(63 63 70)", // zinc-700
								color: "rgb(250 250 250)" // zinc-50
							},
							classNames: {
								success: "!bg-blue-600 !border-blue-500 !text-white",
								error: "!bg-red-600 !border-red-500 !text-white",
								actionButton: "!bg-white !text-zinc-900"
							}
						}}
					/>
				</AuthProvider>
			</HelmetProvider>
		</>
	);
}

export default App;
