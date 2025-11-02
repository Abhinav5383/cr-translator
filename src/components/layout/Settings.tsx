import type { DialogTriggerProps } from "@kobalte/core/dialog";
import { Button } from "@components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@components/ui/dialog";
import { TextField, TextFieldLabel, TextFieldRoot } from "@components/ui/text-field";
import { RotateCcwIcon, SaveIcon, SettingsIcon } from "lucide-solid";
import { createSignal } from "solid-js";

export default function DialogDemo() {
    const settings = LoadSettings();

    const [repoPath, setRepoPath] = createSignal(settings.repoPath);
    const [langPath, setLangPath] = createSignal(settings.langPath);

    function SaveSettings() {
        const obj = {
            repoPath: repoPath(),
            langPath: langPath(),
        };

        localStorage.setItem("settings", JSON.stringify(obj));
        window.location.reload();
    }

    function ResetSettings() {
        localStorage.removeItem("settings");
        window.location.reload();
    }

    return (
        <Dialog>
            <DialogTrigger
                as={(props: DialogTriggerProps) => (
                    <Button variant={"ghost"} size={"icon"} title="Settings" {...props}>
                        <SettingsIcon class="w-5 h-5" />
                    </Button>
                )}
            />
            <DialogContent class="sm:max-w-[42rem]">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                </DialogHeader>
                <div class="grid gap-4 py-4">
                    <TextFieldRoot class="grid grid-cols-1 items-center">
                        <TextFieldLabel class="text-muted-foreground">Repo path</TextFieldLabel>
                        <TextField
                            class="font-mono"
                            value={repoPath()}
                            onInput={(e) => setRepoPath(e.currentTarget.value)}
                            spellcheck={false}
                        />
                    </TextFieldRoot>
                    <TextFieldRoot class="grid grid-cols-1 items-center">
                        <TextFieldLabel class="text-muted-foreground">Locale folder</TextFieldLabel>
                        <TextField
                            class="font-mono"
                            value={langPath()}
                            onInput={(e) => setLangPath(e.currentTarget.value)}
                            spellcheck={false}
                        />
                    </TextFieldRoot>
                </div>
                <DialogFooter>
                    <Button type="submit" variant="ghost" onClick={ResetSettings}>
                        <RotateCcwIcon class="w-4 h-4" />
                        Restore defaults
                    </Button>

                    <Button type="submit" variant="default" onClick={SaveSettings}>
                        <SaveIcon class="w-4 h-4" />
                        Save changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function LoadSettings(): SettingsObj {
    try {
        const settings = localStorage.getItem("settings");
        if (settings) {
            const obj = JSON.parse(settings);
            return obj;
        }
    } catch (error) {
        console.error(error);
    }

    return {
        repoPath: "FinalForEach/Cosmic-Reach-Localization/tree/master",
        langPath: "assets/base/lang",
    };
}

interface SettingsObj {
    repoPath: string;
    langPath: string;
}
