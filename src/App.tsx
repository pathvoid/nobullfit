import HelmetProvider from "@core/contexts/HelmetContext";
import { AuthProvider } from "@core/contexts/AuthContext";
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
				</AuthProvider>
			</HelmetProvider>
		</>
	);
}

export default App;
