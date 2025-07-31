"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*-----------Import Essential Packages-----------*/
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const inquiry_route_1 = __importDefault(require("./routes/inquiry.route"));
const db_connect_1 = require("./database_connection/db_connect");
/*------Importing ExpressJs----------*/
const express_1 = __importDefault(require("express"));
var cors = require("cors");
const app = (0, express_1.default)();
var corsOptions = {
    origin: [
        "https://yeskrabickyflow-dev-frontend.onrender.com",
        "https://yeskrabickyflow.onrender.com",
        "https://yes-krabicky-dev.myshopify.com",
        "https://test-store-yes-krabicky.myshopify.com",
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
dotenv_1.default.config();
const { PORT } = process.env;
/*----------Middlewares-------------*/
app.use(express_1.default.json());
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.urlencoded({ extended: false }));
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
app.use("/", inquiry_route_1.default);
/*----Checking Database Connection-------------*/
db_connect_1.db.sync({ alter: true })
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
exports.default = app;
