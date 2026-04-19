import React, { useState, useEffect, useCallback } from 'react';
import { productsAPI, brandsAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

const EMPTY = { name: '', sku: '', brand: '', category: '', unit: 'piece', mrp: '', sellingPrice: '', description: '', initialStock: 0 };

export default function Products() {
  const [products, setProducts] = useState([]); const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [brandFilter, setBrandFilter] = useState('');
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY); const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (brandFilter) params.brand = brandFilter;
      const r = await productsAPI.getAll(params);
      setProducts(r.data.data);
    } catch { toast.error('Failed to load products'); } finally { setLoading(false); }
  }, [search, brandFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => {
    brandsAPI.getAll({ isActive: true }).then(r => setBrands(r.data.data));
    productsAPI.getCategories().then(r => setCategories(r.data.data));
  }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, sku: p.sku, brand: p.brand?._id || '', category: p.category, unit: p.unit, mrp: p.mrp, sellingPrice: p.sellingPrice, description: p.description || '', initialStock: 0 }); setModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.sku || !form.brand || !form.sellingPrice) return toast.error('Fill required fields');
    setSaving(true);
    try {
      if (editing) { await productsAPI.update(editing._id, form); toast.success('Product updated'); }
      else { await productsAPI.create(form); toast.success('Product created'); }
      setModal(false); fetchProducts();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save'); } finally { setSaving(false); }
  };

  const columns = [
    { key: 'name', label: 'Product', render: r => <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{r.sku}</div></div> },
    { key: 'brand', label: 'Brand', render: r => r.brand?.name || '—' },
    { key: 'category', label: 'Category' },
    { key: 'unit', label: 'Unit', render: r => <span className="badge badge-gray">{r.unit}</span> },
    { key: 'mrp', label: 'MRP', render: r => `₹${r.mrp}` },
    { key: 'sellingPrice', label: 'Selling Price', render: r => <strong>₹{r.sellingPrice}</strong> },
    { key: 'isActive', label: 'Status', render: r => <span className={`badge ${r.isActive ? 'badge-green' : 'badge-red'}`}>{r.isActive ? 'Active' : 'Inactive'}</span> },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="page-title">Products</h1><p className="page-subtitle">{products.length} products</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} />Add Product</button>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="filters-row">
            <div className="search-bar"><Search size={15} color="var(--gray-400)" /><input placeholder="Search name or SKU..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <select className="form-control form-select" style={{ width: 160 }} value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
              <option value="">All Brands</option>
              {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <DataTable columns={columns} data={products} loading={loading} emptyText="No products found"
          actions={row => (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <button className="btn-icon" onClick={() => openEdit(row)}><Pencil size={15} /></button>
              <button className="btn-icon" onClick={async () => { if (window.confirm('Deactivate?')) { await productsAPI.delete(row._id); toast.success('Deactivated'); fetchProducts(); } }} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
            </div>
          )} />
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Product' : 'Add Product'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="grid-2">
          <div className="form-group"><label className="form-label">Product Name *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">SKU *</label><input className="form-control" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })} /></div>
          <div className="form-group"><label className="form-label">Brand *</label><select className="form-control form-select" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}><option value="">Select Brand</option>{brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Category *</label><input className="form-control" list="cats" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Beverages" /><datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist></div>
          <div className="form-group"><label className="form-label">Unit</label><select className="form-control form-select" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{['piece','box','kg','litre','dozen','carton'].map(u => <option key={u} value={u}>{u}</option>)}</select></div>
          <div className="form-group"><label className="form-label">MRP (₹)</label><input className="form-control" type="number" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Selling Price (₹) *</label><input className="form-control" type="number" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} /></div>
          {!editing && <div className="form-group"><label className="form-label">Initial Stock</label><input className="form-control" type="number" min="0" value={form.initialStock} onChange={e => setForm({ ...form, initialStock: Number(e.target.value) })} /></div>}
        </div>
        <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
      </Modal>
    </div>
  );
}
