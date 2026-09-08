import { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import xml2js from "xml-js";
import * as turf from "@turf/turf";
dotenv.config();
const { GOOGLE_GEOCODING_API_KEY, LOCATIONS_XML_FILE } = process.env;

type LngLatRing = number[][];

let polygonCache: { key: string; polygons: LngLatRing[] } | null = null;
let polygonCacheLoad: Promise<LngLatRing[]> | null = null;

const asArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const parseCoordinateText = (coordinates: any): LngLatRing | null => {
  const coordText = coordinates?._text?.trim();
  if (!coordText) return null;
  const ring = coordText
    .split("\n")
    .map((line: string) => {
      const [lng, lat] = line.trim().split(",").map(Number);
      return [lng, lat];
    })
    .filter((pair: number[]) => pair.length === 2 && pair.every((n) => Number.isFinite(n)));
  return ring.length >= 4 ? ring : null;
};

const collectPlacemarks = (result: any): any[] => {
  const placemarks: any[] = [];
  const folders = asArray(result?.kml?.Document?.Folder);
  for (const folder of folders) {
    placemarks.push(...asArray(folder?.Placemark));
  }
  if (!folders.length) {
    placemarks.push(...asArray(result?.kml?.Document?.Placemark));
  }
  return placemarks;
};

const extractPolygonsFromXml = (xml: string): LngLatRing[] => {
  const result = xml2js.xml2js(xml, { compact: true }) as any;
  const polygons: LngLatRing[] = [];

  for (const placemark of collectPlacemarks(result)) {
    const singleRing = parseCoordinateText(placemark?.Polygon?.outerBoundaryIs?.LinearRing?.coordinates);
    if (singleRing) polygons.push(singleRing);

    for (const polygon of asArray(placemark?.MultiGeometry?.Polygon)) {
      const ring = parseCoordinateText(polygon?.outerBoundaryIs?.LinearRing?.coordinates);
      if (ring) polygons.push(ring);
    }
  }

  return polygons;
};

const loadPolygonsFromLayers = async (locationsXmlFile: string): Promise<LngLatRing[]> => {
  const layers = locationsXmlFile.split(",").map((layer) => layer.trim()).filter(Boolean);
  const polygons: LngLatRing[] = [];

  for (const layer of layers) {
    const response = await fetch(layer, {
      method: "GET",
      headers: {
        "Content-Type": "text/xml",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch locations XML ${layer}: ${response.status}`);
    }
    const xml = await response.text();
    polygons.push(...extractPolygonsFromXml(xml));
  }

  return polygons;
};

const getCachedPolygons = async (): Promise<LngLatRing[]> => {
  const key = LOCATIONS_XML_FILE as string;
  if (!key) {
    throw new Error("LOCATIONS_XML_FILE is not set");
  }
  if (polygonCache?.key === key) {
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
};

// ======================= CHECKOUT ADDRESS PRESENCE IN POLYGON =======================

export const checkout_address_validation = async (req: Request, res: Response) => {
  try {
    if (!req.body.address1 || !req.body.city || !req.body.zip) return res.status(400).json({ message: "Missing required address fields" });

    const { address1, address2, city, zip } = req.body;
    let address = "";
    if (address1) address += address1 + ", ";
    // if (address2) address += address2 + ", ";
    if (city) address += city + ", ";
    if (zip) address += zip;
    console.log("Address: ", address);

    const coordinatesArray = await getCachedPolygons();
    if (!coordinatesArray.length) return res.status(404).json({ message: "Folder not found" });

    // TEST
    // address = "Moravská 757/71, 700 30 Ostrava-jih-Hrabůvka";
    let encodedAddress = encodeURIComponent(address);

    const addressPoint = await axios
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

    const point = turf.point(addressPoint as any);

    let isInside = false;
    for (const polygonCoords of coordinatesArray) {
      try {
        const polygon = turf.polygon([polygonCoords]);
        if (turf.booleanPointInPolygon(point, polygon)) {
          isInside = true;
          break;
        }
      } catch {
        continue;
      }
    }

    console.log(`Address: ${address} is inside: ${isInside}`);

    return res.status(200).json({
      data: isInside,
    });
  } catch (error) {
    return res.status(500).json({ error });
  }
};
