const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const Brand = require('../models/Brand');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Industry = require('../models/Industry');
const Store = require('../models/Store');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing
  await Promise.all([
    User.deleteMany({}), Brand.deleteMany({}), Product.deleteMany({}),
    Inventory.deleteMany({}), Industry.deleteMany({}), Store.deleteMany({}),
  ]);

  // Admin user
  const admin = await User.create({
    name: 'Admin User', email: 'admin@dms.com', password: 'admin123', role: 'admin', phone: '9999999999',
  });

  // Staff users
  const staff1 = await User.create({ name: 'Rahul Sharma', email: 'rahul@dms.com', password: 'staff123', role: 'staff', phone: '9876543210' });
  const staff2 = await User.create({ name: 'Priya Singh', email: 'priya@dms.com', password: 'staff123', role: 'staff', phone: '9876543211' });

  // Brands
  const brand1 = await Brand.create({ name: 'HinduCo FMCG', description: 'Fast moving consumer goods', contactPerson: 'Raju Bhai', contactPhone: '9000000001' });
  const brand2 = await Brand.create({ name: 'Sunrise Beverages', description: 'Beverage brand', contactPerson: 'Suresh Kumar', contactPhone: '9000000002' });

  // Products
  const products = await Product.insertMany([
    { name: 'Soap Bar 100g', sku: 'SOAP100', brand: brand1._id, category: 'Personal Care', unit: 'piece', mrp: 30, sellingPrice: 25 },
    { name: 'Shampoo 200ml', sku: 'SHAM200', brand: brand1._id, category: 'Personal Care', unit: 'piece', mrp: 120, sellingPrice: 100 },
    { name: 'Detergent 1kg', sku: 'DET1KG', brand: brand1._id, category: 'Household', unit: 'kg', mrp: 90, sellingPrice: 75 },
    { name: 'Orange Juice 1L', sku: 'OJ1L', brand: brand2._id, category: 'Beverages', unit: 'litre', mrp: 80, sellingPrice: 65 },
    { name: 'Mango Drink 500ml', sku: 'MD500', brand: brand2._id, category: 'Beverages', unit: 'piece', mrp: 40, sellingPrice: 32 },
  ]);

  // Inventory
  await Inventory.insertMany(products.map((p, i) => ({ product: p._id, currentStock: [500, 300, 400, 200, 600][i], reorderLevel: 50 })));

  // Industry
  const industry = await Industry.create({
    name: 'Metro Distributors Pvt Ltd',
    type: 'FMCG Distributor',
    gstin: '27AAPFU0939F1Z5',
    contactPerson: 'Mahesh Gupta',
    email: 'metro@example.com',
    phone: '9800000001',
    address: { street: '12, Industrial Area', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    brands: [brand1._id, brand2._id],
  });

  // Stores
  await Store.insertMany([
    { name: 'Sharma General Store', ownerName: 'Ramesh Sharma', phone: '9700000001', route: 'Route A', assignedStaff: staff1._id, address: { street: 'MG Road', city: 'Pune', pincode: '411002' } },
    { name: 'Patel Kirana', ownerName: 'Suresh Patel', phone: '9700000002', route: 'Route A', assignedStaff: staff1._id, address: { street: 'FC Road', city: 'Pune', pincode: '411004' } },
    { name: 'Kumar Super Mart', ownerName: 'Vikram Kumar', phone: '9700000003', route: 'Route B', assignedStaff: staff2._id, address: { street: 'JM Road', city: 'Pune', pincode: '411005' } },
    { name: 'Singh Provisions', ownerName: 'Gurpreet Singh', phone: '9700000004', route: 'Route B', assignedStaff: staff2._id, address: { street: 'Deccan', city: 'Pune', pincode: '411004' } },
  ]);

  console.log('✅ Seed complete!');
  console.log('Admin: admin@dms.com / admin123');
  console.log('Staff: rahul@dms.com / staff123');
  console.log('Staff: priya@dms.com / staff123');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
