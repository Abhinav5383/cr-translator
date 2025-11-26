import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select";
import { TextField, TextFieldRoot } from "@components/ui/text-field";
import { useSearchParams } from "@solidjs/router";
import ChevronDownIcon from "lucide-solid/icons/chevron-down";
import { createEffect, createResource, createSignal, For, Show } from "solid-js";
import { LoadSettings } from "@/components/layout/Settings";
import { Button } from "@/components/ui/button";
import { FullPageLoading } from "@/components/ui/loading";
import { TextArea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { type Dir, getFilesPerLocale, getLocaleFileContents, getLocales } from "@/utils/gh-api";
import type { Json, JsonObject } from "@/utils/types";
import { loadSelections, NEW_LOCALE_ID, saveSelections } from "./local-db";

const settings = LoadSettings();
const repoPath = () => settings.repoPath;
const langDir = () => settings.langPath;

const [translation, setTranslation] = createSignal<Json>({});

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

    const savedSelections = () => loadSelections();
    const [searchParams, setSearchParams] = useSearchParams();

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

    const [translationLocale_content] = createResource(translationLocale_deps, () => {
        const emptyPromise: Promise<JsonObject> = new Promise((resolve) => resolve({}));
        if (!selectedTranslationLocale() || !selectedLocaleFile()) return emptyPromise;
        if (selectedTranslationLocale() === NEW_LOCALE_ID) return emptyPromise;

        return getLocaleFileContents(repoPath(), `${langDir()}/${selectedTranslationLocale()}/${selectedLocaleFile()}`);
    });

    createEffect(() => {
        setTranslation(translationLocale_content() || {});
    });

    function handleTextareaChange(
        e: Event & {
            currentTarget: HTMLTextAreaElement;
        },
    ) {
        const value = e.currentTarget.value;

        try {
            const _translation = JSON.parse(value);
            console.log(_translation);
            setTranslation(_translation);
        } catch (e) {
            console.error(e);
            alert("Invalid JSON in the textarea!\nCheck console for the error message.");
        }
    }

    function copyJson() {
        navigator.clipboard.writeText(stringifyJson(translation()));
    }

    function downloadJson() {
        const blob = new Blob([stringifyJson(translation())], {
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
            <div class="grid col-span-full grid-cols-subgrid border-b border-b-shallow-background pb-4 my-4">
                {/* File Selector */}
                <div class="flex items-start justify-center flex-col gap-1 text-sm">
                    <label for="select-file" class="font-mono text-muted-foreground">
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
                    <label for="select-ref-locale" class="font-mono text-muted-foreground">
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
                    <label for="translating-to" class="font-mono text-muted-foreground">
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
                    when={ObjHasValues(refLocale_content())}
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
                    <div class="bg-card-background px-6 py-4 rounded-lg grid col-span-full grid-cols-subgrid content-start font-mono gap-x-4 gap-y-2">
                        <NestedInputRow
                            absoluteKey=""
                            valueRaw={refLocale_content()}
                            valueTranslated={translationLocale_content()}
                        />
                    </div>

                    <div class="col-span-full pb-16 flex flex-col gap-4">
                        <TextFieldRoot class="">
                            <TextArea
                                placeholder="Translated JSON"
                                class="bg-card-background font-mono min-h-[80dvh] text-base"
                                value={stringifyJson(translation())}
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
    valueRaw: JsonObject | undefined;
    valueTranslated: JsonObject | undefined;
    depth?: number;
}

function NestedInputRow(props: NestedInputRowProps) {
    if (props.key && ["$schema"].includes(props.key)) return null;

    const depth = () => props.depth || 0;

    if (typeof props.valueRaw !== "object" || Array.isArray(props.valueRaw) || Array.isArray(props.valueTranslated)) {
        return (
            <InputRow
                key={`${props.key}`}
                absoluteKey={props.absoluteKey}
                valueRaw={props.valueRaw || ""}
                valueTranslated={props.valueTranslated || ""}
                depth={depth()}
            />
        );
    }

    const [isExpanded, setIsExpanded] = createSignal<boolean>(true);
    const keys_fromRaw = Object.keys(props.valueRaw || {});
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
                            return (
                                <NestedInputRow
                                    key={key}
                                    valueRaw={props.valueRaw?.[key] as JsonObject}
                                    valueTranslated={props.valueTranslated?.[key] as JsonObject}
                                    depth={depth() + 1}
                                    absoluteKey={!props.absoluteKey ? key : `${props.absoluteKey}.${key}`}
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
    valueRaw: Json;
    valueTranslated: Json;
    depth: number;
}

type onInput_EventType = InputEvent & {
    currentTarget: HTMLInputElement;
};

function InputRow(props: InputRowProps) {
    const depth = () => props.depth;

    function UpdateTranslation(e: onInput_EventType) {
        const value = e.currentTarget.value;

        const _translation = updateObject(translation() as JsonObject, props.absoluteKey.split("."), value);
        setTranslation(_translation);
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

            <TextField value={stringify(props.valueRaw || "")} readOnly class="m-0" />

            <TextField
                value={stringify(props.valueTranslated || "")}
                id={`input-${props.absoluteKey}`}
                spellcheck={false}
                onInput={UpdateTranslation}
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

function stringify(json: Json) {
    let _str = JSON.stringify(json, null, 0);
    if (_str.startsWith('"')) _str = _str.slice(1, -1);
    if (Array.isArray(json)) _str = _str.replaceAll("\n", "");
    return _str;
}

function updateObject(obj: JsonObject, targetKey: string[], value: Json): Json {
    if (!targetKey.length) return obj;
    if (targetKey.length === 1) {
        return {
            ...obj,
            [targetKey[0]]: value,
        };
    }

    return {
        ...obj,
        [targetKey[0]]: updateObject(obj[targetKey[0]] as JsonObject, targetKey.slice(1), value),
    };
}

function ObjHasValues(obj: JsonObject | undefined) {
    if (!obj) return false;

    try {
        return Object.keys(obj).length > 0;
    } catch {
        return false;
    }
}

function stringifyJson(json: Json) {
    return JSON.stringify(json, null, 4).replaceAll("\\\\", "\\");
}
