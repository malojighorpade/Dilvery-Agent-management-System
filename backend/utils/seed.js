const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
dotenv.config();

const User = require('../models/User');
const Brand = require('../models/Brand');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Industry = require('../models/Industry');
const Store = require('../models/Store');

const {
  Payment,
  OnlinePayment,
  CashPayment,
  ChequePayment
} = require('../models/Payment');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}),
    Brand.deleteMany({}),
    Product.deleteMany({}),
    Inventory.deleteMany({}),
    Industry.deleteMany({}),
    Store.deleteMany({}),
    Payment.deleteMany({}),
    OnlinePayment.deleteMany({}),
    CashPayment.deleteMany({}),
    ChequePayment.deleteMany({})
  ]);

  // 🔐 PASSWORD
  const adminPass = await bcrypt.hash('admin123', 10);
  const staffPass = await bcrypt.hash('staff123', 10);

  // 👤 USERS
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@dms.com',
    password: adminPass,
    role: 'admin',
    phone: '9999999999',
  });

  const staff1 = await User.create({
    name: 'Rahul Sharma',
    email: 'rahul@dms.com',
    password: staffPass,
    role: 'delivery agent',
    phone: '9876543210',
    vehicleType: 'low',
    licenseNumber: "124343443",
    vehicleNumber: 'MH45AB1234'
  });

  const staff2 = await User.create({
    name: 'Priya Singh',
    email: 'priya@dms.com',
    password: staffPass,
    role: 'delivery agent',
    phone: '9876543211',
    vehicleType: 'mid',
    licenseNumber: "2342434338",
    vehicleNumber: 'MH45CD5678'
  });

  // 🏪 STORE
  const stores = await Store.insertMany([
    {
      name: 'Sharma General Store',
      ownerName: 'Ramesh Sharma',
      phone: '9700000001',
      route: 'Route A',
      assignedStaff: staff1._id,
      address: { street: 'MG Road', city: 'Pune', pincode: '411002' }
    }
  ]);

  const store = stores[0];

  // ===============================
  // 💳 ONLINE PAYMENT
  // ===============================
  const onlinePayment = await Payment.create({
    store: store._id,
    storeName: store.name, // ✅ FIX
    amount: 1000,
    paymentMode: 'online',
    collectedBy: staff1._id
  });

  await OnlinePayment.create({
    payment: onlinePayment._id,
    orderId: 'ORD001',
    transactionId: 'TXN1001',
    amount: 1000,
    date: new Date(),
  });

  // ===============================
  // 💵 CASH PAYMENT
  // ===============================
  const cashData = [
    { amount: 5000, denominations: { '500': 5, '200': 10, '100': 5 } },
    { amount: 3000, denominations: { '500': 4, '200': 5 } }
  ];

  for (let item of cashData) {
    const payment = await Payment.create({
      store: store._id,
      storeName: store.name, // ✅ FIX
      amount: item.amount,
      paymentMode: 'cash',
      collectedBy: staff1._id
    });

    await CashPayment.create({
      payment: payment._id,
      amount: payment.amount,
      denominations: item.denominations
    });
  }

  // ===============================
  // 🏦 CHEQUE PAYMENT
  // ===============================
  const chequePayment = await Payment.create({
    store: store._id,
    storeName: store.name, // ✅ FIX
    amount: 2000,
    paymentMode: 'cheque',
    collectedBy: staff1._id
  });

  await ChequePayment.create({
    payment: chequePayment._id,
    chequeNumber: 'CHQ123456',
    amount: 2000,
    chequeDate: new Date('2026-04-10'),
    chequeImage: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
  });

  console.log('🎉 Seed completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});