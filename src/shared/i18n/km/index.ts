import app from "./app";
import editor from "./editor";
import messages from "./messages";
import pages from "./pages";
import shared from "./shared";

// The Khmer interface: one file per part of the app (so they can be written side by side), merged here. Texts used in
// several parts are decided once in ./shared, which wins.
export const km: Record<string, string> = { ...app, ...editor, ...pages, ...messages, ...shared };

/** The area files, for the test that they never disagree (outside ./shared). */
export const kmAreas: Record<string, Record<string, string>> = { app, editor, pages, messages };
export const kmShared = shared;
