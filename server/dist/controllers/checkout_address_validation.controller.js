"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.checkout_address_validation = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const xml_js_1 = __importDefault(require("xml-js"));
const turf = __importStar(require("@turf/turf"));
dotenv_1.default.config();
const { GOOGLE_GEOCODING_API_KEY, LOCATIONS_XML_FILE } = process.env;
// ======================= CHECKOUT ADDRESS PRESENCE IN POLYGON =======================
const checkout_address_validation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        if (!req.body.address1 || !req.body.city || !req.body.zip)
            return res
                .status(400)
                .json({ message: "Missing required address fields" });
        const { address1, address2, city, zip } = req.body;
        let address = "";
        if (address1)
            address += address1 + ", ";
        if (address2)
            address += address2 + ", ";
        if (city)
            address += city + ", ";
        if (zip)
            address += zip;
        console.log("Address: ", address);
        let folder = [];
        let coordinates = [];
        const response = yield fetch(LOCATIONS_XML_FILE, {
            method: "GET",
            headers: {
                "Content-Type": "text/xml",
            },
        })
            .then(function (response) {
            return response.text();
        })
            .then(function (xml) {
            let result = xml_js_1.default.xml2js(xml, { compact: true });
            folder = result.kml.Document.Folder;
            return folder;
        });
        if (!folder)
            return res.status(404).json({ message: "Folder not found" });
        for (const [index, coordinate] of folder.entries()) {
            if (((_a = coordinate === null || coordinate === void 0 ? void 0 : coordinate.Placemark) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                for (const [i, c] of coordinate.Placemark.entries()) {
                    if ((_d = (_c = (_b = c === null || c === void 0 ? void 0 : c.Polygon) === null || _b === void 0 ? void 0 : _b.outerBoundaryIs) === null || _c === void 0 ? void 0 : _c.LinearRing) === null || _d === void 0 ? void 0 : _d.coordinates) {
                        coordinates.push(c.Polygon.outerBoundaryIs.LinearRing.coordinates);
                    }
                }
            }
            else {
                if ((_h = (_g = (_f = (_e = coordinate === null || coordinate === void 0 ? void 0 : coordinate.Placemark) === null || _e === void 0 ? void 0 : _e.Polygon) === null || _f === void 0 ? void 0 : _f.outerBoundaryIs) === null || _g === void 0 ? void 0 : _g.LinearRing) === null || _h === void 0 ? void 0 : _h.coordinates) {
                    coordinates.push(coordinate.Placemark.Polygon.outerBoundaryIs.LinearRing.coordinates);
                }
            }
        }
        let coordinatesArray = coordinates.map((c) => {
            const coordText = c._text.trim();
            const coordLines = coordText.split("\n");
            return coordLines.map((line) => {
                const [lng, lat] = line.trim().split(",").map(Number);
                return [lng, lat];
            });
        });
        // TEST
        // address = "Moravská 757/71, 700 30 Ostrava-jih-Hrabůvka";
        let encodedAddress = encodeURIComponent(address);
        const addressPoint = yield axios_1.default
            .get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_GEOCODING_API_KEY}`)
            .then((res) => res.data)
            .then((json) => {
            if (json.results.length === 0) {
                return null;
            }
            if (json.results["0"].partial_match) {
                return false;
            }
            let lat = json.results["0"].geometry.location.lat;
            let lng = json.results["0"].geometry.location.lng;
            return [lng, lat];
        });
        if (!addressPoint) {
            return res.status(200).json({ data: false });
        }
        // return res.status(200).json(addressPoint);
        const point = turf.point(addressPoint);
        let isInside = false;
        for (const polygonCoords of coordinatesArray) {
            const polygon = turf.polygon([polygonCoords]);
            if (turf.booleanPointInPolygon(point, polygon)) {
                isInside = true;
                break;
            }
        }
        return res.status(200).json({
            data: isInside,
        });
    }
    catch (error) {
        return res.status(500).json({ error });
    }
});
exports.checkout_address_validation = checkout_address_validation;
