const SELECTIONS_KEY = "selections";

const DEFAULT_SELECTIONS: SelectionValues = {
    file: "game.json",
    refLocale: "en_us",
    translationLocale: undefined,
};

export interface SelectionValues {
    file: string;
    refLocale: string;
    translationLocale: string | undefined;
}

export function saveSelections(selections: SelectionValues) {
    const json = JSON.stringify({
        file: selections.file,
        refLocale: selections.refLocale,
        translationLocale: selections.translationLocale,
    });

    localStorage.setItem(SELECTIONS_KEY, json);
}

export function loadSelections(): SelectionValues {
    const selections = localStorage.getItem(SELECTIONS_KEY);
    if (!selections) return DEFAULT_SELECTIONS;

    try {
        const selections_parsed = JSON.parse(selections) as SelectionValues;
        return {
            ...DEFAULT_SELECTIONS,
            ...selections_parsed,
        };
    } catch (error) {
        console.error("Failed to parse locally saved selections!");
        console.error(error);
        return DEFAULT_SELECTIONS;
    }
}
