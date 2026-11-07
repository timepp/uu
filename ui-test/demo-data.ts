export type DemoItem = {
    id: string
    name: string
    category: string
    status: 'draft' | 'active' | 'low-stock' | 'archived'
    price: number
    stock: number
    rating: number
    featured: boolean
    color: string
    createdAt: string
    tags: string[]
    shipping: {
        region: string
        express: boolean
        warehouse: { code: string, capacity: number }
    }
    metrics: { views: number, conversion: number }
    dimensions: { width: number, height: number, depth: number }
    supplier: { name: string, tier: string } | null
    bundles: { sku: string, quantity: number }[]
    note?: string
    description: string
    metadata: Record<string, string>
    'shipping.region': string
    currency: string
}

const products = [
    { name: 'Desk Lamp', category: 'Home', price: 39.5 },
    { name: 'Trail Backpack', category: 'Outdoor', price: 79 },
    { name: 'Wireless Keyboard', category: 'Electronics', price: 109.99 },
    { name: 'Ceramic Mug', category: 'Home', price: 12.5 },
    { name: 'Running Shoes', category: 'Sports', price: 89 },
    { name: 'Travel Notebook', category: 'Office', price: 7.99 },
    { name: 'Bluetooth Speaker', category: 'Electronics', price: 49.95 },
    { name: 'Yoga Mat', category: 'Sports', price: 25 },
    { name: 'Camping Lantern', category: 'Outdoor', price: 32.5 },
    { name: 'Standing Desk', category: 'Office', price: 299 },
    { name: 'Cotton Tote', category: 'Accessories', price: 15 },
    { name: 'Sample Sticker Pack', category: 'Accessories', price: 0 },
]
const statuses: DemoItem['status'][] = ['draft', 'active', 'low-stock', 'archived']
const regions = ['North', 'South', 'East', 'West']
const colors = ['red', 'blue', 'green', 'orange', 'purple', 'gray']
const variants = ['Standard', 'Plus', 'Limited']

export const demoItems: DemoItem[] = variants.flatMap((variant, variantIndex) => products.map((product, productIndex): DemoItem => {
    const index = variantIndex * products.length + productIndex
    const status = statuses[(productIndex + variantIndex) % statuses.length]
    return {
        id: `SKU-${String(index + 1).padStart(3, '0')}`,
        name: `${product.name} / ${variant}`,
        category: product.category,
        status,
        price: product.price === 0 ? 0 : Math.round(product.price * (1 + variantIndex * 0.2) * 100) / 100,
        stock: status === 'archived' ? 0 : status === 'low-stock' ? index % 5 : 20 + index * 7,
        rating: index % 9 === 0 ? 0 : Math.round((3 + (index % 21) / 10) * 10) / 10,
        featured: index % 3 === 0,
        color: colors[index % colors.length],
        createdAt: new Date(Date.UTC(2026, index % 6, 1 + index % 25, index % 24)).toISOString(),
        tags: index % 7 === 0 ? [] : [
            product.category.toLowerCase(),
            index % 2 === 0 ? 'eco' : 'gift',
            variant.toLowerCase(),
        ],
        shipping: {
            region: regions[(productIndex + variantIndex * 2) % regions.length],
            express: index % 2 === 0,
            warehouse: { code: `WH-${index % 5 + 1}`, capacity: 100 + index % 5 * 50 },
        },
        metrics: { views: index * 137, conversion: Math.round(index % 13 * 0.0075 * 10000) / 10000 },
        dimensions: { width: 10 + index % 8 * 5, height: 12 + index % 6 * 8, depth: 3 + index % 4 * 2 },
        supplier: index % 8 === 0 ? null : { name: `Demo Supplier ${index % 5 + 1}`, tier: index % 2 === 0 ? 'gold' : 'silver' },
        bundles: index % 4 === 0 ? [] : [{ sku: `ACCESSORY-${productIndex + 1}`, quantity: variantIndex + 1 }],
        ...(index % 4 === 0 ? {} : { note: index % 4 === 1 ? '' : 'Synthetic data for UI testing only.' }),
        description: [
            `${product.name} in the ${variant.toLowerCase()} collection.`,
            'This deliberately long description demonstrates folded text, deep fuzzy search, and raw JSON inspection.',
            'Choose another variant and compare nested dimensions, suppliers, tags, and bundle arrays.',
        ].join(' '),
        metadata: index % 3 === 0 ? {} : { 'release.channel': variant.toLowerCase(), 'size[cm]': `${10 + index}`, '': 'empty-key-value' },
        'shipping.region': `Legacy-${regions[index % regions.length]}`,
        currency: 'USD',
    }
}))
