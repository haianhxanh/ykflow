import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";
import XLSX from "xlsx";
import { Request, Response } from "express";

dotenv.config();

const { TENANT_ID, CLIENT_ID, CLIENT_SECRET, SHAREPOINT_HOSTNAME, SITE_PATH, EXCEL_FILE_NAME, WORKSHEET_NAME } = process.env;

async function getAccessToken() {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = qs.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await axios.post(url, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return res.data.access_token;
}

async function getSiteId(token: string) {
  const url = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_HOSTNAME}:${SITE_PATH}`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.id;
}

async function getFiles(driveId: string, token: string) {
  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

async function getDriveId(siteId: string, token: string) {
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(res.data);
  return res.data.value[0].id;
}

async function getWorksheetData(driveId: string, token: string) {
  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${EXCEL_FILE_NAME}:/workbook/worksheets('${WORKSHEET_NAME}')/usedRange`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export const getSpreadsheetData = async (req: Request, res: Response) => {
  try {
    console.log("test");
    // return res.status(200).json({ message: "test" });

    const token = await getAccessToken();
    const siteId = await getSiteId(token);
    const driveId = await getDriveId(siteId, token);
    const files = await getFiles(driveId, token);

    // fetch the file download url
    const file = files.value.find((file: any) => file.name === EXCEL_FILE_NAME);
    // return res.status(200).json({ file });

    const fileDownloadUrl = file["@microsoft.graph.downloadUrl"];

    // First, download the file using axios with arraybuffer response type
    const response = await axios.get(fileDownloadUrl, {
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const workbook = XLSX.read(response.data, { type: "buffer" });

    // Get the first worksheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    return res.status(200).json(data);
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Failed to fetch spreadsheet data",
      details: err.response?.data || err.message,
    });
  }
};
