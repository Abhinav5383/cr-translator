import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select";
import { TextField, TextFieldRoot } from "@components/ui/text-field";
import { useSearchParams } from "@solidjs/router";
import ChevronDownIcon from "lucide-solid/icons/chevron-down";
import { createEffect, createResource, createSignal, For, Show } from "solid-js";
import { LoadSettings } from "@/components/layout/Settings";
import { Button } from "@/components/ui/button";
import { FullPageLoading } from "@/components/ui/loading";
import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from "@/components/ui/switch";
import { TextArea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { type Dir, getFilesPerLocale, getLocaleFileContents, getLocales } from "@/utils/gh-api";
import type { Json, JsonObject } from "@/utils/types";
import { loadSelections, NEW_LOCALE_ID, saveSelections } from "./local-db";

const HIDDEN_KEYS = ["$schema"];

const settings = LoadSettings();
const repoPath = () => settings.repoPath;
const langDir = () => settings.langPath;

export function HomePage_Wrapper() {
    const dep = () => ({ repoPath: repoPath(), langDir: langDir() });

    const [locales] = createResource(dep, () => getLocales(repoPath(), langDir()));
    const [localeFiles] = createResource(dep, () => getFilesPerLocale(repoPath(), langDir()));

    return (
        <Show when={locales() && localeFiles()}>
            <HomePage locales={locales()} localeFiles={localeFiles()} />
        </Show>
    );
}

interface HomePageProps {
    locales: Dir[] | undefined;
    localeFiles: Dir[] | undefined;
}

function HomePage(props: HomePageProps) {
    const locales = () => props.locales || [];
    const localeFiles = () => props.localeFiles || [];

    const savedSelections = () => loadSelections();
    const [searchParams, setSearchParams] = useSearchParams();

    const [hideNonEmptyEntries, setHideNonEmptyEntries] = createSignal({
        enabled: false,
        // contains the state the translation when hideNonEmptyEntries was enabled
        // this is needed because any input row will disappear as soon as anything is typed into it
        // if we hide or show on the basis of live updating translation Object
        translationSnapshot: {} as JsonObject,
    });

    if (!locales() || !localeFiles()) {
        return (
            <div class="w-full p-12 flex items-center justify-center">
                <p class="text-md font-bold text-danger-foreground">
                    Unable to fetch locale data from GitHub! Please check the console for error details.
                </p>
            </div>
        );
    }

    const filesNames = () => {
        const list: TranslationFileItem[] = [];
        GetDirectoryFiles(localeFiles(), list);

        return list;
    };

    // File and locale selections
    const selectedLocaleFile = () => {
        if (searchParams.file) return searchParams.file as string;
        return savedSelections().file;
    };
    function setSelectedLocaleFile(file: string) {
        setSearchParams({
            file: file,
        });
    }

    // Selection values
    const selectedRefLocale = () => {
        if (searchParams.ref_locale) return searchParams.ref_locale as string;
        return savedSelections().refLocale;
    };
    function setSelectedRefLocale(locale: string) {
        setSearchParams({
            ref_locale: locale,
        });
    }

    const selectedTranslationLocale = () => {
        if (searchParams.translation_locale) return searchParams.translation_locale as string;
        return savedSelections().translationLocale;
    };
    function setSelectedTranslationLocale(locale: string) {
        setSearchParams({
            translation_locale: locale,
        });
    }

    // Save the selections to local storage when they change
    createEffect(() => {
        saveSelections({
            file: selectedLocaleFile(),
            refLocale: selectedRefLocale(),
            translationLocale: selectedTranslationLocale(),
        });
    });

    // Deps
    const refLocale_deps = () => ({
        langDir: langDir(),
        selectedLocaleFile: selectedLocaleFile(),
        selectedRefLocale: selectedRefLocale(),
    });
    const translationLocale_deps = () => ({
        langDir: langDir(),
        selectedLocaleFile: selectedLocaleFile(),
        selectedTranslationLocale: selectedTranslationLocale(),
    });

    const [refLocale_content] = createResource(refLocale_deps, () => {
        if (!selectedRefLocale() || !selectedLocaleFile()) return;
        return getLocaleFileContents(repoPath(), `${langDir()}/${selectedRefLocale()}/${selectedLocaleFile()}`);
    });

    const [translationLocale_content, { mutate: setTranslationContent }] = createResource(
        translationLocale_deps,
        () => {
            const emptyPromise: Promise<JsonObject> = new Promise((resolve) => resolve({}));
            if (!selectedTranslationLocale() || !selectedLocaleFile()) return emptyPromise;
            if (selectedTranslationLocale() === NEW_LOCALE_ID) return emptyPromise;

            return getLocaleFileContents(
                repoPath(),
                `${langDir()}/${selectedTranslationLocale()}/${selectedLocaleFile()}`,
            );
        },
    );

    function handleTextareaChange(
        e: Event & {
            currentTarget: HTMLTextAreaElement;
        },
    ) {
        const value = e.currentTarget.value;

        try {
            const _translation = JSON.parse(value.replaceAll("\\", "\\\\"));
            setTranslationContent(_translation);
        } catch (e) {
            console.error(e);
            alert("Invalid JSON in the textarea!\nCheck console for the error message.");
        }
    }

    function copyJson() {
        navigator.clipboard.writeText(stringifyJson(translationLocale_content()));
    }

    function downloadJson() {
        const blob = new Blob([stringifyJson(translationLocale_content())], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = selectedLocaleFile();
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <main class="w-full grid grid-cols-[min-content_1fr_1fr] gap-4">
            <div class="grid col-span-full grid-cols-subgrid mt-4">
                {/* File Selector */}
                <div class="flex items-start justify-center flex-col gap-1 text-sm">
                    <label for="select-file" class="text-muted-foreground">
                        Translating
                    </label>
                    <Select
                        id="select-file"
                        title="Select a file"
                        placeholder="Select a file..."
                        itemComponent={(props) => (
                            <SelectItem class="font-mono" item={props.item}>
                                {props.item.rawValue}
                            </SelectItem>
                        )}
                        class="font-mono"
                        disallowEmptySelection={true}
                        defaultValue={filesNames()[0].name}
                        value={selectedLocaleFile()}
                        onChange={(e) => {
                            if (e) setSelectedLocaleFile(e);
                        }}
                        options={filesNames().map((file) => file.name)}
                    >
                        <SelectTrigger class="min-w-[12rem] w-fit">
                            <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                        </SelectTrigger>

                        <SelectContent />
                    </Select>
                </div>

                {/* Ref Locale Selector */}
                <div class="flex items-start justify-center flex-col gap-1 text-sm">
                    <label for="select-ref-locale" class="text-muted-foreground">
                        From
                    </label>
                    <Select
                        id="select-ref-locale"
                        placeholder="Select reference locale"
                        itemComponent={(props) => (
                            <SelectItem class="font-mono" item={props.item}>
                                {props.item.rawValue}
                            </SelectItem>
                        )}
                        class="font-mono"
                        disallowEmptySelection={true}
                        value={selectedRefLocale()}
                        onChange={(e) => {
                            if (e) setSelectedRefLocale(e);
                        }}
                        options={locales().map((locale) => locale.name)}
                    >
                        <SelectTrigger class="min-w-[12rem] w-fit">
                            <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                        </SelectTrigger>

                        <SelectContent />
                    </Select>
                </div>

                {/* Translation locale selector */}
                <div class="flex items-start justify-center flex-col gap-1 text-sm">
                    <label for="translating-to" class="text-muted-foreground">
                        To
                    </label>
                    <Select
                        id="translating-to"
                        title="Translation locale"
                        placeholder="Translation locale"
                        itemComponent={(props) => (
                            <SelectItem class="font-mono" item={props.item}>
                                {props.item.rawValue}
                            </SelectItem>
                        )}
                        class="font-mono"
                        value={selectedTranslationLocale()}
                        onChange={(e) => {
                            if (e) setSelectedTranslationLocale(e);
                        }}
                        options={["New Locale", ...locales().map((locale) => locale.name)]}
                    >
                        <SelectTrigger class="min-w-[12rem] w-fit">
                            <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                        </SelectTrigger>

                        <SelectContent />
                    </Select>
                </div>
            </div>

            <Show
                when={refLocale_content.state === "ready" && translationLocale_content.state === "ready"}
                fallback={
                    <div class="col-span-full">
                        <FullPageLoading />
                    </div>
                }
            >
                <Show
                    when={ObjIsNonEmpty(refLocale_content())}
                    fallback={
                        <div class="col-span-full grid place-items-center py-12">
                            <p class="text-lg text-muted-foreground font-mono text-center">
                                Selected ref locale{" "}
                                <span class="text-foreground bg-card-background rounded-sm px-1">
                                    {selectedRefLocale()}
                                </span>{" "}
                                doesn't have translation available for the file{" "}
                                <span class="text-foreground bg-card-background rounded-sm px-1">
                                    {selectedLocaleFile()}
                                </span>
                            </p>
                        </div>
                    }
                >
                    <div class="col-span-full border-b border-b-shallow-background pb-4">
                        <Switch
                            class="flex items-center space-x-2"
                            checked={hideNonEmptyEntries().enabled}
                            onChange={(checked) => {
                                setHideNonEmptyEntries({
                                    enabled: checked,
                                    translationSnapshot: translationLocale_content() || {},
                                });
                            }}
                        >
                            <SwitchControl>
                                <SwitchThumb />
                            </SwitchControl>
                            <SwitchLabel>Show empty entries only</SwitchLabel>
                        </Switch>
                    </div>

                    <div class="bg-card-background px-6 py-4 rounded-lg grid col-span-full grid-cols-subgrid content-start font-mono gap-x-4 gap-y-2">
                        <NestedInputRow
                            absoluteKey=""
                            valueRefLocale={refLocale_content()}
                            valueTranslated={translationLocale_content()}
                            translationLocale_content={translationLocale_content()}
                            setTranslationContent={setTranslationContent}
                            hideNonEmptyEntries={hideNonEmptyEntries()}
                        />
                    </div>

                    <div class="col-span-full pb-16 flex flex-col gap-4">
                        <TextFieldRoot>
                            <TextArea
                                placeholder="Translated JSON"
                                class="bg-card-background font-mono min-h-[80dvh] text-base"
                                value={stringifyJson(translationLocale_content())}
                                spellcheck={false}
                                onChange={handleTextareaChange}
                            />
                        </TextFieldRoot>

                        <div class="col-span-full flex items-center justify-end gap-3">
                            <Button onClick={downloadJson} title={`Download translated ${selectedLocaleFile()}`}>
                                Download
                            </Button>

                            <Button variant="ghost" onClick={copyJson}>
                                Copy JSON
                            </Button>
                        </div>
                    </div>
                </Show>
            </Show>
        </main>
    );
}

interface NestedInputRowProps {
    absoluteKey: string;
    key?: string;
    valueRefLocale: JsonObject | undefined;
    valueTranslated: JsonObject | undefined;
    depth?: number;

    translationLocale_content: JsonObject | undefined;
    setTranslationContent: (newVal: JsonObject) => void;
    hideNonEmptyEntries: {
        enabled: boolean;
        translationSnapshot: JsonObject;
    };
}

function NestedInputRow(props: NestedInputRowProps) {
    if (props.key && HIDDEN_KEYS.includes(props.key)) return null;

    const depth = () => props.depth || 0;
    const translationLocaleContent = () => props.translationLocale_content;

    if (
        (typeof props.valueRefLocale === "string" || !props.valueRefLocale) &&
        (typeof props.valueTranslated === "string" || !props.valueTranslated)
    ) {
        return (
            <Show
                when={
                    !props.hideNonEmptyEntries.enabled ||
                    !getObjValue(props.hideNonEmptyEntries.translationSnapshot, props.absoluteKey.split("."))
                }
            >
                <InputRow
                    key={`${props.key}`}
                    absoluteKey={props.absoluteKey}
                    valueRaw={props.valueRefLocale || ""}
                    valueTranslated={props.valueTranslated || ""}
                    depth={depth()}
                    translationLocale_content={translationLocaleContent()}
                    setTranslationContent={props.setTranslationContent}
                />
            </Show>
        );
    }

    const [isExpanded, setIsExpanded] = createSignal<boolean>(true);
    const keys_fromRaw = Object.keys(props.valueRefLocale || {});
    const keys_fromTranslated = Object.keys(props.valueTranslated || {});

    const keys = Array.from(new Set(keys_fromRaw.concat(keys_fromTranslated)));

    function toggleExpanded() {
        setIsExpanded(!isExpanded());
    }

    return (
        <>
            <Show when={(props.key?.length || 0) > 0}>
                <button
                    type="button"
                    class={cn(
                        "col-span-full flex items-center justify-start p-1.5 gap-2 cursor-pointer hover:bg-shallow-background/50 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-extra-muted-foreground",
                        !isExpanded() && "bg-shallow-background/25",
                    )}
                    onClick={toggleExpanded}
                    onKeyPress={(e) => {
                        if (e.key === "Enter") {
                            toggleExpanded();
                        }
                    }}
                >
                    <ChevronDownIcon
                        class={cn(
                            "h-5 w-5 text-muted-foreground inline",
                            isExpanded() ? "transform rotate-180" : "transform rotate-0",
                        )}
                    />
                    {props.key}
                </button>
            </Show>

            <Show when={isExpanded()}>
                <div
                    class="grid col-span-full grid-cols-subgrid content-start font-mono gap-x-4 gap-y-2"
                    style={{
                        "padding-bottom": depth() === 0 ? "0" : "0.5rem",
                    }}
                >
                    <For each={keys}>
                        {(key) => {
                            const absoluteKey = !props.absoluteKey ? key : `${props.absoluteKey}.${key}`;

                            return (
                                <NestedInputRow
                                    key={key}
                                    valueRefLocale={props.valueRefLocale?.[key] as JsonObject}
                                    valueTranslated={props.valueTranslated?.[key] as JsonObject}
                                    depth={depth() + 1}
                                    absoluteKey={absoluteKey}
                                    translationLocale_content={translationLocaleContent()}
                                    hideNonEmptyEntries={props.hideNonEmptyEntries}
                                    setTranslationContent={props.setTranslationContent}
                                />
                            );
                        }}
                    </For>
                </div>
            </Show>
        </>
    );
}

interface InputRowProps {
    key: string;
    absoluteKey: string;
    valueRaw: string | undefined;
    valueTranslated: string | undefined;
    depth: number;

    translationLocale_content: JsonObject | undefined;
    setTranslationContent: (newVal: JsonObject) => void;
}

function InputRow(props: InputRowProps) {
    const depth = () => props.depth;
    const translationLocaleContent = () => props.translationLocale_content;

    function UpdateTranslation(e: { currentTarget: EventTarget & HTMLInputElement }) {
        const value = e.currentTarget.value;

        const _translation = updateObject(
            translationLocaleContent() as JsonObject,
            props.absoluteKey.split("."),
            value,
        );
        props.setTranslationContent(_translation);
    }

    return (
        <TextFieldRoot
            class="grid grid-cols-subgrid col-span-full items-center gap-4 py-0.5"
            style={{
                "padding-left": depth() > 1 ? `${(depth() - 1) * 2}rem` : undefined,
            }}
        >
            <label class="text-muted-foreground" for={`input-${props.absoluteKey}`}>
                {props.key}
            </label>

            <TextField value={props.valueRaw || ""} readOnly class="m-0" tabIndex={-1} />

            <TextField
                id={`input-${props.absoluteKey}`}
                spellcheck={false}
                value={props.valueTranslated || ""}
                onInput={UpdateTranslation}
                // tabIndex={props.valueTranslated ? -1 : undefined}
            />
        </TextFieldRoot>
    );
}

interface TranslationFileItem {
    name: string;
    path: string;
}

function GetDirectoryFiles(dirs: Dir[], list: TranslationFileItem[], parent = "") {
    for (let i = 0; i < dirs.length; i++) {
        const dir = dirs[i];
        if (dir.type === "file") {
            let fileName = dir.name;
            if (parent.length) fileName = `${parent}${dir.name}`;

            list.push({ name: fileName, path: parent + dir.name });
        }

        if (dir.files) {
            GetDirectoryFiles(dir.files, list, `${parent}${dir.name}/`);
        }
    }
}

function updateObject(srcObj: JsonObject, targetKey: string[], value: Json, removeKeyOnFalsyVal = true): JsonObject {
    const obj = { ...srcObj };

    if (!targetKey.length) return obj;
    if (!value && removeKeyOnFalsyVal) {
        delete obj[targetKey[0]];
        return obj;
    }

    if (targetKey.length === 1) {
        obj[targetKey[0]] = value;
    } else {
        obj[targetKey[0]] = updateObject(obj[targetKey[0]] as JsonObject, targetKey.slice(1), value);
    }

    return obj;
}

function getObjValue(obj: JsonObject, keys: string[]) {
    if (!keys.length) return obj;

    const val = keys[0].length ? obj[keys[0]] : obj;

    if (keys.length === 1) return val;
    else if (typeof val === "object") {
        return getObjValue(val as JsonObject, keys.slice(1));
    } else {
        return null;
    }
}

function ObjIsNonEmpty(obj: JsonObject | undefined) {
    if (!obj) return false;

    try {
        return Object.keys(obj).length > 0;
    } catch {
        return false;
    }
}

function stringifyJson(json: Json | undefined) {
    return JSON.stringify(json, null, 4).replaceAll("\\\\", "\\");
}
