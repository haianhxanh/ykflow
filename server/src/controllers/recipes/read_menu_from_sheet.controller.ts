import { Request, Response } from "express";
import dotenv from "dotenv";
import { getWeekWorkDates } from "../../utils/helpers";
import { shopifyClient } from "../../utils/graphqlHelper";
import { metaobjectByHandleQuery, metaobjectUpsertMutation } from "../../queries/metaobjects";
import { metaobjectUpdateMutation } from "../../queries/metafields";
dotenv.config();

const { MENU_SHEET_URL } = process.env;
const MENU_METAOBJECT_TYPE = "meal";
const MEAL_INDEXES = ["1", "2", "3", "4", "5"];
const CZECH_DAYS = ["PO", "ÚT", "ST", "ČT", "PÁ"];
const DATES_MAPPING = {
  PO: "1",
  ÚT: "2",
  ST: "3",
  ČT: "4",
  PÁ: "5",
};
const MEAL_TYPES_MAPPING = {
  "0": "Snídaně",
  "1": "Svačina 1",
  "2": "Oběd",
  "3": "Svačina 2",
  "4": "Večeře",
};
const formatNumber = (number: string) => {
  return number.replace(",", ".");
};
const ALLERGEN_VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"];

// Mapping for numeric fields (portion prefix -> field suffix)
const numericFieldMappings = {
  VP: [
    { header: "VP - KCAL", suffix: "kcal" },
    { header: "VP - B", suffix: "proteins" },
    { header: "VP - S", suffix: "sugar" },
    { header: "VP - T", suffix: "fat" },
    { header: "VP - V", suffix: "fiber" },
  ],
  MP: [
    { header: "MP - KCAL", suffix: "kcal" },
    { header: "MP - B", suffix: "proteins" },
    { header: "MP - S", suffix: "sugar" },
    { header: "MP - T", suffix: "fat" },
    { header: "MP - V", suffix: "fiber" },
  ],
};

export const read_menu_from_sheet = async (req: Request, res: Response) => {
  try {
    const deleteMonday = req.query.weekToDelete as string;
    const createMonday = req.query.weekToCreate as string;
    const deleteWeekDates = getWeekWorkDates(deleteMonday);
    const createWeekDates = getWeekWorkDates(createMonday);

    const menuData = await fetchGoogleSheet(MENU_SHEET_URL as string);

    const groupedData = groupMenuItemsByDay(menuData);
    const mealMetaobjectsInputs = await createMealMetaobjectsInput(groupedData, createWeekDates);
    await deactivateMealMetaobjects(deleteWeekDates);
    await createMealMetaobjects(mealMetaobjectsInputs);
    return res.status(200).json({
      message: "Menu from sheet created successfully",
    });
  } catch (error: any) {
    console.error("Error fetching menu from sheet:", error);
    return res.status(500).json({
      error: "Failed to fetch menu data",
      details: error.message,
    });
  }
};

const fetchGoogleSheet = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.statusText}`);
  }

  const tsvText = await response.text();

  const lines = tsvText.trim().split("\n");
  if (lines.length === 0) {
    return [];
  }

  const headers = lines[1].split("\t").map((h) => h.trim());

  const data = lines
    .slice(2)
    .map((line) => {
      const values = line.split("\t");
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || "";
      });
      return row;
    })
    .filter((item) => item["PO"] !== "");

  return data;
};

const groupMenuItemsByDay = (data: Record<string, string>[]) => {
  const grouped: Record<string, any[]> = {};

  for (const [index, item] of data.entries()) {
    if (index === 0) {
      // Monday
      grouped["1"] = [item];
    } else {
      if (!CZECH_DAYS.includes(item["PO"])) {
        // add to the latest group
        grouped[Object.keys(grouped)[Object.keys(grouped).length - 1]].push(item);
      } else {
        // create new group
        grouped[DATES_MAPPING[item["PO"] as keyof typeof DATES_MAPPING]] = [];
      }
    }
  }

  return grouped;
};

const deactivateMealMetaobjects = async (weekDates: string[]) => {
  for (const date of weekDates) {
    for (const mealIndex of MEAL_INDEXES) {
      const mealMetaobject = await shopifyClient.request(metaobjectByHandleQuery, {
        handle: {
          type: MENU_METAOBJECT_TYPE,
          handle: `${date}-${mealIndex}`,
        },
      });
      if (!mealMetaobject.metaobjectByHandle) continue;
      if (mealMetaobject.metaobjectByHandle.capabilities.publishable.status !== "ACTIVE") continue;
      await shopifyClient.request(metaobjectUpdateMutation, {
        id: mealMetaobject.metaobjectByHandle.id,
        metaobject: {
          capabilities: {
            publishable: {
              status: "DRAFT",
            },
          },
        },
      });
    }
  }
};

const buildMealFields = (date: string, mealIndex: number, mealData: Record<string, string>): Array<{ key: string; value: any }> => {
  const fields: Array<{ key: string; value: any }> = [
    { key: "date", value: date },
    { key: "type", value: MEAL_TYPES_MAPPING[mealIndex as unknown as keyof typeof MEAL_TYPES_MAPPING] },
    { key: "name", value: mealData["PO"] },
    {
      key: "allergens",
      value: JSON.stringify(
        mealData["ALERGENY"]
          ?.split(",")
          .map((allergen: string) => allergen.trim())
          .filter((allergen: string) => allergen !== "")
          .filter((allergen: string) => ALLERGEN_VALUES.includes(allergen)) || []
      ),
    },
    {
      key: "heating_option",
      value: mealData["OHŘEV"],
    },
  ];

  // Add numeric fields for large and small portions
  (["VP", "MP"] as const).forEach((portionPrefix) => {
    numericFieldMappings[portionPrefix].forEach(({ header, suffix }) => {
      const fieldKey = `${portionPrefix === "VP" ? "large" : "small"}_portion_${suffix}`;
      fields.push({
        key: fieldKey,
        value: mealData[header] ? formatNumber(mealData[header]) : null,
      });
    });
  });

  return fields.filter((field) => field.value !== null);
};

const createMealMetaobjectsInput = async (data: Record<string, any[]>, weekDates: string[]) => {
  const mealMetaobjectsInput: Record<string, any>[] = [];

  for (const [czechDayIndex, czechData] of CZECH_DAYS.entries()) {
    const dayData = data[czechDayIndex + 1] as Record<string, any>[];
    const date = weekDates[czechDayIndex];

    for (const [mealIndex, mealData] of dayData.entries()) {
      const handle = `${date}-${mealIndex + 1}`;
      const mealInput = {
        handle,
        capabilities: {
          publishable: {
            status: "DRAFT",
          },
        },
        fields: buildMealFields(date, mealIndex, mealData),
      };
      mealMetaobjectsInput.push(mealInput);
    }
  }

  return mealMetaobjectsInput;
};

const createMealMetaobjects = async (mealMetaobjectsInputs: Record<string, any>[]) => {
  for (const mealMetaobjectInput of mealMetaobjectsInputs) {
    try {
      const result = await shopifyClient.request(metaobjectUpsertMutation, {
        handle: {
          type: MENU_METAOBJECT_TYPE,
          handle: mealMetaobjectInput.handle,
        },
        metaobject: mealMetaobjectInput,
      });
      if (result.metaobjectUpsert.userErrors && result.metaobjectUpsert.userErrors.length > 0) {
        console.error("Error creating meal metaobject:", mealMetaobjectInput, result.metaobjectUpsert.userErrors);
      }
    } catch (error) {
      console.error("Error creating meal metaobject:", error);
    }
  }
};
