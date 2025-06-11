const express = require("express");
const Auth = require("./router/auth");
const Admin = require("./router/admin");
const Cafe = require("./router/cafe");
const User = require("./router/user");
const app = express();
const cors = require("cors");

const dotenv = require("dotenv");
dotenv.config();

// const webpush = require("web-push");
// webpush.setVapidDetails(
//   `mailto:${process.env.MAIL}`,
//   process.env.PUBLIC_VAPID_KEY,
//   process.env.PRIVATE_VAPID_KEY
// );

// enable cors
app.use(cors());

const cookies = require("cookie-parser");

app.use(express.json({ limit: "50mb" }));
app.use(
  express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 })
);
app.use(cookies());
app.use("/api/auth", Auth);
app.use("/api/admin", Admin);
app.use("/api/cafe", Cafe);
app.use("/api/user", User);
app.get("/health", (req, res) => {
  res.json({ msg: "This is a mistake" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => console.log(`Server Running on ${PORT}`));
