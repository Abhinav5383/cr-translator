import DialogDemo from "./Settings";

export default function Navbar() {
    return (
        <header class="w-full flex items-center justify-between py-4 px-8 bg-card-background">
            <div class="flex items-center gap-x-2">
                <img src="/icon.png" alt="Logo" class="h-10 w-10" />
                <span class="text-lg-plus font-bold">CR translation tool</span>
            </div>

            <div>
                <DialogDemo />
            </div>
        </header>
    );
}
