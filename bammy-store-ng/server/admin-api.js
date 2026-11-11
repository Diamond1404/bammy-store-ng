// Owner-only BAMMY STORE NG admin API (SQLite-backed).
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

module.exports = function createAdminApi(db, config) {
  const router = express.Router();
  const uploadDir = path.join(__dirname, "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (_req, file, cb) => cb(null, Date.now() + "-" + crypto.randomBytes(5).toString("hex") + path.extname(file.originalname).toLowerCase())
    }),
    limits: { fileSize: 5 *  1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
  });

  function requireAdmin(req, res, next) {
    try {
      const token = req.cookies?.bammy_admin;
      if (!token) return res.status(401).json({ error: "Please sign in." });
      req.admin = jwt.verify(token, config.jwtSecret);
      next();
    } catch {
      res.clearCookie("bammy_admin");
      return res.status(401).json({ error: "Your session expired. Please sign in again." });
    }
  }
  const safe = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  router.post("/login", safe(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password || email.toLowerCase() !== config.adminEmail.toLowerCase())
      return res.status(401).json({ error: "Invalid email or password." });
    const ok = await bcrypt.compare(password, config.adminPasswordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password." });
    const token = jwt.sign({ role: "owner", email: config.adminEmail }, config.jwtSecret, { expiresIn: "8h" });
    res.cookie("bammy_admin", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 8 * 60 * 60 * 1000 });
    res.json({ ok: true });
  }));
  router.post("/logout", (_req, res) => { res.clearCookie("bammy_admin"); res.json({ ok: true }); });
  router.get("/me", requireAdmin, (req, res) => res.json({ email: req.admin.email, role: "owner" }));

  router.get("/dashboard", requireAdmin, (req, res) => {
    const revenue = db.prepare("SELECT COALESCE(SUM(total),0) n FROM orders WHERE payment_status='paid'").get().n;
    const orders = db.prepare("SELECT COUNT(*) n FROM orders").get().n;
    const pending = db.prepare("SELECT COUNT(*) n FROM orders WHERE status IN ('pending','processing')").get().n;
    const products = db.prepare("SELECT COUNT(*) n FROM products WHERE active=1").get().n;
    const lowStock = db.prepare("SELECT COUNT(*) n FROM products WHERE active=1 AND stock<=5").get().n;
    const recent = db.prepare("SELECT id,reference,customer_name,total,status,payment_status,created_at FROM orders ORDER BY id DESC LIMIT 8").all();
    res.json({ revenue, orders, pending, products, lowStock, recent });
  });

  router.get("/products", requireAdmin, (_req, res) => res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all()));
  router.post("/products", requireAdmin, upload.single("image"), (req, res) => {
    const { name, category, description = "", price, stock = 0, tag = "", active = "1" } = req.body;
    if (!name?.trim() || !category?.trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0)
      return res.status(400).json({ error: "Enter a product name, category, valid price and whole-number stock." });
    const image = req.file ? "/uploads/" + req.file.filename : (req.body.imageUrl || "");
    const info = db.prepare("INSERT INTO products(name,category,description,price,stock,image,tag,active,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
      .run(name.trim(), category.trim(), description, Number(price), Number(stock), image, tag, active === "1" ? 1 : 0, new Date().toISOString());
    res.status(201).json(db.prepare("SELECT * FROM products WHERE id=?").get(info.lastInsertRowid));
  });
  router.put("/products/:id", requireAdmin, upload.single("image"), (req, res) => {
    const old = db.prepare("SELECT * FROM products WHERE id=?").get(Number(req.params.id));
    if (!old) return res.status(404).json({ error: "Product not found." });
    const b = req.body;
    const image = req.file ? "/uploads/" + req.file.filename : (b.imageUrl || old.image);
    db.prepare("UPDATE products SET name=?,category=?,description=?,price=?,stock=?,image=?,tag=?,active=? WHERE id=?")
      .run(b.name ?? old.name, b.category ?? old.category, b.description ?? old.description, Number(b.price ?? old.price), Number(b.stock ?? old.stock), image, b.tag ?? old.tag, b.active === undefined ? old.active : (b.active === "1" ? 1 : 0), old.id);
    res.json(db.prepare("SELECT * FROM products WHERE id=?").get(old.id));
  });
  router.delete("/products/:id", requireAdmin, (req, res) => {
    db.prepare("UPDATE products SET active=0 WHERE id=?").run(Number(req.params.id));
    res.json({ ok: true });
  });

  router.get("/orders", requireAdmin, (_req, res) => res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 500").all()));
  router.patch("/orders/:id", requireAdmin, (req, res) => {
    const allowed = ["pending","processing","shipped","delivered","cancelled"];
    const { status, paymentStatus, paymentNote } = req.body || {};
    if (status && !allowed.includes(status)) return res.status(400).json({ error: "Invalid order status." });
    if (paymentStatus && !["pending","paid","failed","refunded"].includes(paymentStatus)) return res.status(400).json({ error: "Invalid payment status." });
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(Number(req.params.id));
    if (!order) return res.status(404).json({ error: "Order not found." });
    db.prepare("UPDATE orders SET status=?,payment_status=?,payment_note=? WHERE id=?")
      .run(status || order.status, paymentStatus || order.payment_status, paymentNote ?? order.payment_note, order.id);
    res.json(db.prepare("SELECT * FROM orders WHERE id=?").get(order.id));
  });

  router.get("/payments", requireAdmin, (_req, res) => res.json(db.prepare("SELECT id,reference,customer_email,total,payment_method,payment_status,payment_note,created_at FROM orders ORDER BY id DESC LIMIT 500").all()));
  router.get("/customers", requireAdmin, (_req, res) => res.json(db.prepare("SELECT email,MAX(customer_name) name,MAX(phone) phone,COUNT(*) orders,COALESCE(SUM(CASE WHEN payment_status='paid' THEN total ELSE 0 END),0) spent,MAX(created_at) last_order FROM orders GROUP BY email ORDER BY last_order DESC").all()));
  router.get("/reports", requireAdmin, (_req, res) => {
    const byMonth = db.prepare("SELECT strftime('%Y-%m',created_at) month, SUM(CASE WHEN payment_status='paid' THEN total ELSE 0 END) revenue,COUNT(*) orders FROM orders GROUP BY month ORDER BY month DESC LIMIT 12").all();
    const best = db.prepare("SELECT p.name,p.stock,COALESCE(SUM(oi.quantity),0) sold FROM products p LEFT JOIN order_items oi ON oi.product_id=p.id GROUP BY p.id ORDER BY sold DESC LIMIT 10").all();
    res.json({ byMonth, best });
  });
  router.get("/promotions", requireAdmin, (_req, res) => res.json(db.prepare("SELECT * FROM promotions ORDER BY id DESC").all()));
  router.post("/promotions", requireAdmin, (req, res) => {
    const { code, discountType, discountValue, expiresAt = "", active = 1 } = req.body || {};
    if (!code?.trim() || !["percent","fixed"].includes(discountType) || !(Number(discountValue) > 0))
      return res.status(400).json({ error: "Enter a code and valid discount." });
    const info = db.prepare("INSERT INTO promotions(code,discount_type,discount_value,expires_at,active) VALUES(?,?,?,?,?)")
      .run(code.trim().toUpperCase(), discountType, Number(discountValue), expiresAt, active ? 1 : 0);
    res.status(201).json(db.prepare("SELECT * FROM promotions WHERE id=?").get(info.lastInsertRowid));
  });
  router.delete("/promotions/:id", requireAdmin, (req, res) => { db.prepare("DELETE FROM promotions WHERE id=?").run(Number(req.params.id)); res.json({ ok: true }); });

  router.use((err, _req, res, _next) => {
    console.error("Admin API error:", err.message);
    res.status(400).json({ error: err.message || "Admin request failed." });
  });
  return { router, requireAdmin };
};
