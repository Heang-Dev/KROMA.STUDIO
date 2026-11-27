import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { platform } from "./lib/platform";

// The title bar and a few styles differ per system (window buttons on the left on a Mac, on the right elsewhere).
document.documentElement.dataset.platform = platform;

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
