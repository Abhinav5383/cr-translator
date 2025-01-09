import JSON5 from "json5";

let RAW_GITHUB_URL = "https://raw.githubusercontent.com";
// CORS reasons
if (import.meta.env.DEV === true) {
    RAW_GITHUB_URL = "";
}

const GITHUB_API_URL = "https://api.github.com";
const LANG_DIR = "assets/base/lang";

const CACHE = new Map<string, unknown>();

export interface Dir {
    name: string;
    path: string;
    download_url: string;
    type: "file" | "dir";

    files?: Dir[];
}

export async function getLocales(RepoPath: string): Promise<Dir[]> {
    const [Repo, Ref] = ParseRepoPath(RepoPath);
    let url = `${GITHUB_API_URL}/repos/${Repo}/contents/${LANG_DIR}`;
    if (Ref) url += `?ref=${Ref}`;

    const items = await githubFetch<Dir[]>(url);

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

export async function getFilesPerLocale(RepoPath: string, path = `${LANG_DIR}/en_us`) {
    const localeFiles: Dir[] = [];
    const [Repo, Ref] = ParseRepoPath(RepoPath);
    let url = `${GITHUB_API_URL}/repos/${Repo}/contents/${path}`;
    if (Ref) url += `?ref=${Ref}`;

    const items = await githubFetch<Dir[]>(url);

    for (const item of items) {
        const dirObj: Dir = {
            name: item.name,
            path: item.path,
            download_url: item.download_url,
            type: item.type,
        };

        if (item.type === "dir") {
            const files = await getFilesPerLocale(RepoPath, item.path);
            dirObj.files = files;
        }

        localeFiles.push(dirObj);
    }

    return localeFiles;
}

export async function getLocaleFileContents(RepoPath: string, path: string) {
    const [Repo, Ref] = ParseRepoPath(RepoPath);
    return await githubFetch<Record<string, string>>(`${RAW_GITHUB_URL}/${Repo}/${Ref || "master"}/${path}`);
}

export function getAbsoluteDirUrl(RepoPath: string, dir: Dir) {
    return `${GITHUB_API_URL}/${RepoPath}/contents/${LANG_DIR}/${dir.path}`;
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
        const res = await fetch(url, {
            // headers: {
            //     Authorization: "token TOKEN",
            // },
            ...options,
        });
        const json = jsonParse<T>(await res.text());
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
        return {} as T;
    }
}


function ParseRepoPath(path: string) {
    if (!path.includes("/tree/")) return [path, ""];
    const split = path.split("/tree/");
    return [split[0], split[1]];
}