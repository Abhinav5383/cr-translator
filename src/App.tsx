import { Suspense } from "solid-js";
import Navbar from "./components/layout/Navbar";
import { FullPageLoading } from "./components/ui/loading";
import { HomePage_Wrapper } from "./pages/Home";

export default function App() {
    return (
        <div class="w-full min-h-[100vh] relative grid grid-rows-[auto_1fr_auto] bg-background">
            <Navbar />

            <div class="full_page container px-4 sm:px-8">
                <Suspense fallback={<FullPageLoading />}>
                    <HomePage_Wrapper />
                </Suspense>
            </div>

            <footer> </footer>
        </div>
    );
}
