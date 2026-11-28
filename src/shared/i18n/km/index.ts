import app from "./app";
import editor from "./editor";
import messages from "./messages";
import pages from "./pages";

// The Khmer interface: one file per part of the app (so they can be written side by side), merged here.
export const km: Record<string, string> = { ...app, ...editor, ...pages, ...messages };
