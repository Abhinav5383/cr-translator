import { type Dir, getDirFiles, getFilesPerLocale, getLocaleFileContents, getLocales } from "./api";

async function main() {
    const RepoPathInput = getRepoUrlInput();
    const translatingFile = document.getElementById("locale-file") as HTMLSelectElement;
    const fromLocale = document.getElementById("from-locale") as HTMLSelectElement;
    const toLocale = document.getElementById("to-locale") as HTMLSelectElement;

    const RepoPath = getRepoPath();
    const locales = await getLocales(RepoPath);
    const filesPerLocale = await getFilesPerLocale(RepoPath);

    // Set locales options
    setLocaleFileOptions(filesPerLocale);
    setFromLocaleOptions(locales);
    setToLocaleOptions(locales);

    // Add event listeners
    async function refreshFiles() {
        const sourceFile = translatingFile.options[translatingFile.selectedIndex || 0] as HTMLOptionElement;
        const fromLocaleOption = fromLocale.options[fromLocale.selectedIndex || 0] as HTMLOptionElement;
        const toLocaleOption = toLocale.options[toLocale.selectedIndex || 0] as HTMLOptionElement;

        await addTranslationInputs(sourceFile, fromLocaleOption, toLocaleOption);
        updateTranslatedJSON();
    }
    refreshFiles();

    translatingFile.addEventListener("change", () => {
        refreshFiles();
    });

    fromLocale.addEventListener("change", () => {
        refreshFiles();
    });

    toLocale.addEventListener("change", () => {
        refreshFiles();
    });

    // Repo path input
    RepoPathInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            setRepoPath(RepoPathInput.value);

            if (RepoPath !== RepoPathInput.value) {
                window.location.reload();
            }
        }
    });
    RepoPathInput.addEventListener("focusout", () => {
        setRepoPath(RepoPathInput.value);
        if (RepoPath !== RepoPathInput.value) {
            window.location.reload();
        }
    })

    // Handle copy and download buttons
    const copyButton = document.getElementById("copy-btn") as HTMLButtonElement;
    const downloadButton = document.getElementById("download-btn") as HTMLButtonElement;

    copyButton.addEventListener("click", async () => {
        const textarea = document.getElementById("translated-json") as HTMLTextAreaElement;
        await navigator.clipboard.writeText(textarea.value);
        copyButton.textContent = "Copied!";

        setTimeout(() => {
            copyButton.textContent = "Copy JSON";
        }, 1500);
    });

    downloadButton.addEventListener("click", async () => {
        const sourceFile = translatingFile.options[translatingFile.selectedIndex || 0] as HTMLOptionElement;

        const textarea = document.getElementById("translated-json") as HTMLTextAreaElement;
        const blob = new Blob([textarea.value], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = sourceFile.value;
        a.click();

        URL.revokeObjectURL(url);
    });
}
main();

async function addTranslationInputs(sourceFile: HTMLOptionElement, fromLocale: HTMLOptionElement, toLocale: HTMLOptionElement) {
    const RepoPath = getRepoPath();
    const inputsContainer = document.querySelector(".inputs-container") as HTMLDivElement;
    inputsContainer.innerHTML = Loading();

    const sourceJSON = await getLocaleFileContents(RepoPath, sourceFile.dataset.path || "");

    const fromJSON_path = (sourceFile.dataset.path || "").replace("en_us", fromLocale.value);
    const fromJSON = await getLocaleFileContents(RepoPath, fromJSON_path);

    const toJSON_path = (sourceFile.dataset.path || "").replace("en_us", toLocale.value);
    const toJSON = toLocale.value === "new_locale" ? {} : await getLocaleFileContents(RepoPath, toJSON_path);

    const translationKeys = Object.keys(sourceJSON);
    inputsContainer.innerHTML = "";

    const rows = createInputRow(translationKeys, fromJSON, toJSON);
    for (const row of rows) {
        inputsContainer.appendChild(row);
    }
}

interface JsonData {
    [key: string]: undefined | string | number | boolean | JsonData;
}

