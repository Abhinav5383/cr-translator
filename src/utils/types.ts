export interface JsonObject {
    [key: string]: Json;
}

export interface JsonArray extends Array<Json> {}
export type JsonPrimitive = string | number | boolean | null;
export type Json = JsonPrimitive | JsonObject | JsonArray;
