import type { HTMLInputAttributes } from 'svelte/elements';
import type { NewTag, Tag } from '$lib/types';

export type TagsInputPropsWithoutHTML = {
	value?: (Tag | NewTag)[]; // Changed from Tag[] | NewTag[]
	validate?: (val: string, tags: (Tag | NewTag)[]) => string | undefined; // Changed parameter type
};

export type TagsInputProps = TagsInputPropsWithoutHTML & Omit<HTMLInputAttributes, 'value'>;
