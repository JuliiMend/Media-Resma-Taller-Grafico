"use client";

import dynamic from "next/dynamic";

// The app relies on browser-only state (localStorage session, react-router), so it renders on the client only.
const App = dynamic(() => import("../src/App"), { ssr: false });

export function ClientApp() {
  return <App />;
}
