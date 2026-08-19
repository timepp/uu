import { AnnotatedString } from './uu.ts';
export type AutofillProvider = (category: string) => AnnotatedString[];
export declare function setAutofillProvider(provider: AutofillProvider): void;
export type InputElement = {
    id: string;
    name: string;
    type: 'single-line-string' | 'number' | 'multi-line-string' | 'date' | 'single-select' | 'multi-select' | 'single-picker' | 'multi-picker' | 'custom';
    selectOptions?: string[];
    defaultValue?: string | string[];
    initialValue?: string | string[];
    customInput?: (currentValue: string) => Promise<string>;
};
export type InputElementOld = string | {
    name: string;
    valueId?: string;
    initialValue?: string;
    onClick?: (params: Record<string, string>) => HTMLElement | Promise<HTMLElement> | void;
};
export declare function createInputPanel(parent: HTMLElement | null, elements: InputElement[], style?: 'table' | 'bar', name?: string): {
    element: HTMLElement;
    getValues: () => Record<string, string | string[]>;
};
export declare function showInputDlg(title: string, elements: InputElement[]): Promise<Record<string, string | string[]> | null>;
export type FieldEditOption = {
    type?: 'single-line-string' | 'number' | 'multi-line-string' | 'date' | 'single-select' | 'multi-select' | 'single-picker' | 'multi-picker' | 'custom';
    selectOptions?: string[];
    displayName?: string;
};
/**
 * A typed input control. The passed object is used to infer types and initial values.
 * @param parent parent element
 * @param obj object with inital values
 * @param fieldOptions optional settings customizing field behavior, if needed
 * @param style display style ('table' or 'bar')
 * @returns an object containing the html element and a function to get the current values
 */
export declare function createInputArea<T extends object>(parent: HTMLElement | null, obj: T, fieldOptions?: Partial<Record<keyof T, FieldEditOption>>, style?: 'table' | 'bar', name?: string): {
    element: HTMLElement;
    getValues: () => T;
};
export declare function showInputDialog<T extends object>(title: string, obj: T, fieldOptions?: Partial<Record<keyof T, FieldEditOption>>): Promise<T | null>;
export declare function showConfirmationDialog(title: string, text: string): Promise<boolean>;
export type InputField = {
    tip: string;
    initialValue?: string;
    multiLine?: boolean;
};
export declare function showInputDialogOld(title: string, fields: InputField[]): Promise<string[] | undefined>;
export declare function prompt(title: string, tip: string | HTMLElement, initialValue?: string): Promise<string | undefined>;
export declare function promptMultiline(title: string, tip: string | HTMLElement, initialValue?: string): Promise<string | undefined>;
export type Input = {
    type: 'input' | 'button' | 'select';
    id: string;
    label?: string;
    options?: string[];
    grow?: number;
    initialValue?: string;
};
/**
 * Simple form: createInputAreaOld(parent, 'input:name Name | input:age Age | button:search Search')
 */
export declare function createInputAreaOld(parent: Element | null, elements: string | Input[]): {
    div: HTMLDivElement;
    inputs: Record<string, HTMLInputElement>;
    buttons: Record<string, HTMLButtonElement>;
    selects: Record<string, HTMLSelectElement>;
};
export declare function createDataAreaOld(parent: Element | null, foldable: boolean, params: InputElementOld[]): HTMLDivElement;
/**
 * Given an user provided handler: create input controls, handle user interactions, and show result area.
 */
export declare function createInputAction(title: string, actionName: string, valueId: string, handler: (value: string) => Promise<HTMLElement>, value?: string): HTMLDivElement;
export declare function createAutofillInput(title: string, placeholder: string, initialValue: string, valueId?: string, handler?: (value: string) => void, btn?: string): {
    ig: HTMLDivElement;
    input: HTMLInputElement;
    button: HTMLButtonElement | null;
};
export declare function chooseOne(data: (string | AnnotatedString)[]): Promise<string | undefined>;
export type SelectOption = {
    singleSelect: boolean;
    pickAndClose: boolean;
    initialSelection: string[];
    showOrder: boolean;
    showToolbar: boolean;
    showStatus: boolean;
    statusInteractive: boolean;
    checker: (oldSelection: string[], newSelection: string[]) => string[] | string;
    styleModifier: (item: string, elem: HTMLElement) => void;
    dlgStyle: Partial<CSSStyleDeclaration>;
};
export type SelectionItem = AnnotatedString | string;
export declare function showSelection(title: string, options: SelectionItem[], cfg?: Partial<SelectOption>): Promise<string[] | undefined>;
