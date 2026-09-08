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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
let polygonCache = null;
let polygonCacheLoad = null;
const asArray = (value) => {
    if (!value)
        return [];
    return Array.isArray(value) ? value : [value];
};
const parseCoordinateText = (coordinates) => {
    var _a;
    const coordText = (_a = coordinates === null || coordinates === void 0 ? void 0 : coordinates._text) === null || _a === void 0 ? void 0 : _a.trim();
    if (!coordText)
        return null;
    const ring = coordText
        .split("\n")
        .map((line) => {
        const [lng, lat] = line.trim().split(",").map(Number);
        return [lng, lat];
    })
        .filter((pair) => pair.length === 2 && pair.every((n) => Number.isFinite(n)));
    return ring.length >= 4 ? ring : null;
};
const collectPlacemarks = (result) => {
    var _a, _b, _c, _d;
    const placemarks = [];
    const folders = asArray((_b = (_a = result === null || result === void 0 ? void 0 : result.kml) === null || _a === void 0 ? void 0 : _a.Document) === null || _b === void 0 ? void 0 : _b.Folder);
    for (const folder of folders) {
        placemarks.push(...asArray(folder === null || folder === void 0 ? void 0 : folder.Placemark));
    }
    if (!folders.length) {
        placemarks.push(...asArray((_d = (_c = result === null || result === void 0 ? void 0 : result.kml) === null || _c === void 0 ? void 0 : _c.Document) === null || _d === void 0 ? void 0 : _d.Placemark));
    }
    return placemarks;
};
const extractPolygonsFromXml = (xml) => {
    var _a, _b, _c, _d, _e, _f;
    const result = xml_js_1.default.xml2js(xml, { compact: true });
    const polygons = [];
    for (const placemark of collectPlacemarks(result)) {
        const singleRing = parseCoordinateText((_c = (_b = (_a = placemark === null || placemark === void 0 ? void 0 : placemark.Polygon) === null || _a === void 0 ? void 0 : _a.outerBoundaryIs) === null || _b === void 0 ? void 0 : _b.LinearRing) === null || _c === void 0 ? void 0 : _c.coordinates);
        if (singleRing)
            polygons.push(singleRing);
        for (const polygon of asArray((_d = placemark === null || placemark === void 0 ? void 0 : placemark.MultiGeometry) === null || _d === void 0 ? void 0 : _d.Polygon)) {
            const ring = parseCoordinateText((_f = (_e = polygon === null || polygon === void 0 ? void 0 : polygon.outerBoundaryIs) === null || _e === void 0 ? void 0 : _e.LinearRing) === null || _f === void 0 ? void 0 : _f.coordinates);
            if (ring)
                polygons.push(ring);
        }
    }
    return polygons;
};
const loadPolygonsFromLayers = (locationsXmlFile) => __awaiter(void 0, void 0, void 0, function* () {
    const layers = locationsXmlFile.split(",").map((layer) => layer.trim()).filter(Boolean);
    const polygons = [];
    for (const layer of layers) {
        const response = yield fetch(layer, {
            method: "GET",
            headers: {
                "Content-Type": "text/xml",
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch locations XML ${layer}: ${response.status}`);
        }
        const xml = yield response.text();
        polygons.push(...extractPolygonsFromXml(xml));
    }
    return polygons;
});
const getCachedPolygons = () => __awaiter(void 0, void 0, void 0, function* () {
    const key = LOCATIONS_XML_FILE;
    if (!key) {
        throw new Error("LOCATIONS_XML_FILE is not set");
    }
    if ((polygonCache === null || polygonCache === void 0 ? void 0 : polygonCache.key) === key) {
        return polygonCache.polygons;
    }
    if (!polygonCacheLoad) {
        polygonCacheLoad = loadPolygonsFromLayers(key)
            .then((polygons) => {
            polygonCache = { key, polygons };
            console.log(`Cached ${polygons.length} delivery polygons from ${key}`);
            return polygons;
        })
            .finally(() => {
            polygonCacheLoad = null;
        });
    }
    return polygonCacheLoad;
});
// ======================= CHECKOUT ADDRESS PRESENCE IN POLYGON =======================
const checkout_address_validation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.body.address1 || !req.body.city || !req.body.zip)
            return res.status(400).json({ message: "Missing required address fields" });
        const { address1, address2, city, zip } = req.body;
        let address = "";
        if (address1)
            address += address1 + ", ";
        // if (address2) address += address2 + ", ";
        if (city)
            address += city + ", ";
        if (zip)
            address += zip;
        console.log("Address: ", address);
        const coordinatesArray = yield getCachedPolygons();
        if (!coordinatesArray.length)
            return res.status(404).json({ message: "Folder not found" });
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
            let lat = json.results["0"].geometry.location.lat;
            let lng = json.results["0"].geometry.location.lng;
            return [lng, lat];
        });
        if (!addressPoint) {
            return res.status(200).json({ data: false });
        }
        const point = turf.point(addressPoint);
        let isInside = false;
        for (const polygonCoords of coordinatesArray) {
            try {
                const polygon = turf.polygon([polygonCoords]);
                if (turf.booleanPointInPolygon(point, polygon)) {
                    isInside = true;
                    break;
                }
            }
            catch (_a) {
                continue;
            }
        }
        console.log(`Address: ${address} is inside: ${isInside}`);
        return res.status(200).json({
            data: isInside,
        });
    }
    catch (error) {
        return res.status(500).json({ error });
    }
});
exports.checkout_address_validation = checkout_address_validation;
