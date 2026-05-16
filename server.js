const express = require("express");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const port = 3000;
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static("uploads"));

let photoid = 0;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);


cloudinary.config({
  cloud_name: "dwqytdhto",
  api_key: "556416947557853",
  api_secret: "qgXlDxwrmYeLL9hORrOucbg3n08",
});


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => ({
    folder: "uploads",
    public_id: "P" + photoid,
    format: path.extname(file.originalname).replace(".", ""),
  }),
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);
    if (extName && mimeType) cb(null, true);
    else cb(new Error("Only images (JPEG, PNG, GIF) are allowed"));
  },
});



app.get("/hi", (req, res) => {
  res.send("K haal hai");
});

// -----------------------------------------Upload Route-------------------------------------------------------------------------

app.post("/upload", upload.single("avtar"), async (req, res) => {
  const { name, price, tag, mode } = req.body;

  console.log("Uploaded file:", req.file);

  const { data, error } = await supabase
    .from("products")
    .insert([{ image_url: req.file.path, name, mode, price, tag }]);

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).send("Error saving to Supabase");
  }

  photoid++;
  res.send("Group created successfully!");
});

// --------------------------------------------- Get Products by Tag----------------------------------------------------------------
app.get("/getdatabytag/:tagname", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("tag", `#${req.params.tagname}`);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: "Error fetching data" });
  }

  res.json(data);
});

// ----------------------------------------------------- Add User--------------------------------------------------------------------

app.get("/adduser/:email/:name", async (req, res) => {
  const { email, name } = req.params;

  const { data: existingUser, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (fetchError) {
    console.error(fetchError);
    return res.status(500).json({ error: "Database error" });
  }

  if (!existingUser) {
    const { error: insertError } = await supabase
      .from("users")
      .insert([{ email, name, other: "" }]);
    if (insertError) {
      console.error(insertError);
      return res.status(500).json({ error: "Error adding user" });
    }
  } else {
    console.log("User already exists");
  }

  res.send("User processed successfully");
});



// 🔍 Search products by name (case-insensitive, partial match)
app.get("/search/:name", async (req, res) => {
  const searchTerm = req.params.name;

  // Use Supabase's ilike operator for case-insensitive partial matching
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .ilike("name", `%${searchTerm}%`);

  if (error) {
    console.error("Search error:", error);
    return res.status(500).json({ error: "Error searching products" });
  }

  res.json(data);
});



app.get("/", (req, res) => res.send("BYY"));

// ✅ Start Server
app.listen(port, async () => {
  
  console.log(`🚀 Server running at http://localhost:${port}`);
});
