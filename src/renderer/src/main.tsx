import "./styles.css";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { followUiLanguage, useUiLanguage } from "./lib/i18n";
import { platform } from "./lib/platform";

// The title bar and a few styles differ per system (window buttons on the left on a Mac, on the right elsewhere).
document.documentElement.dataset.platform = platform;

/** The app, drawn again when the interface language changes (your project and the open page stay: they're in stores). */
function Root() {
	const language = useUiLanguage((s) => s.language);
	useEffect(() => followUiLanguage(), []);
	return <App key={language} />;
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Root />
	</StrictMode>,
);
