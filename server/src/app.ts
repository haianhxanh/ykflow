/*-----------Import Essential Packages-----------*/
import logger from "morgan";
import dotenv from "dotenv";
import get_inquries_route from "./routes/inquiry.route";
import { db } from "./database_connection/db_connect";
import timeout from "connect-timeout";

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

app.use("/", get_inquries_route);
app.use(timeout("5m"));

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
