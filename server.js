
const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const db = require("./database/db");
require("./config/admin");

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "le-safran-local-secret-change-before-deployment",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use((req, res, next) => {
  if (req.path.startsWith("/admin") && !req.session.admin) {
    if (req.path === "/admin/login.html") return next();
    return res.redirect("/admin/login.html");
  }
  next();
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "يرجى إدخال بيانات الدخول" });
  }

  const admin = db.prepare(
    "SELECT * FROM admins WHERE username = ?"
  ).get(username);

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
  }

  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ message: "حدث خطأ في تسجيل الدخول" });
    }

    req.session.admin = {
      id: admin.id,
      username: admin.username
    };

    res.json({ message: "تم تسجيل الدخول بنجاح" });
  });
});

function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({ message: "غير مصرح بالدخول" });
  }
  next();
}

function normalizeAlgerianPhone(phone) {
  const cleanPhone = String(phone).replace(/[\s().-]/g, "");

  if (/^0[567]\d{8}$/.test(cleanPhone)) {
    return cleanPhone;
  }

  if (/^\+213[567]\d{8}$/.test(cleanPhone)) {
    return "0" + cleanPhone.slice(4);
  }

  if (/^00213[567]\d{8}$/.test(cleanPhone)) {
    return "0" + cleanPhone.slice(5);
  }

  return null;
}

app.get("/api/products", (req, res) => {
  const products = db.prepare(
    "SELECT * FROM products WHERE available = 1 ORDER BY id DESC"
  ).all();

  res.setHeader("Cache-Control", "no-store");
  res.json(products);
});

app.post("/api/bookings", (req, res) => {
  const { customer_name, phone, booking_date, guests } = req.body;

  if (!customer_name || !phone || !booking_date || !guests) {
    return res.status(400).json({ message: "يرجى ملء جميع بيانات الحجز" });
  }

  const cleanPhone = normalizeAlgerianPhone(phone);

  if (!cleanPhone) {
    return res.status(400).json({
      message: "يرجى إدخال رقم هاتف جزائري صحيح يبدأ بـ 05 أو 06 أو 07"
    });
  }

  const guestCount = Number(guests);

  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 30) {
    return res.status(400).json({ message: "عدد الأشخاص غير صحيح" });
  }

  const result = db.prepare(`
    INSERT INTO bookings
    (customer_name, phone, booking_date, booking_time, guests)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    customer_name.trim(),
    cleanPhone,
    booking_date,
    "غير محدد",
    guestCount
  );

  res.json({
    message: "تم استلام طلب الحجز بنجاح",
    id: result.lastInsertRowid
  });
});

app.post("/api/orders", (req, res) => {
  const { customer_name, phone, address, items } = req.body;

  if (!customer_name || !phone || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: "بيانات الطلب غير مكتملة" });
  }

  let total = 0;
  const orderItems = [];

  for (const item of items) {
    const product = db.prepare(
      "SELECT id, name_ar, name_fr, price FROM products WHERE id = ? AND available = 1"
    ).get(item.id);

    const quantity = Number(item.quantity);

    if (!product || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: "أحد المنتجات غير متوفر" });
    }

    total += product.price * quantity;

    orderItems.push({
      id: product.id,
      name_ar: product.name_ar,
      name_fr: product.name_fr,
      price: product.price,
      quantity
    });
  }

  const result = db.prepare(`
    INSERT INTO orders
    (customer_name, phone, address, items, total)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    customer_name,
    phone,
    address || "",
    JSON.stringify(orderItems),
    total
  );

  res.json({
    message: "تم إرسال الطلب بنجاح",
    id: result.lastInsertRowid
  });
});

app.get("/api/admin/products", requireAdmin, (req, res) => {
  const products = db.prepare(
    "SELECT * FROM products ORDER BY id DESC"
  ).all();

  res.json(products);
});

app.post("/api/admin/products", requireAdmin, (req, res) => {
  const {
    name_ar,
    name_fr,
    description_ar,
    description_fr,
    price,
    image,
    category
  } = req.body;

  if (!name_ar || !name_fr || !Number.isFinite(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ message: "بيانات المنتج غير صحيحة" });
  }

  const result = db.prepare(`
    INSERT INTO products
    (name_ar, name_fr, description_ar, description_fr, price, image, category)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    name_ar,
    name_fr,
    description_ar || "",
    description_fr || "",
    Number(price),
    image || "",
    category || ""
  );

  res.json({
    message: "تمت إضافة المنتج",
    id: result.lastInsertRowid
  });
});

app.put("/api/admin/products/:id", requireAdmin, (req, res) => {
  const {
    name_ar,
    name_fr,
    description_ar,
    description_fr,
    price,
    image,
    category,
    available
  } = req.body;

  if (!name_ar || !name_fr || !Number.isFinite(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ message: "بيانات المنتج غير صحيحة" });
  }

  const result = db.prepare(`
    UPDATE products SET
    name_ar = ?,
    name_fr = ?,
    description_ar = ?,
    description_fr = ?,
    price = ?,
    image = ?,
    category = ?,
    available = ?
    WHERE id = ?
  `).run(
    name_ar,
    name_fr,
    description_ar || "",
    description_fr || "",
    Number(price),
    image || "",
    category || "",
    available === 0 ? 0 : 1,
    req.params.id
  );

  res.json({
    message: "تم تحديث المنتج",
    changes: result.changes
  });
});

app.get("/api/admin/bookings", requireAdmin, (req, res) => {
  const bookings = db.prepare(
    "SELECT * FROM bookings ORDER BY id DESC"
  ).all();

  res.json(bookings);
});

app.put("/api/admin/bookings/:id/confirm", requireAdmin, (req, res) => {
  const result = db.prepare(
    "UPDATE bookings SET status = 'confirmed' WHERE id = ?"
  ).run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ message: "الحجز غير موجود" });
  }

  res.json({ message: "تم تأكيد الحجز بنجاح" });
});

app.put("/api/admin/bookings/:id/reject", requireAdmin, (req, res) => {
  const result = db.prepare(
    "UPDATE bookings SET status = 'rejected' WHERE id = ?"
  ).run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ message: "الحجز غير موجود" });
  }

  res.json({ message: "تم رفض الحجز بنجاح" });
});


app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const orders = db.prepare(
    "SELECT * FROM orders ORDER BY id DESC"
  ).all();

  res.json(orders);
});

app.put("/api/admin/orders/:id/status", requireAdmin, (req, res) => {
  const allowedStatuses = [
    "confirmed",
    "preparing",
    "out_for_delivery",
    "delivered"
  ];

  const { status } = req.body;

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "حالة الطلب غير صالحة" });
  }

  const result = db.prepare(
    "UPDATE orders SET status = ? WHERE id = ?"
  ).run(status, req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ message: "الطلب غير موجود" });
  }

  res.json({ message: "تم تحديث حالة الطلب بنجاح" });
});
app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  const result = db.prepare(
    "DELETE FROM products WHERE id = ?"
  ).run(req.params.id);

  res.json({
    message: "تم حذف المنتج",
    changes: result.changes
  });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "تم تسجيل الخروج" });
  });
});

app.get("/api/admin/check", (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    username: req.session.admin.username
  });
});

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Le Safran fonctionne sur http://localhost:${PORT}`);
});
