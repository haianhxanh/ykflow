import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import xml2js from "xml-js";
import * as turf from "@turf/turf";
dotenv.config();
const { GOOGLE_GEOCODING_API_KEY, LOCATIONS_XML_FILE } = process.env;

// ======================= CHECKOUT ADDRESS PRESENCE IN POLYGON =======================

export const checkout_address_validation = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.body.address1 || !req.body.city || !req.body.zip)
      return res
        .status(400)
        .json({ message: "Missing required address fields" });

    const { address1, address2, city, zip } = req.body;
    let address = `${address1} ${address2}, ${city}, ${zip}`;
    console.log("Address: ", address);
    let folder = [] as any;
    let coordinates = [] as any;

    const response = await fetch(LOCATIONS_XML_FILE as string, {
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
        folder = result.kml.Document.Folder;
        return folder;
      });

    if (!folder) return res.status(404).json({ message: "Folder not found" });

    for (const [index, coordinate] of folder.entries()) {
      if (coordinate?.Placemark?.length > 0) {
        for (const [i, c] of coordinate.Placemark.entries()) {
          if (c?.Polygon?.outerBoundaryIs?.LinearRing?.coordinates) {
            coordinates.push(c.Polygon.outerBoundaryIs.LinearRing.coordinates);
          }
        }
      } else {
        if (
          coordinate?.Placemark?.Polygon?.outerBoundaryIs?.LinearRing
            ?.coordinates
        ) {
          coordinates.push(
            coordinate.Placemark.Polygon.outerBoundaryIs.LinearRing.coordinates
          );
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
      .get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_GEOCODING_API_KEY}`
      )
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

    const point = turf.point(addressPoint as any);

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
  } catch (error) {
    return res.status(500).json({ error });
  }
};
