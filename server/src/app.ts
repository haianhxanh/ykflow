/*-----------Import Essential Packages-----------*/
import logger from "morgan";
import dotenv from "dotenv";
import get_inquries_route from "./routes/inquiry.route";
import { db } from "./database_connection/db_connect";

/*------Importing ExpressJs----------*/
import express from "express";
var cors = require("cors");
const app = express();

var corsOptions = {
  origin: [
    "https://yeskrabickyflow-dev-frontend.onrender.com",
    "https://yeskrabickyflow.onrender.com",
    "https://yes-krabicky-dev.myshopify.com",
    "https://yes-krabicky-checkout.myshopify.com",
    "https://test-yes-krabicky.myshopify.com",
    "https://yeskrabicky.cz",
    "https://admin.shopify.com/store/yes-krabicky",
    "https://yes-krabicky.myshopify.com",
    "https://extensions.shopifycdn.com",
  ],
  optionsSuccessStatus: 200,
  methods: "GET, PUT, POST",
};

app.use(cors(corsOptions));
/*--------env setup-----------*/
dotenv.config();
const { PORT } = process.env;

/*----------Middlewares-------------*/
app.use(express.json());
app.use(logger("dev"));
app.use(express.urlencoded({ extended: false }));

// Global timeout middleware (3 minutes)
app.use((req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.log(`Request timeout for ${req.method} ${req.path}`);
      return res.status(408).json({ error: "Request timeout" });
    }
  }, 300000);

  // Clear timeout when response is sent
  res.on("finish", () => clearTimeout(timeout));
  res.on("close", () => clearTimeout(timeout));

  next();
});

app.use("/", get_inquries_route);

/*----Checking Database Connection-------------*/
db.sync({ alter: true })
  .then(() => {
    console.log("Database is connected SUCCESSFULLY");
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });

/*------------PORT SETUP--------------------*/
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
