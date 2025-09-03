export * from './tu.js';
export declare function triggerDownload(blob: Blob, filename: string): void;
export declare function createElement<K extends keyof HTMLElementTagNameMap>(parent: Element | null, tagName: K, classes?: string[], text?: string, style?: Partial<CSSStyleDeclaration>): HTMLElementTagNameMap[K];
export declare function forEachTableCell(table: HTMLTableElement, callback: (cell: HTMLTableCellElement, row: number, col: number) => void): void;
export declare function callAsyncFunctionWithProgress<T>(fn: () => Promise<T>): Promise<T>;
export declare function highlightText(text: string, rules: [RegExp, string][]): HTMLSpanElement[];
export declare function createJsonView(content: string): HTMLPreElement;
export declare function showInDialog(title: string, content: string | HTMLElement): HTMLDialogElement;
export declare function showLargeJsonResult(title: string, content: string): void;
export declare function showInputDialog(title: string, placeholder: string, initialValue?: string): Promise<string | undefined>;
export type SelectOption = {
    singleSelect: boolean;
    preserveOrder: boolean;
    initialSelection: string[];
    checker: (oldSelection: string[], newSelection: string[]) => string[] | string;
    styleModifier: (item: string, elem: HTMLElement) => void;
};
export declare function showSelection(title: string, data: string[], options: Partial<SelectOption>): Promise<string[] | undefined>;
export type TableColumnProperty = {
    formater?: (value: any) => string | HTMLElement;
    style?: Partial<CSSStyleDeclaration>;
};
export type TablePresentation = {
    columnProperties: Record<string, TableColumnProperty>;
    rawIndexColumn: string;
    pageSize: number;
    enableSortByClickingColumnHeader: boolean;
    onCellClick: (item: any, prop: string, dataIndex: number) => void;
    columns: string[];
    sortBy: {
        column: string;
        order: 'asc' | 'desc';
    }[];
    stateKey: string;
};
export declare function createTableFromArray(arr: any[], presentation?: Partial<TablePresentation>): HTMLDivElement;
