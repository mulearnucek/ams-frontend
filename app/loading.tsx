import LoadingScreen from "@/components/loading-screen";

// Root Suspense fallback, and the single owner of the loading screen.
//
// This used to be a bare coloured box, which on any load long enough to be noticed
// just read as a dead screen. React tears this down the instant the segment
// resolves, so the screen is gone as soon as the page is ready - it never sits
// around waiting for its own animation to finish.
export default function Loading() {
    return <LoadingScreen />;
}
