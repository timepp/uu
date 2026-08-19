import * as uu from './uu.ts';
/**
 * Create a horizontal bar showing proportions of different parts
 *
 * @param parent Parent element to attach the bar to
 * @param parts Array of parts with name, value, and optional color
 * @param unit Optional unit to display (e.g., 'bytes', '%')
 * @returns The created bar element
 *
 * @example
 * ```typescript
 * createSizeBar(document.body, [
 *   { name: 'Used', value: 60 },
 *   { name: 'Free', value: 40 }
 * ], '%')
 * ```
 */
export declare function createSizeBar(parent: HTMLElement | null, parts: {
    name: string;
    value: number;
    color?: string;
}[], unit?: string): HTMLDivElement;
export declare function createSelector(parent: HTMLElement | null, options: string[], onChange: (value: string[]) => void, multiSelect?: boolean, initialValue?: string[]): {
    element: HTMLDivElement;
    getSelected: () => string[];
    setSelected: (values: string[]) => void;
};
export declare class Pager {
    private totalItems;
    private pageSize;
    private onPageChange;
    toolbar: HTMLElement;
    privBtn: HTMLButtonElement;
    nextBtn: HTMLButtonElement;
    lastBtn: HTMLButtonElement;
    firstBtn: HTMLButtonElement;
    pageText: HTMLElement;
    pageSizeCtrl: HTMLElement;
    currentPage: number;
    constructor(totalItems: number, pageSize: number, onPageChange: (pageIndex: number, pageSize: number) => void);
    setPageSize(pageSize: number): void;
    setTotalItems(totalItems: number): void;
    getPageRange(page: number): {
        startIndex: number;
        endIndex: number;
    };
    private updateUI;
    gotoPage(page: number): void;
    refreshCurrentPage(): void;
    getElement(): HTMLElement;
}
export declare function createDataArea<T extends object>(parent: HTMLElement | null, title: string, params: T, fieldOptions: Partial<Record<keyof T, uu.FieldEditOption>> | undefined, renderer: (params: T) => Promise<HTMLElement>): HTMLDivElement;
