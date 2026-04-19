# DistributeIQ — B2B Distribution Management System

A full-stack B2B Distribution Management System built with React, Node.js, Express, and MongoDB.

---

## 📁 Folder Structure

```
dms/
├── backend/
│   ├── config/
│   │   └── cloudinary.js          # Cloudinary upload config
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── brandController.js
│   │   ├── productController.js
│   │   ├── inventoryController.js
│   │   ├── industryController.js
│   │   ├── storeController.js
│   │   ├── orderController.js
│   │   ├── invoiceController.js
│   │   ├── paymentController.js
│   │   ├── attendanceController.js
│   │   ├── deliveryLogController.js
│   │   ├── dashboardController.js
│   │   └── reportController.js
│   ├── middleware/
│   │   ├── auth.js                # JWT protect + role middleware
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Brand.js
│   │   ├── Product.js
│   │   ├── Inventory.js
│   │   ├── Industry.js
│   │   ├── Store.js
│   │   ├── Order.js
│   │   ├── Invoice.js
│   │   ├── Payment.js
│   │   ├── Attendance.js
│   │   └── DeliveryLog.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── brands.js
│   │   ├── products.js
│   │   ├── inventory.js
│   │   ├── industries.js
│   │   ├── stores.js
│   │   ├── orders.js
│   │   ├── invoices.js
│   │   ├── payments.js
│   │   ├── attendance.js
│   │   ├── deliveryLogs.js
│   │   ├── reports.js
│   │   └── dashboard.js
│   ├── utils/
│   │   └── seed.js                # Database seeder
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   └── AdminLayout.js
│   │   │   ├── staff/
│   │   │   │   └── StaffLayout.js
│   │   │   └── shared/
│   │   │       ├── DataTable.js
│   │   │       ├── Modal.js
│   │   │       └── StatusBadge.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── admin/
│   │   │   │   ├── Dashboard.js
│   │   │   │   ├── Orders.js
│   │   │   │   ├── Products.js
│   │   │   │   ├── Inventory.js
│   │   │   │   ├── Industries.js
│   │   │   │   ├── Stores.js
│   │   │   │   ├── Brands.js
│   │   │   │   ├── Employees.js
│   │   │   │   ├── Invoices.js
│   │   │   │   ├── Payments.js
│   │   │   │   ├── Reports.js
│   │   │   │   └── AttendanceAdmin.js
│   │   │   └── staff/
│   │   │       ├── StaffDashboard.js
│   │   │       ├── MyDeliveries.js
│   │   │       ├── DeliveryDetail.js
│   │   │       ├── StaffAttendance.js
│   │   │       └── StaffPayments.js
│   │   ├── services/
│   │   │   └── api.js             # All Axios API calls
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
│
├── package.json                    # Root — run both servers together
├── render.yaml                     # Render.com backend deploy config
├── vercel.json                     # Vercel frontend deploy config
└── .gitignore
```

---

## 🔑 API Routes Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/login | Public | Login |
| GET | /api/auth/me | Any | Get current user |
| GET | /api/dashboard/admin | Admin | Admin dashboard stats |
| GET | /api/dashboard/staff | Staff | Staff dashboard stats |
| GET/POST | /api/orders | Admin | List / Create orders |
| PUT | /api/orders/:id/assign | Admin | Assign staff to order |
| GET | /api/orders/my-orders | Staff | Staff's assigned orders |
| GET/POST | /api/delivery-logs | Any | Delivery logs |
| PUT | /api/delivery-logs/:id/status | Staff | Update delivery status |
| POST | /api/delivery-logs/:id/proof | Staff | Upload proof image |
| POST | /api/attendance/check-in | Staff | Geo-tagged check in |
| POST | /api/attendance/check-out | Staff | Geo-tagged check out |
| GET | /api/reports/sales | Admin | Sales report |
| GET | /api/reports/export?type=orders | Admin | Export CSV |
| ... and all CRUD routes for brands, products, inventory, industries, stores, users, invoices, payments |

---

## ⚙️ Prerequisites

Make sure you have these installed:

- **Node.js** v18 or higher → https://nodejs.org
- **npm** v9 or higher (comes with Node)
- **Git** → https://git-scm.com

---

## 🚀 LOCAL SETUP (Step-by-Step)

### STEP 1 — Get a Free MongoDB Atlas Database

1. Go to → https://www.mongodb.com/atlas
2. Click **"Try Free"** and create an account
3. Create a **free M0 cluster** (choose any region)
4. In **Database Access** → Add a user, e.g. `dmsadmin` / `dmspassword123`
5. In **Network Access** → Click "Add IP Address" → Choose **"Allow Access from Anywhere"** (0.0.0.0/0)
6. Click **Connect** → **"Connect your application"** → Copy the connection string
   - It looks like: `mongodb+srv://dmsadmin:dmspassword123@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - Change `?retryWrites` to `/dms?retryWrites` to name your database `dms`

---

### STEP 2 — Get Free Cloudinary Credentials (for image uploads)

1. Go to → https://cloudinary.com
2. Sign up for a free account
3. On the Dashboard you'll see:
   - **Cloud Name** (e.g. `dxyz123abc`)
   - **API Key** (e.g. `123456789012345`)
   - **API Secret** (e.g. `abc123xyz...`)
4. Keep these handy for the next step

---

### STEP 3 — Configure Backend Environment

```bash
# Navigate into the backend folder
cd dms/backend

# Copy the example env file
cp .env.example .env

# Open .env and fill in your values:
```

Edit `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://dmsadmin:dmspassword123@cluster0.xxxxx.mongodb.net/dms?retryWrites=true&w=majority
JWT_SECRET=mySuper$ecretKey_ChangeThis_2024!
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
CLIENT_URL=http://localhost:3000
```

---

### STEP 4 — Configure Frontend Environment

```bash
# Navigate into the frontend folder
cd dms/frontend

