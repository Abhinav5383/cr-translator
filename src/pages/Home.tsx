import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@components/ui/select";
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
import type { Json, JsonArray, JsonObject } from "@/utils/types";

const HIDDEN_KEYS: ObjectKey[] = ["$schema"];

export const NEW_LOCALE_ID = "New Locale";
const DEFAULT_SELECTIONS = {
    file: "game.json",
    refLocale: "en_us",
    translationLocale: NEW_LOCALE_ID,
};

export function HomePage_Wrapper() {
    const settings = LoadSettings();

    const dep = () => ({ repoPath: settings.repoPath, langDir: settings.langPath });

    const [locales] = createResource(dep, () => getLocales(settings.repoPath, settings.langPath));
    const [localeFiles] = createResource(dep, () =>
        getFilesPerLocale(settings.repoPath, settings.langPath),
    );

    return (
        <Show when={locales() && localeFiles()}>
            <HomePage locales={locales()} localeFiles={localeFiles()} settings={settings} />
        </Show>
    );
}

interface HomePageProps {
    settings: ReturnType<typeof LoadSettings>;
    locales: Dir[] | undefined;
    localeFiles: Dir[] | undefined;
}

function HomePage(props: HomePageProps) {
    const repoPath = () => props.settings.repoPath;
    const langDir = () => props.settings.langPath;
    const locales = () => props.locales || [];
    const localeFiles = () => props.localeFiles || [];

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
                    Unable to fetch locale data from GitHub! Please check the console for error
                    details.
                </p>
            </div>
        );
    }

    const filesNames = () => {
        const list: TranslationFileItem[] = [];
        getDirectoryFiles(localeFiles(), list);

        return list;
    };

    // File and locale selections
    const selectedLocaleFile = () => {
        if (searchParams.file) return searchParams.file as string;

        return DEFAULT_SELECTIONS.file;
    };
    function setSelectedLocaleFile(file: string) {
        setSearchParams({
            file: file,
        });
    }

    // Selection values
    const selectedRefLocale = () => {
        if (searchParams.ref_locale) return searchParams.ref_locale as string;
        return DEFAULT_SELECTIONS.refLocale;
    };
    function setSelectedRefLocale(locale: string) {
        setSearchParams({
            ref_locale: locale,
        });
    }

    const selectedTranslationLocale = () => {
        if (searchParams.translation_locale) return searchParams.translation_locale as string;
        return DEFAULT_SELECTIONS.translationLocale;
    };
    function setSelectedTranslationLocale(locale: string) {
        setSearchParams({
            translation_locale: locale,
        });
    }

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
        return getLocaleFileContents(
            repoPath(),
            `${langDir()}/${selectedRefLocale()}/${selectedLocaleFile()}`,
        );
    });

    const [translationLocale_content, { mutate: mutateTranslationContent }] = createResource(
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

    function setTranslationContent(newVal: JsonObject) {
        mutateTranslationContent(assembleObjectWithOrderedKeys(newVal, refLocale_content() ?? {}));
    }

    function handleTextareaChange(
        e: Event & {
            currentTarget: HTMLTextAreaElement;
        },
    ) {
        const value = e.currentTarget.value;

        try {
            const _translation = JSON.parse(value);
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

    createEffect(() => {
        if (translationLocale_content() || selectedLocaleFile()) {
            setHideNonEmptyEntries({
                enabled: false,
                translationSnapshot: {},
            });
        }
    });

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
                when={
                    refLocale_content.state === "ready" &&
                    translationLocale_content.state === "ready"
                }
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
                            <SwitchLabel>Hide translated entries</SwitchLabel>
                        </Switch>
                    </div>

                    <div class="bg-card-background px-6 py-4 rounded-lg grid col-span-full grid-cols-subgrid content-start font-mono gap-x-4 gap-y-2">
                        <NestedInputRow
                            absoluteKey={[]}
                            valueRefLocale={refLocale_content()}
                            valueTranslated={translationLocale_content()}
                            translationLocale_content={translationLocale_content()}
                            setTranslationContent={setTranslationContent}
                            hideNonEmptyEntries={hideNonEmptyEntries()}
                        />
                    </div>

                    <div class="col-span-full pb-16 flex flex-col gap-4">
                        <p class="mt-8">
                            <em>Note:</em> You can use this TextArea to add custom keys that the
                            editor doesn't have. The editor will be updated to reflect the changes
                            you made :)
                        </p>
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
                            <Button
                                onClick={downloadJson}
                                title={`Download translated ${selectedLocaleFile()}`}
                            >
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

type ObjectKey = number | string;

interface NestedInputRowProps {
    absoluteKey: ObjectKey[];
    key?: ObjectKey;
    valueRefLocale: JsonObject | JsonArray | undefined;
    valueTranslated: JsonObject | JsonArray | undefined;
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
        (typeof props.valueRefLocale === "string" ||
            typeof props.valueRefLocale === "number" ||
            !props.valueRefLocale) &&
        (typeof props.valueTranslated === "string" ||
            typeof props.valueTranslated === "number" ||
            !props.valueTranslated)
    ) {
        return (
            <Show
                when={
                    !props.hideNonEmptyEntries.enabled ||
                    !getNestedObjectValue(
                        props.hideNonEmptyEntries.translationSnapshot,
                        props.absoluteKey,
                    )
                }
            >
                <InputRow
                    key={`${props.key}`}
                    absoluteKey={props.absoluteKey}
                    valueRef={props.valueRefLocale}
                    valueTranslated={props.valueTranslated}
                    depth={depth()}
                    translationLocale_content={translationLocaleContent()}
                    setTranslationContent={props.setTranslationContent}
                />
            </Show>
        );
    }

    const [isExpanded, setIsExpanded] = createSignal<boolean>(true);

    const keys = () => {
        const keys_fromRefLocale = getObjectKeys(props.valueRefLocale ?? {});
        const keys_fromTranslated = getObjectKeys(props.valueTranslated ?? {});

        return Array.from(new Set(keys_fromRefLocale.concat(keys_fromTranslated)));
    };

    function toggleExpanded() {
        setIsExpanded(!isExpanded());
    }

    const translationValue_fromSnapshot = () => {
        return (
            getNestedObjectValue(
                props.hideNonEmptyEntries.translationSnapshot,
                props.absoluteKey,
            ) ?? {}
        );
    };

    return (
        <Show
            when={
                !props.hideNonEmptyEntries.enabled ||
                hasMissingOrEmptyTranslation(
                    translationValue_fromSnapshot() as JsonObject,
                    props.valueRefLocale ?? {},
                )
            }
        >
            <Show when={props.key !== undefined}>
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
                    style={{
                        "margin-left": depth() > 1 ? `${(depth() - 1) * 2}rem` : undefined,
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
                    class="grid col-span-full grid-cols-subgrid content-start font-mono gap-x-4 gap-y-2.5"
                    style={{
                        "padding-bottom": depth() === 0 ? "0" : "0.5rem",
                    }}
                >
                    <For each={keys()}>
                        {(key) => {
                            const absoluteKey = [...props.absoluteKey, key];

                            return (
                                <NestedInputRow
                                    key={key}
                                    valueRefLocale={
                                        getNestedObjectValue(props.valueRefLocale ?? {}, [
                                            key,
                                        ]) as JsonObject
                                    }
                                    valueTranslated={
                                        getNestedObjectValue(props.valueTranslated ?? {}, [
                                            key,
                                        ]) as JsonObject
                                    }
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
        </Show>
    );
}

interface InputRowProps {
    key: ObjectKey;
    absoluteKey: ObjectKey[];

    valueRef: string | number | undefined;
    valueTranslated: string | number | undefined;
    depth: number;

    translationLocale_content: JsonObject | undefined;
    setTranslationContent: (newVal: JsonObject) => void;
}

function InputRow(props: InputRowProps) {
    const depth = () => props.depth;
    const translationLocaleContent = () => props.translationLocale_content;

    function UpdateTranslation(e: { currentTarget: EventTarget & HTMLInputElement }) {
        const value = unescapeCharacters(e.currentTarget.value);

        const _translation = updateObject(
            translationLocaleContent() || {},
            props.absoluteKey,
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
            <label class="text-muted-foreground" for={`input-${props.absoluteKey.join(".")}`}>
                {props.key}
            </label>

            <Show
                when={(props.valueRef ?? "").toString().length <= 70}
                fallback={
                    <>
                        <TextArea
                            value={escapeCharacters(props.valueRef ?? "")}
                            readOnly
                            tabIndex={-1}
                            class="min-h-10 self-stretch max-h-[24rem] resize-none field-sizing-content"
                        />

                        <TextArea
                            value={escapeCharacters(props.valueTranslated ?? "")}
                            onInput={UpdateTranslation}
                            class="min-h-10 self-stretch max-h-[24rem] resize-none field-sizing-content"
                        />
                    </>
                }
            >
                <TextField
                    value={escapeCharacters(props.valueRef ?? "")}
                    readOnly
                    class="m-0"
                    tabIndex={-1}
                />

                <TextField
                    id={`input-${props.absoluteKey.join(".")}`}
                    spellcheck={false}
                    value={escapeCharacters(props.valueTranslated ?? "")}
                    onInput={UpdateTranslation}
                    // tabIndex={props.valueTranslated ? -1 : undefined}
                />
            </Show>
        </TextFieldRoot>
    );
}

interface TranslationFileItem {
    name: string;
    path: string;
}

function getDirectoryFiles(dirs: Dir[], list: TranslationFileItem[], parent = "") {
    for (let i = 0; i < dirs.length; i++) {
        const dir = dirs[i];
        if (dir.type === "file") {
            let fileName = dir.name;
            if (parent.length) fileName = `${parent}${dir.name}`;

            list.push({ name: fileName, path: parent + dir.name });
        }

        if (dir.files) {
            getDirectoryFiles(dir.files, list, `${parent}${dir.name}/`);
        }
    }
}

function updateObject<T extends JsonObject | JsonArray>(
    srcObj: T,
    keys: ObjectKey[],
    value: Json,
    removeKeyOnFalsyVal = true,
): T {
    if (keys.length === 0) return srcObj;
    const isValueAbsent = value === undefined || value === null;

    // clone root
    const root = Array.isArray(srcObj) ? [...srcObj] : { ...srcObj };
    let temp: JsonObject | JsonArray = root;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const next = getNestedObjectValue(temp, [key]);
        let clonedNext: JsonObject | JsonArray;

        if (Array.isArray(next)) {
            clonedNext = [...next];
        } else if (next && typeof next === "object") {
            clonedNext = { ...next };
        } else {
            // create missing container
            const nextKey = keys[i + 1];
            clonedNext = typeof nextKey === "number" || Number.isInteger(Number(nextKey)) ? [] : {};
        }

        // attach clone
        if (Array.isArray(temp)) {
            const index = typeof key === "number" ? key : Number.parseInt(key, 10);
            if (!Number.isInteger(index))
                throw new Error(`updateObject: Invalid array index: ${index}`);
            temp[index] = clonedNext;
        } else {
            temp[key] = clonedNext;
        }

        temp = clonedNext;
    }

    // biome-ignore lint/style/noNonNullAssertion: should never be null
    const lastKey = keys.at(-1)!;

    if (Array.isArray(temp)) {
        const index = typeof lastKey === "number" ? lastKey : Number.parseInt(lastKey, 10);
        if (!Number.isInteger(index))
            throw new Error(`updateObject: Invalid array index: ${index}`);

        if (removeKeyOnFalsyVal && isValueAbsent) {
            temp.splice(index, 1);
        } else {
            temp[index] = value;
        }
    } else {
        if (removeKeyOnFalsyVal && isValueAbsent) {
            delete temp[lastKey];
        } else {
            temp[lastKey] = value;
        }
    }

    return root as T;
}

function assembleObjectWithOrderedKeys(obj: JsonObject, ref: JsonObject): JsonObject {
    const result: JsonObject = {};

    // First, follow ref's key order
    for (const key of Object.keys(ref)) {
        const value = getObjectItem(obj, key);
        const refValue = getObjectItem(ref, key);

        if (
            value &&
            refValue &&
            typeof value === "object" &&
            typeof refValue === "object" &&
            !Array.isArray(value) &&
            !Array.isArray(refValue)
        ) {
            result[key] = assembleObjectWithOrderedKeys(
                value as JsonObject,
                refValue as JsonObject,
            );
        } else if (value) {
            result[key] = value;
        }
    }

    // Then, append keys that exist only in obj
    for (const key of Object.keys(obj)) {
        if (!(key in ref)) {
            result[key] = obj[key];
        }
    }

    return result;
}

function getNestedObjectValue<T extends JsonObject | JsonArray>(obj: T, keys: ObjectKey[]) {
    let result: Json = obj;

    for (const key of keys) {
        if (Array.isArray(result)) {
            result = getArrayItem(result, key);
        } else if (result && typeof result === "object") {
            result = getObjectItem(result, key);
        } else {
            return null;
        }
    }

    return result;
}

function getArrayItem<T>(arr: T[], key: ObjectKey) {
    if (key === undefined || key === null) throw new Error(`getArrayItem: Got invalid key: ${key}`);

    if (typeof key === "number") return arr[key];

    const index = Number.parseInt(key, 10);
    if (!Number.isInteger(index)) throw new Error(`getArrayItem: Got invalid index: ${key}`);

    return arr[index];
}

function getObjectItem<T>(obj: Record<ObjectKey, T>, key: ObjectKey) {
    if (key === undefined || key === null)
        throw new Error(`getObjectItem: Got invalid key: ${key}`);
    return obj[key];
}

function ObjIsNonEmpty(obj: JsonObject | undefined) {
    if (!obj) return false;

    try {
        return Object.keys(obj).length > 0;
    } catch {
        return false;
    }
}

function hasMissingOrEmptyTranslation<T extends Json>(obj: T, refObj: T) {
    if (
        !obj ||
        !refObj ||
        typeof obj !== "object" ||
        typeof refObj !== "object" ||
        Array.isArray(obj) ||
        Array.isArray(refObj)
    ) {
        return true;
    }

    const objKeys = getObjectKeys(obj);
    const refObjKeys = getObjectKeys(refObj);

    if (objKeys.length < refObjKeys.length) return true;
    const combinedKeys = new Set([...objKeys, ...refObjKeys]);

    for (const key of combinedKeys) {
        if (HIDDEN_KEYS.includes(key)) continue;

        const item = obj[key];
        if (item === undefined || item === null) {
            return true;
        }

        const refEquiv = refObj[key];
        if (
            item &&
            typeof item === "object" &&
            !Array.isArray(item) &&
            refEquiv &&
            typeof refEquiv === "object" &&
            !Array.isArray(refEquiv)
        ) {
            if (hasMissingOrEmptyTranslation(item, refEquiv)) return true;
        }
    }

    return false;
}

function getObjectKeys<T extends JsonObject | JsonArray>(obj: T): ObjectKey[] {
    if (Array.isArray(obj)) {
        const keys: number[] = [];
        for (let i = 0; i < obj.length; i++) {
            keys.push(i);
        }
        return keys;
    } else {
        return Object.keys(obj);
    }
}

function stringifyJson(json: Json | undefined) {
    return JSON.stringify(json, null, 4);
}

const ESCAPE_CHARS_MAP = [
    // ["\\", "\\\\"],
    ["\n", "\\n"],
    ["\t", "\\t"],
    ['"', '\\"'],
];

const ESCAPE_MAP: Record<string, string> = {};
for (const entry of ESCAPE_CHARS_MAP) {
    ESCAPE_MAP[entry[0]] = entry[1];
}

function escapeCharacters<T>(str: T) {
    if (typeof str !== "string") return str;
    return str.replace(/[\n\t"]/g, (char) => ESCAPE_MAP[char] ?? char);
}

const UNESCAPE_MAP: Record<string, string> = {};
for (const entry of ESCAPE_CHARS_MAP) {
    UNESCAPE_MAP[entry[1]] = entry[0];
}

function unescapeCharacters<T>(str: T) {
    if (typeof str !== "string") return str;
    return str.replace(/\\[nt"]/g, (seq) => UNESCAPE_MAP[seq] ?? seq);
}
