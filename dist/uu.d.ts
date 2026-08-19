import * as tu from './tu.ts';
export * from './tu.ts';
export type AnnotatedString = {
    value: string;
    comment?: string;
};
export declare function triggerDownload(data: Blob | string | object, filename: string): void;
export declare function derivedUrl(oldUrl: string, paramsToAdd: Record<string, string>, paramsToRemove?: RegExp): string;
export declare function derivedCurrentUrl(paramsToAdd: Record<string, string>, paramsToRemove?: RegExp): string;
export declare function isFontAwesomeAvailable(): boolean;
export declare function enableFontAwesome(cdnUrl?: string): void;
export declare function fa(...classNames: string[]): HTMLElement;
export declare function createElement<K extends keyof HTMLElementTagNameMap>(parent: Element | null, tagName: K, classes?: string[], child?: string | HTMLElement, style?: Partial<CSSStyleDeclaration>, attributes?: Partial<Record<keyof HTMLElementTagNameMap[K], any>>): HTMLElementTagNameMap[K];
export declare function createButton(parent: Element | null, classes: string[] | undefined, child: string | HTMLElement, onclick?: () => void): HTMLButtonElement;
export declare function createCheck(parent: Element | null, classes: string[] | undefined, labelText: string, checked?: boolean, onChange?: (checked: boolean) => void): {
    btn: HTMLLabelElement;
    checkbox: HTMLInputElement;
};
export declare function createCheckBtn(parent: Element | null, classes: string[] | undefined, labelText: string, accentColor?: string, checked?: boolean, onChange?: (checked: boolean) => void): {
    div: HTMLDivElement;
    checkbox: HTMLInputElement;
};
export declare function createTable(parent: Element | null, props?: string[], classes?: string[], styles?: Partial<CSSStyleDeclaration>): {
    tbl: HTMLTableElement;
    thead: HTMLTableSectionElement;
    headCells: HTMLTableCellElement[];
    tbody: HTMLTableSectionElement;
};
export declare function forEachTableCell(table: HTMLTableElement, callback: (cell: HTMLTableCellElement, row: number, col: number) => void): void;
export declare function asyncGet<T>(fn: () => T): Promise<T>;
/** Call a longer running synchronous function with a progress dialog
    It runs an async wrapper by setTimeout to avoid blocking the UI thread
    This is only a workaround if you cannot run the function in async context
*/
export declare function asyncCallFunctionWithProgress(fn: () => void, hint?: string): void;
export declare function callAsyncFunctionWithProgress<T>(fn: () => Promise<T>, hint?: string): Promise<T>;
export declare const withUI: typeof callAsyncFunctionWithProgress;
export declare function showInfo(title: string, content: string): HTMLDialogElement;
export declare function highlightText(text: string, rules: [RegExp, string][]): HTMLSpanElement[];
export declare function createJsonView(content: string, customColors?: [RegExp, string][]): HTMLPreElement;
export declare function createLargeJsonView(content: string): HTMLPreElement;
export type ButtonAction = () => boolean | void | Promise<boolean | void>;
export interface DialogOptions<T> {
    classes?: string[];
    style?: Partial<CSSStyleDeclaration>;
    softDismissable?: boolean;
    actions?: string[] | Record<string, ButtonAction>;
}
export type DialogElements = {
    dialog: HTMLDialogElement;
    header: HTMLDivElement;
    closeButton: HTMLButtonElement;
    contentArea: HTMLDivElement;
    footer: HTMLDivElement;
    buttons: Record<string, HTMLButtonElement>;
};
export declare function showDialog<T>(title: string, content?: string | HTMLElement | undefined, options?: DialogOptions<T>, onCreate?: (elements: DialogElements, finisher: (value?: T) => void) => void): Promise<T | undefined>;
export declare function showInDialog(title: string, content: string | HTMLElement, actions?: string[] | Record<string, ButtonAction>): Promise<string | undefined>;
export type InformationExtractor = (obj: object) => HTMLElement | Promise<HTMLElement>;
export declare function setInformationExtractor(extractor: InformationExtractor): void;
export type EntityParser = (path: string[], value: any) => EntityRenderer | undefined;
export declare function setGlobalEntityParser(parser: EntityParser): void;
export declare function showJsonResult(title: string, content: string | object, parser?: EntityParser): Promise<void>;
export declare function showGeneralText(title: string, content: string): void;
export type DraggableSortedContainerOption = {
    showOrder: boolean;
    interactive: boolean;
    removable: boolean;
    emptyText: string;
    onChange: (items: string[]) => void;
};
export declare class DraggableSortedContainer {
    private cfg;
    root: HTMLElement;
    private items;
    private dragFromIndex;
    constructor(parent: Element | null, cfg?: Partial<DraggableSortedContainerOption>);
    setStrings(arr: string[]): void;
    getStrings(arr?: string[]): string[];
    private emitChange;
    private render;
}
export type VisualizeObjectConfig<T extends object> = {};
export declare function visualizeObject(obj: object, cfg?: Partial<VisualizeObjectConfig<any>>): HTMLTableElement;
export declare function createFoldedString(content: string, maxLength: number): HTMLSpanElement;
export declare function showAll(collection: NodeListOf<HTMLElement>): void;
export declare function hideAll(collection: NodeListOf<HTMLElement>): void;
export declare function rgbValue(obj: {
    r: number;
    g: number;
    b: number;
}): string;
export declare function getStringColor(str: string, s?: number, l?: number): string;
export declare function syncClass(element: HTMLElement, className: string, enabled: boolean): void;
export declare function syncChildClass(parent: HTMLElement, childSelector: string, className: string, enabled: boolean): void;
export declare function syncDisplay(element: HTMLElement, visible: boolean): void;
export declare function syncExistence(element: HTMLElement, shouldExist: boolean): void;
export declare function syncChildDisplay(parent: HTMLElement, childSelector: string, visible: boolean): void;
export declare function createButtonGroup(parent: Element | null, buttons: Record<string, () => void>): HTMLDivElement;
export declare function createToggleBar(values: (string | HTMLElement)[], value: number, onNewValue: (v: number) => void): HTMLDivElement;
export declare function associateDropdownActions(elem: HTMLElement, actions: Record<string, () => void> | {
    name: string;
    action: () => void;
}[]): void;
export declare function createLoadingSpinner(parent: Element | null, size?: string, color?: string): HTMLDivElement;
export type ContentProvider = HTMLElement | ((refresh: boolean) => HTMLElement) | ((refresh: boolean) => Promise<HTMLElement>);
export declare function createFoldableArea(parent: Element | null, title: string, content?: ContentProvider, initiallyFolded?: boolean): {
    div: HTMLDivElement;
    header: HTMLDivElement;
    body: HTMLDivElement;
    toggleBtn: HTMLButtonElement;
    refreshBtn: HTMLButtonElement;
};
export type EntityRenderer = {
    anchorStyle: string;
    render: () => HTMLElement | Promise<HTMLElement>;
};
export type VisualizeCallback = (path: string[], value: any) => EntityRenderer | undefined;
export type JsonViewerOptions = {
    stringFoldThreshold?: number;
    visualizeCallback?: VisualizeCallback;
};
export declare function createCodeMirrorJsonViewer(obj: object, options?: JsonViewerOptions): Promise<HTMLDivElement>;
export declare function createCodeMirrorJsonEditor(initialText: string): Promise<{
    div: HTMLDivElement;
    getValue: () => any;
    setValue: (text: string) => void;
}>;
export declare function createMarkdownViewer(markdownText: string): Promise<HTMLDivElement>;
export declare function createChart(parent: HTMLElement, width: string, height: string, config: any): Promise<{
    canvas: HTMLCanvasElement;
    chart: any;
}>;
export type DataType = 'integer' | 'float' | 'boolean' | 'date' | 'colorName' | 'general';
export declare function guessDataType(data: string | string[]): DataType;
export declare function renderDataInsights(info: tu.DataPropStat[]): Promise<HTMLDivElement>;
export declare function injectStyles(): void;
export * from './uu-components.ts';
export * from './uu-input.ts';
export * from './uu-visualize-array.ts';