function createInputRow(keys: string[], fromJSON: JsonData, toJSON: JsonData, nesting = 0, parentKey?: string) {
    const rows: HTMLDivElement[] = [];

    for (const key of keys) {
        const formattedKey = parentKey ? `${parentKey}.${key}` : key;
        const from_value = fromJSON[key];
        const to_value = toJSON[key];

        // Handle nested objects
        if (typeof from_value === "object" || Array.isArray(from_value)) {
            const treeIndicator = document.createElement("div");
            treeIndicator.classList.add("tree-indicator");
            treeIndicator.style.marginLeft = `${nesting * 1.25}rem`;
            treeIndicator.textContent = key;
            rows.push(treeIndicator);

            const fromObjValue = typeof from_value === "object" ? from_value : {};
            const toObjValue = typeof to_value === "object" ? to_value : {};

            const nestedKeys = Object.keys(from_value);
            const nestedRows = createInputRow(nestedKeys, fromObjValue, toObjValue, nesting + 1, formattedKey);
            rows.push(...nestedRows);

            continue;
        }

        const row = document.createElement("div");
        row.classList.add("input-row");
        row.style.marginLeft = `${nesting * 1.25}rem`;

        const label = document.createElement("label");
        label.textContent = key;
        label.htmlFor = `translation-${formattedKey}`;

        const fromInput = document.createElement("input");
        fromInput.type = "text";
        fromInput.id = `source-${formattedKey}`;
        fromInput.value = from_value ? `${from_value}` : "";
        fromInput.placeholder = key;
        fromInput.readOnly = true;

        const toInput = document.createElement("input");
        toInput.type = "text";
        toInput.classList.add("translation-input");
        toInput.dataset.key = formattedKey;
        toInput.id = `translation-${formattedKey}`;
        toInput.value = to_value ? `${to_value}` : "";
        toInput.placeholder = key;
        toInput.addEventListener("input", updateTranslatedJSON);

        row.appendChild(label);
        row.appendChild(fromInput);
        row.appendChild(toInput);

        rows.push(row);
    }

    return rows;
}

function updateTranslatedJSON() {
    const translationInputs = document.querySelectorAll(".translation-input") as NodeListOf<HTMLInputElement>;
    const translatedJSON: JsonData = {};

    for (const input of translationInputs) {
        const key = input.dataset.key || "";
        const value = input.value;

        const json = createJSON(key, value);
        Object.assign(translatedJSON, json);
    }

    const textarea = document.getElementById("translated-json") as HTMLTextAreaElement;
    textarea.value = JSON.stringify(translatedJSON, null, 4);
}

function createJSON(key: string, value: string) {
    const json: JsonData = {};

    if (key.includes(".")) {
        const parts = key.split(".");
        json[parts[0]] = createJSON(parts.slice(1).join("."), value);
    } else {
        json[key] = value;
    }

    return json;
}

function setFromLocaleOptions(locales: Dir[]) {
    const fromLocale = document.getElementById("from-locale") as HTMLSelectElement;
    fromLocale.innerHTML = "";

    const options = getLocaleOptions(locales);
    for (const option of options) {
        if (option.value === "en_us") {
            option.selected = true;
        }
        fromLocale.appendChild(option);
    }
}

function setToLocaleOptions(locales: Dir[]) {
    const toLocale = document.getElementById("to-locale") as HTMLSelectElement;
    toLocale.innerHTML = "";

    const newLocale_option = document.createElement("option");
    newLocale_option.value = "new_locale";
    newLocale_option.text = "New Locale";
    toLocale.appendChild(newLocale_option);

    const options = getLocaleOptions(locales);
    for (const option of options) {
        toLocale.appendChild(option);
    }
}

function getLocaleOptions(locales: Dir[]) {
    const options: HTMLOptionElement[] = [];

    for (const locale of locales) {
        const option = document.createElement("option");
        option.value = locale.name;
        option.text = locale.name;
        option.dataset.path = locale.path;
        options.push(option);
    }

    return options;
}

function setLocaleFileOptions(files: Dir[]) {
    const localeFiles = document.getElementById("locale-file") as HTMLDivElement;
    localeFiles.innerHTML = "";

    function addOption(file: Dir) {
        const option = document.createElement("option");
        option.value = file.name;
        option.text = file.name;
        option.dataset.path = file.path;
        localeFiles.appendChild(option);
    }

    for (const file of getDirFiles(files)) {
        if (file.type === "dir") {
            const dirFiles = getDirFiles([file]);
            for (const dirFile of dirFiles) {
                addOption(dirFile);
            }
        }

        addOption(file);
    }
}

function setRepoPath(path: string) {
    localStorage.setItem("repo-url", path);
}

function getRepoPath() {
    const RepoPathInput = getRepoUrlInput();
    const path = localStorage.getItem("repo-url");

    if (path?.length) {
        RepoPathInput.value = path;
    }

    return RepoPathInput.value;
}

function getRepoUrlInput() {
    return document.getElementById("repo-url") as HTMLInputElement;
}

function Loading() {
    return `<div class="loading">Loading...</div>`;
}
