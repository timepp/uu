export type UUModuleStatus = 'idle' | 'ready' | 'error'
export type UUDependencyStatus = 'idle' | 'loading' | 'ready' | 'error'

export type UUModuleRuntimeState = {
    status: UUModuleStatus
    initializedAt: number
    values: Record<string, unknown>
    error?: unknown
}

export type UUDependencyRuntimeState = {
    status: UUDependencyStatus
    updatedAt: number
    error?: unknown
}

export type UUDomResource = {
    id: string
    owner: string
    kind: string
    selector?: string
    createdAt: number
    reference: WeakRef<Element>
    readonly element: Element | undefined
    readonly connected: boolean
}

export type UUStorageRuntimeState = {
    key: string
    owner: string
    registeredAt: number
    updatedAt: number
    reads: number
    writes: number
    readonly value: string | null
}

export type UURuntimeState = {
    schemaVersion: 1
    createdAt: number
    modules: Record<string, UUModuleRuntimeState>
    dependencies: Record<string, UUDependencyRuntimeState>
    dom: Record<string, UUDomResource>
    storage: Record<string, UUStorageRuntimeState>
    diagnostics: {
        warnings: string[]
        errors: unknown[]
    }
    counters: {
        dom: number
    }
    snapshot: () => object
}

type UUWindow = Window & {
    timepp_uu_state?: UURuntimeState
}

function simplify(value: unknown): unknown {
    if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`
    if (value instanceof Promise) return '[Promise]'
    if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack }
    return value
}

function createRuntimeState(): UURuntimeState {
    const state: UURuntimeState = {
        schemaVersion: 1,
        createdAt: Date.now(),
        modules: {},
        dependencies: {},
        dom: {},
        storage: {},
        diagnostics: { warnings: [], errors: [] },
        counters: { dom: 0 },
        snapshot: () => ({
            schemaVersion: state.schemaVersion,
            createdAt: state.createdAt,
            modules: Object.fromEntries(Object.entries(state.modules).map(([name, module]) => [name, {
                ...module,
                values: Object.fromEntries(Object.entries(module.values).map(([key, value]) => [key, simplify(value)]))
            }])),
            dependencies: { ...state.dependencies },
            dom: Object.fromEntries(Object.entries(state.dom).map(([id, resource]) => [id, {
                id: resource.id,
                owner: resource.owner,
                kind: resource.kind,
                selector: resource.selector,
                createdAt: resource.createdAt,
                connected: resource.connected,
                content: resource.element instanceof HTMLStyleElement ? resource.element.textContent : undefined,
                href: resource.element instanceof HTMLLinkElement ? resource.element.href : undefined
            }])),
            storage: Object.fromEntries(Object.entries(state.storage).map(([key, storage]) => [key, {
                key: storage.key,
                owner: storage.owner,
                registeredAt: storage.registeredAt,
                updatedAt: storage.updatedAt,
                reads: storage.reads,
                writes: storage.writes,
                value: storage.value
            }])),
            diagnostics: {
                warnings: [...state.diagnostics.warnings],
                errors: state.diagnostics.errors.map(simplify)
            }
        })
    }
    return state
}

const fallbackState = createRuntimeState()

export function getUURuntimeState() {
    if (typeof window === 'undefined') return fallbackState
    const uuWindow = window as UUWindow
    if (!uuWindow.timepp_uu_state) {
        Object.defineProperty(uuWindow, 'timepp_uu_state', {
            value: fallbackState,
            writable: false,
            configurable: true,
            enumerable: false
        })
    }
    return uuWindow.timepp_uu_state!
}

export function registerModule(name: string, status: UUModuleStatus = 'ready') {
    const modules = getUURuntimeState().modules
    return modules[name] ||= { status, initializedAt: Date.now(), values: {} }
}

export function registerModuleValue(name: string, key: string, getter: () => unknown) {
    const module = registerModule(name)
    Object.defineProperty(module.values, key, { get: getter, enumerable: true, configurable: true })
}

export function setDependencyState(name: string, status: UUDependencyStatus, error?: unknown) {
    getUURuntimeState().dependencies[name] = { status, updatedAt: Date.now(), ...(error === undefined ? {} : { error }) }
}

export function registerDomResource(element: Element, owner: string, kind: string, selector?: string, stableId?: string) {
    const state = getUURuntimeState()
    const id = stableId || `${owner}:${kind}:${++state.counters.dom}`
    const reference = new WeakRef(element)
    state.dom[id] = {
        id,
        owner,
        kind,
        selector,
        createdAt: Date.now(),
        reference,
        get element() { return reference.deref() },
        get connected() { return reference.deref()?.isConnected ?? false }
    }
    return id
}

export function unregisterDomResource(id: string) {
    delete getUURuntimeState().dom[id]
}

function storageEntry(key: string, owner: string) {
    const storage = getUURuntimeState().storage
    if (!storage[key]) {
        const registeredAt = Date.now()
        storage[key] = {
            key,
            owner,
            registeredAt,
            updatedAt: registeredAt,
            reads: 0,
            writes: 0,
            get value() { return typeof localStorage === 'undefined' ? null : localStorage.getItem(key) }
        }
    }
    return storage[key]
}

export function readLocalStorage(key: string, owner: string) {
    const entry = storageEntry(key, owner)
    entry.reads++
    entry.updatedAt = Date.now()
    return localStorage.getItem(key)
}

export function writeLocalStorage(key: string, value: string, owner: string) {
    const entry = storageEntry(key, owner)
    entry.writes++
    entry.updatedAt = Date.now()
    localStorage.setItem(key, value)
}

getUURuntimeState()
registerModule('uu-runtime-state')