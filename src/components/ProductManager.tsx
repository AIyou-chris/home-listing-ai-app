import React, { useEffect, useState } from 'react';
import { connectService, StripeProduct } from '../services/connectService';

interface ProductManagerProps {
    accountId: string;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ accountId }) => {
    const [products, setProducts] = useState<StripeProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    // New Product Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState(''); // input string, convert to cents later

    const loadProducts = React.useCallback(async () => {
        setLoading(true);
        try {
            const list = await connectService.listProducts(accountId);
            setProducts(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !price) return;

        setCreating(true);
        try {
            const priceInCents = Math.round(parseFloat(price) * 100);
            const newProduct = await connectService.createProduct(accountId, {
                name,
                description,
                priceInCents
            });
            setProducts([newProduct, ...products]);
            // Reset form
            setName('');
            setDescription('');
            setPrice('');
        } catch (err) {
            alert('Failed to create product');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Create Product Form */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Create New Product</h3>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Luxury Home Consultation"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Describe your service..."
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Price (USD)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-500">$</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0.50"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={creating}
                        className="w-full py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {creating ? 'Creating...' : 'Add Product'}
                    </button>
                </form>
            </div>

            {/* Product List */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Your Products</h3>
                {loading ? (
                    <div className="text-center py-8 text-slate-400">Loading products...</div>
                ) : products.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200 border-dashed text-slate-500">
                        No products yet. Create one above!
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {products.map((product) => (
                            <div key={product.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h4 className="font-semibold text-slate-900">{product.name}</h4>
                                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{product.description}</p>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="font-bold text-lg text-indigo-600">
                                        {product.default_price
                                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: product.default_price.currency }).format(product.default_price.unit_amount / 100)
                                            : 'N/A'}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full bg-green-100 text-green-700`}>
                                        Active
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
