import { cn } from "@/utils/cn";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { TextFieldTextAreaProps } from "@kobalte/core/text-field";
import { TextArea as TextFieldPrimitive } from "@kobalte/core/text-field";
import type { ValidComponent, VoidProps } from "solid-js";
import { splitProps } from "solid-js";

type textAreaProps<T extends ValidComponent = "textarea"> = VoidProps<
    TextFieldTextAreaProps<T> & {
        class?: string;
    }
>;

export const TextArea = <T extends ValidComponent = "textarea">(props: PolymorphicProps<T, textAreaProps<T>>) => {
    const [local, rest] = splitProps(props as textAreaProps, ["class"]);

    return (
        <TextFieldPrimitive
            class={cn(
                "flex min-h-[8rem] w-full rounded-lg border border-transparent bg-shallow-background px-3 py-2 text-sm shadow-sm transition-all placeholder:text-muted-foreground",
                "focus-visible:text-foreground-bright focus-visible:bg-transparent focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-extra-muted-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50",
                local.class,
            )}
            {...rest}
        />
    );
};
