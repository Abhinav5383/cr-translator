import JSON5 from "json5";

let RAW_GITHUB_URL = "https://raw.githubusercontent.com";
if (import.meta.env.DEV === true) {
    RAW_GITHUB_URL = "";
}

const GITHUB_API_URL = "https://api.github.com";
const REPO_PATH = "FinalForEach/Cosmic-Reach-Localization";
const LANG_DIR = "assets/base/lang";

const CACHE = new Map<string, unknown>();

export interface Dir {
    name: string;
    path: string;
    download_url: string;
    type: "file" | "dir";

    files?: Dir[];
}

export async function getLocales(): Promise<Dir[]> {
    const items = await githubFetch<Dir[]>(`${GITHUB_API_URL}/repos/${REPO_PATH}/contents/${LANG_DIR}`);

    const files = items.map((item) => {
        return {
            name: item.name,
            path: item.path,
            download_url: item.download_url,
            type: item.type,
        };
    });

    const dirs = files.filter((file) => file.type === "dir");
    return dirs;
}

export async function getFilesPerLocale(path = `${LANG_DIR}/en_us`) {
    const localeFiles: Dir[] = [];
    const items = await githubFetch<Dir[]>(`${GITHUB_API_URL}/repos/${REPO_PATH}/contents/${path}`);

    for (const item of items) {
        const dirObj: Dir = {
            name: item.name,
            path: item.path,
            download_url: item.download_url,
            type: item.type,
        };

        if (item.type === "dir") {
            const files = await getFilesPerLocale(item.path);
            dirObj.files = files;
        }

        localeFiles.push(dirObj);
    }

    return localeFiles;
}

export async function getLocaleFileContents(path: string) {
    return await githubFetch<Record<string, string>>(`${RAW_GITHUB_URL}/${REPO_PATH}/master/${path}`);
}

export function getAbsoluteDirUrl(dir: Dir) {
    return `${GITHUB_API_URL}/${REPO_PATH}/contents/${LANG_DIR}/${dir.path}`;
}

export function getDirFiles(dir: Dir[]) {
    const files: Dir[] = [];

    for (const item of dir) {
        if (item.type === "dir") {
            files.push(...getDirFiles(item.files || []));
        } else {
            files.push(item);
        }
    }

    return files;
}

async function githubFetch<T>(url: RequestInfo | URL, options?: RequestInit): Promise<T> {
    const cachedResponse = CACHE.get(url.toString());
    if (cachedResponse) return cachedResponse as T;

    try {
        const res = await fetch(url, options);
        const json = (await res.json()) as T;
        CACHE.set(url.toString(), json);

        return json;
    } catch (error) {
        CACHE.delete(url.toString());

        console.error(error);
        console.error(url);

        return Response.json({}) as T;
    }
}

function jsonParse<T>(json: string): T {
    try {
        return JSON5.parse(json);
    } catch (error) {
        console.error(error);
        console.error(json);
        return {} as T;
    }
}