# Create a .env file
cp .env.example .env
```

Edit `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

### STEP 5 — Install All Dependencies

**Option A — Install everything from root (recommended):**
```bash
# From the dms/ root directory
cd dms
npm install          # installs concurrently
cd backend && npm install
cd ../frontend && npm install
```

**Option B — Install separately:**
```bash
# Terminal 1 — Backend
cd dms/backend
npm install

# Terminal 2 — Frontend
cd dms/frontend
npm install
```

---

### STEP 6 — Seed the Database (Create Demo Data)

```bash
cd dms/backend
npm run seed
```

This creates:
- ✅ Admin user: `admin@dms.com` / `admin123`
- ✅ Staff user: `rahul@dms.com` / `staff123`
- ✅ Staff user: `priya@dms.com` / `staff123`
- ✅ 2 Brands, 5 Products with inventory
- ✅ 1 Industry partner
- ✅ 4 Sample stores

---

### STEP 7 — Start the Application

**Option A — Run both servers together from root:**
```bash
cd dms
npm run dev
```

**Option B — Run separately (in two terminals):**

Terminal 1 (Backend):
```bash
cd dms/backend
npm run dev
# Server starts at http://localhost:5000
```

Terminal 2 (Frontend):
```bash
cd dms/frontend
npm start
# App opens at http://localhost:3000
```

---

### STEP 8 — Open the App

- **Admin Panel**: http://localhost:3000 → Login with `admin@dms.com` / `admin123`
- **Staff App**: http://localhost:3000 → Login with `rahul@dms.com` / `staff123`

The app will automatically redirect to the correct interface based on the user's role.

---

## ☁️ DEPLOYMENT (Free Hosting)

### Deploy Backend to Render.com (Free)

1. Push your code to GitHub
2. Go to → https://render.com → Sign up free
3. Click **"New Web Service"** → Connect GitHub → Select your repo
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Add Environment Variables (same as your `.env` file):
   - `MONGO_URI` → your Atlas connection string
   - `JWT_SECRET` → your secret key
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `CLIENT_URL` → your Vercel frontend URL (add this after deploying frontend)
6. Click **Deploy** — your backend URL will be like `https://dms-backend.onrender.com`

> ⚠️ Free Render instances sleep after 15 min of inactivity. First request after sleep takes ~30 seconds.

---

### Deploy Frontend to Vercel (Free)

1. Go to → https://vercel.com → Sign up free
2. Click **"New Project"** → Import from GitHub → Select your repo
3. Configure:
   - **Framework**: Create React App
   - **Root Directory**: `frontend`
4. Add Environment Variables:
   - `REACT_APP_API_URL` → `https://your-backend.onrender.com/api`
   - `REACT_APP_SOCKET_URL` → `https://your-backend.onrender.com`
5. Click **Deploy** — your app URL will be like `https://dms-app.vercel.app`

6. **Important**: Go back to Render → Your backend → Environment → Update `CLIENT_URL` to your Vercel URL

---

## 🧪 Testing the Full Flow

Once running, test this end-to-end workflow:

1. **Login as Admin** (`admin@dms.com`)
2. **Create a Brand** → Brands → Add Brand
3. **Create Products** → Products → Add Product (with initial stock)
4. **Create an Industry** → Industries → Add Industry
5. **Create Stores** → Stores → Add Store (assign to staff)
6. **Create an Order** → Orders → New Order (select industry + products)
7. **Assign Staff** → Orders → Click "Assign" on the order → Select staff + delivery date
8. **Login as Staff** (`rahul@dms.com`)
9. **Check In** → Attendance → Check In Now (allow location)
10. **View Orders** → Deliveries → Assigned Orders tab
11. **Create Delivery Log** → (Admin creates via API or you can extend UI)
12. **Update Delivery** → Deliveries → Click a delivery → Update Status → Delivered
13. **Record Payment** → Deliveries → Record Payment → Enter amount
14. **View Reports** → Login as Admin → Reports

---

## 🔧 Troubleshooting

### "Cannot connect to MongoDB"
- Check your `MONGO_URI` in `.env`
- Ensure your IP is whitelisted in MongoDB Atlas Network Access
- Make sure the database user password has no special characters (or URL-encode them)

### "CORS error in browser"
- Make sure `CLIENT_URL` in backend `.env` matches exactly your frontend URL
- Ensure you're not mixing `http` and `https`

### "Location not working on iOS Safari"
- The app must be served over **HTTPS** for geolocation to work on iOS
- On localhost it works fine; for production use Vercel/Render (both are HTTPS)

### "Image upload failing"
- Double-check your Cloudinary credentials in `.env`
- Make sure Cloudinary free tier has not exceeded its storage limit

### "Staff can't see their orders"
- Orders must be assigned to the staff member by the admin first
- Staff only see orders where `assignedStaff` equals their user ID

### Port already in use
```bash
# Kill whatever is using port 5000
lsof -ti:5000 | xargs kill -9
# Or change PORT in backend/.env
```

---

## 📱 Staff Mobile App Tips

- Open http://localhost:3000 on your phone (on the same WiFi)
  - Or use your computer's local IP, e.g. `http://192.168.1.5:3000`
- Staff app is mobile-first with a bottom navigation bar
- Works as a PWA — staff can "Add to Home Screen" on iOS/Android

---

## 🔐 Default Credentials After Seeding

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dms.com | admin123 |
| Staff | rahul@dms.com | staff123 |
| Staff | priya@dms.com | staff123 |

> ⚠️ Change these passwords immediately in production via the Employees page!
