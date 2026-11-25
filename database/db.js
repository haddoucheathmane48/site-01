

const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "le-safran.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_ar TEXT NOT NULL,
    name_fr TEXT NOT NULL,
    description_ar TEXT DEFAULT '',
    description_fr TEXT DEFAULT '',
    price REAL NOT NULL DEFAULT 0,
    image TEXT DEFAULT '',
    category TEXT DEFAULT '',
    available INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT DEFAULT '',
    items TEXT NOT NULL,
    total REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    guests INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const bookingColumns = db.prepare("PRAGMA table_info(bookings)").all();

if (!bookingColumns.some(column => column.name === "status")) {
  db.exec(`
    ALTER TABLE bookings
    ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
  `);
}

const products = [
  {id:1,c:"starters",p:650,img:"photo-1546069901-ba9599a7e63c",ar:["سلطة الحديقة","خضار طازجة وجبن ماعز وزيت زيتون"],fr:["Salade du jardin","Légumes frais, chèvre et huile d'olive"]},
  {id:2,c:"starters",p:550,img:"photo-1482049016688-2d3e1b311543",ar:["بريك بالبيض","ورقة رقيقة مقرمشة بالبيض والتونة"],fr:["Brick à l'œuf","Feuille croustillante, œuf et thon"]},
  {id:3,c:"mains",p:1800,img:"photo-1504674900247-0877df9cc836",ar:["كسكس ملكي","سميد بخاري مع الخضار واللحم والدجاج"],fr:["Couscous royal","Semoule vapeur, légumes, agneau et poulet"]},
  {id:4,c:"mains",p:2400,img:"photo-1544025162-d76694265947",ar:["ستيك على الفحم","لحم بقري طري مع صلصة الزعفران"],fr:["Entrecôte grillée","Bœuf tendre, sauce au safran"]},
  {id:5,c:"mains",p:2200,img:"photo-1555939594-58d7cb561ad1",ar:["مشاوي مشكلة","كفتة ودجاج ولحم على الجمر"],fr:["Grillades mixtes","Kefta, poulet et agneau au charbon"]},
  {id:6,c:"mains",p:1700,img:"photo-1473093295043-cdd812d0e601",ar:["معكرونة بالجمبري","جمبري وثوم وطماطم وريحان"],fr:["Pâtes aux crevettes","Crevettes, ail, tomate et basilic"]},
  {id:7,c:"desserts",p:600,img:"photo-1578985545062-69928b1d9587",ar:["فوندان الشوكولاتة","قلب دافئ مع آيس كريم الفانيلا"],fr:["Fondant au chocolat","Cœur coulant et glace vanille"]},
  {id:8,c:"drinks",p:250,img:"",ar:["شاي بالنعناع","شاي أخضر بالنعناع الطازج"],fr:["Thé à la menthe","Thé vert à la menthe fraîche"]}
];

const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products
  (id, name_ar, name_fr, description_ar, description_fr, price, image, category)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const importProducts = db.transaction(() => {
  for (const product of products) {
    insertProduct.run(
      product.id,
      product.ar[0],
      product.fr[0],
      product.ar[1],
      product.fr[1],
      product.p,
      product.img,
      product.c
    );
  }
});

importProducts();

module.exports = db;
