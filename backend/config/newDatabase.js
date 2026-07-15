//backend/config/newDatabase.js
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const newDB = mongoose.createConnection(
  process.env.PROJECTS_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);


newDB.on("connected", () => {
  console.log("✅ New Database connected successfully");
});


newDB.on("error", (err) => {
  console.error("❌ New Database connection error:", err);
});


module.exports = newDB;