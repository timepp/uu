export type PropertyFilterState = {
    properties: string[];
    filters: Record<string, string[]>;
};
export type PropertyFilterOptions<T extends object> = {
    valueGetters?: Partial<Record<keyof T | string, (item: T) => unknown | unknown[]>>;
    maxInlineValues?: number;
    onChange?: (filter: PropertyFilter<T>) => void | Promise<void>;
};
export declare class PropertyFilter<T extends object> {
    private stateKey;
    root: HTMLDivElement;
    private items;
    private availablePropertyNames;
    private state;
    private maxInlineValues;
    private onChange?;
    private valueGetters;
    constructor(parent: Element | null, items: T[], stateKey: string, options?: PropertyFilterOptions<T>);
    reset(): void;
    setItems(items: T[]): void;
    getFilteredItems(items?: T[]): T[];
    getSummary(): string[];
    getState(): PropertyFilterState;
    private normalizeProperty;
    private cleanupState;
    private saveState;
    private getSelectedValues;
    private propertyMatches;
    private applyFiltersExcept;
    private allPropertyValues;
    private sortPropertyValues;
    private emitChange;
    private selectProperties;
    private clearProperty;
    private toggleValue;
    private renderValues;
    private showAllValuesDialog;
    render(): void;
}
