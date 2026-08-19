export type PropRenderOption<T extends object> = {
    formatter?: (item: T, prop: string, dataIndex: number) => string | HTMLElement;
    style?: Partial<CSSStyleDeclaration>;
    onClick?: (item: T, prop: string, dataIndex: number) => boolean;
};
export type ItemAction = (item: any, dataIndex: number) => void;
export type ItemActions = Record<string, ItemAction>;
export type WallRenderOption<T extends object> = RenderOption<T> & {
    imageUrl: (item: T, dataIndex: number) => string;
    imageWidth?: string;
    rowGap?: string;
};
export type RenderOption<T extends object> = {
    props?: string[];
    propOptions?: Record<string, PropRenderOption<T>>;
    propFormatter?: (item: T, prop: string, dataIndex: number) => string | HTMLElement | undefined;
    propStyle?: (item: T, prop: string, dataIndex: number) => Partial<CSSStyleDeclaration> | undefined;
    onPropClick?: (item: T, prop: string, dataIndex: number) => boolean | undefined;
    itemFormatter?: (item: T, dataIndex: number, props: string[]) => HTMLElement | undefined;
    onItemClick?: (item: T, dataIndex: number) => Promise<boolean | undefined>;
    itemStyle?: (item: T, dataIndex: number) => Partial<CSSStyleDeclaration> | undefined;
};
export type VisualizeConfig<T extends object> = {
    renderStyles: ('table' | 'tile' | 'wall')[];
    showPropSelector: boolean;
    showSortButton: boolean;
    showFilter: boolean;
    renderOption: RenderOption<T>;
    tableRenderOption: RenderOption<T>;
    tileRenderOption: RenderOption<T>;
    wallRenderOption: WallRenderOption<T>;
    itemActions: ItemActions | ((item: T, dataIndex: number) => ItemActions);
    rawIndexProp: string;
    actionProp: string;
    noDefaultActions: boolean;
    pageSize: number;
    flattenNestedObjects: boolean;
    hideUniformProps: boolean;
    stringFoldThreshold: number;
    sortBy: {
        prop: string;
        order: 'asc' | 'desc';
    }[];
    filter: string;
    itemFilter: (item: T, filter: string) => boolean | undefined;
    stateKey: string;
    loadMore: () => Promise<T[]>;
};
export declare function visualizeArray<T extends object>(arr: T[], cfg?: Partial<VisualizeConfig<T>>): HTMLDivElement;
