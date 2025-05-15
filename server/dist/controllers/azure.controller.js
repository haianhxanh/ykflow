"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSpreadsheetData = void 0;
const axios_1 = __importDefault(require("axios"));
const qs_1 = __importDefault(require("qs"));
const dotenv_1 = __importDefault(require("dotenv"));
const xlsx_1 = __importDefault(require("xlsx"));
dotenv_1.default.config();
const { TENANT_ID, CLIENT_ID, CLIENT_SECRET, SHAREPOINT_HOSTNAME, SITE_PATH, EXCEL_FILE_NAME, WORKSHEET_NAME } = process.env;
function getAccessToken() {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
        const body = qs_1.default.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            scope: "https://graph.microsoft.com/.default",
            grant_type: "client_credentials",
        });
        const res = yield axios_1.default.post(url, body, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        return res.data.access_token;
    });
}
function getSiteId(token) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_HOSTNAME}:${SITE_PATH}`;
        const res = yield axios_1.default.get(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data.id;
    });
}
function getFiles(driveId, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`;
        const res = yield axios_1.default.get(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    });
}
function getDriveId(siteId, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`;
        const res = yield axios_1.default.get(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log(res.data);
        return res.data.value[0].id;
    });
}
function getWorksheetData(driveId, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${EXCEL_FILE_NAME}:/workbook/worksheets('${WORKSHEET_NAME}')/usedRange`;
        const res = yield axios_1.default.get(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    });
}
const getSpreadsheetData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        console.log("test");
        // return res.status(200).json({ message: "test" });
        const token = yield getAccessToken();
        const siteId = yield getSiteId(token);
        const driveId = yield getDriveId(siteId, token);
        const files = yield getFiles(driveId, token);
        // fetch the file download url
        const file = files.value.find((file) => file.name === EXCEL_FILE_NAME);
        // return res.status(200).json({ file });
        const fileDownloadUrl = file["@microsoft.graph.downloadUrl"];
        // First, download the file using axios with arraybuffer response type
        const response = yield axios_1.default.get(fileDownloadUrl, {
            responseType: "arraybuffer",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const workbook = xlsx_1.default.read(response.data, { type: "buffer" });
        // Get the first worksheet
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        // Convert to JSON
        const data = xlsx_1.default.utils.sheet_to_json(worksheet);
        return res.status(200).json(data);
    }
    catch (err) {
        console.error("Error:", ((_a = err.response) === null || _a === void 0 ? void 0 : _a.data) || err.message);
        return res.status(500).json({
            error: "Failed to fetch spreadsheet data",
            details: ((_b = err.response) === null || _b === void 0 ? void 0 : _b.data) || err.message,
        });
    }
});
exports.getSpreadsheetData = getSpreadsheetData;
