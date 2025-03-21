import { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import xml2js from "xml-js";
import * as turf from "@turf/turf";
dotenv.config();
const { GOOGLE_GEOCODING_API_KEY, LOCATIONS_XML_FILE } = process.env;

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
    let placemarks = [] as any;
    let coordinates = [] as any;
    let layers = (LOCATIONS_XML_FILE as string).split(",");

    for (const [index, layer] of layers.entries()) {
      // if (index != 0) continue;
      const response = await fetch(layer, {
        method: "GET",
        headers: {
          "Content-Type": "text/xml",
        },
      })
        .then(function (response: any) {
          return response.text();
        })
        .then(function (xml: any) {
          let result = xml2js.xml2js(xml, { compact: true }) as any;
          // return res.status(200).json(result?.kml?.Document?.Folder);
          if (result?.kml?.Document?.Folder) {
            for (const folder of result.kml.Document.Folder) {
              if (folder?.Placemark) {
                if (folder.Placemark.length > 0)
                  for (const placemark of folder.Placemark) {
                    placemarks.push(placemark);
                  }
                else {
                  placemarks.push(folder.Placemark);
                }
              }
            }
          } else if (result?.kml?.Document?.Placemark) {
            if (result?.kml?.Document?.Placemark?.length > 0) {
              for (const placemark of result.kml.Document.Placemark) {
                placemarks.push(placemark);
              }
            } else if (result?.kml?.Document?.Placemark) {
              placemarks.push(result.kml.Document.Placemark);
            }
          }
          return result;
        });
    }

    if (!placemarks) return res.status(404).json({ message: "Folder not found" });

    for (const [index, placemark] of placemarks.entries()) {
      for (const [index, placemark] of placemarks.entries()) {
        if (placemark?.Polygon?.outerBoundaryIs?.LinearRing?.coordinates) {
          coordinates.push(placemark.Polygon.outerBoundaryIs.LinearRing.coordinates);
        }
      }
    }

    let coordinatesArray = coordinates.map((c: any) => {
      const coordText = c._text.trim();
      const coordLines = coordText.split("\n");
      return coordLines.map((line: string) => {
        const [lng, lat] = line.trim().split(",").map(Number);
        return [lng, lat];
      });
    });

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
    // return res.status(200).json(addressPoint);

    const point = turf.point(addressPoint as any);

    let isInside = false;
    for (const polygonCoords of coordinatesArray) {
      const polygon = turf.polygon([polygonCoords]);
      if (turf.booleanPointInPolygon(point, polygon)) {
        isInside = true;
        break;
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
