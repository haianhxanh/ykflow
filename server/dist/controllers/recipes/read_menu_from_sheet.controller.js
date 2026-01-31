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
exports.read_menu_from_sheet = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const helpers_1 = require("../../utils/helpers");
const graphqlHelper_1 = require("../../utils/graphqlHelper");
const metaobjects_1 = require("../../queries/metaobjects");
const metafields_1 = require("../../queries/metafields");
dotenv_1.default.config();
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
const formatNumber = (number) => {
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
const read_menu_from_sheet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleteMonday = req.query.weekToDelete;
        const createMonday = req.query.weekToCreate;
        const deleteWeekDates = (0, helpers_1.getWeekWorkDates)(deleteMonday);
        const createWeekDates = (0, helpers_1.getWeekWorkDates)(createMonday);
        const menuData = yield fetchGoogleSheet(MENU_SHEET_URL);
        const groupedData = groupMenuItemsByDay(menuData);
        const mealMetaobjectsInputs = yield createMealMetaobjectsInput(groupedData, createWeekDates);
        yield deactivateMealMetaobjects(deleteWeekDates);
        yield createMealMetaobjects(mealMetaobjectsInputs);
        return res.status(200).json({
            message: "Menu from sheet created successfully",
        });
    }
    catch (error) {
        console.error("Error fetching menu from sheet:", error);
        return res.status(500).json({
            error: "Failed to fetch menu data",
            details: error.message,
        });
    }
});
exports.read_menu_from_sheet = read_menu_from_sheet;
const fetchGoogleSheet = (url) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }
    const tsvText = yield response.text();
    const lines = tsvText.trim().split("\n");
    if (lines.length === 0) {
        return [];
    }
    const headers = lines[1].split("\t").map((h) => h.trim());
    const data = lines
        .slice(2)
        .map((line) => {
        const values = line.split("\t");
        const row = {};
        headers.forEach((header, index) => {
            var _a;
            row[header] = ((_a = values[index]) === null || _a === void 0 ? void 0 : _a.trim()) || "";
        });
        return row;
    })
        .filter((item) => item["PO"] !== "");
    return data;
});
const groupMenuItemsByDay = (data) => {
    const grouped = {};
    for (const [index, item] of data.entries()) {
        if (index === 0) {
            // Monday
            grouped["1"] = [item];
        }
        else {
            if (!CZECH_DAYS.includes(item["PO"])) {
                // add to the latest group
                grouped[Object.keys(grouped)[Object.keys(grouped).length - 1]].push(item);
            }
            else {
                // create new group
                grouped[DATES_MAPPING[item["PO"]]] = [];
            }
        }
    }
    return grouped;
};
const deactivateMealMetaobjects = (weekDates) => __awaiter(void 0, void 0, void 0, function* () {
    for (const date of weekDates) {
        for (const mealIndex of MEAL_INDEXES) {
            const mealMetaobject = yield graphqlHelper_1.shopifyClient.request(metaobjects_1.metaobjectByHandleQuery, {
                handle: {
                    type: MENU_METAOBJECT_TYPE,
                    handle: `${date}-${mealIndex}`,
                },
            });
            if (!mealMetaobject.metaobjectByHandle)
                continue;
            if (mealMetaobject.metaobjectByHandle.capabilities.publishable.status !== "ACTIVE")
                continue;
            yield graphqlHelper_1.shopifyClient.request(metafields_1.metaobjectUpdateMutation, {
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
});
const buildMealFields = (date, mealIndex, mealData) => {
    var _a;
    const fields = [
        { key: "date", value: date },
        { key: "type", value: MEAL_TYPES_MAPPING[mealIndex] },
        { key: "name", value: mealData["PO"] },
        {
            key: "allergens",
            value: JSON.stringify(((_a = mealData["ALERGENY"]) === null || _a === void 0 ? void 0 : _a.split(",").map((allergen) => allergen.trim()).filter((allergen) => allergen !== "").filter((allergen) => ALLERGEN_VALUES.includes(allergen)).filter((allergen, index, self) => self.indexOf(allergen) === index)) || []),
        },
        {
            key: "heating_option",
            value: mealData["OHŘEV"],
        },
    ];
    // Add numeric fields for large and small portions
    ["VP", "MP"].forEach((portionPrefix) => {
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
const createMealMetaobjectsInput = (data, weekDates) => __awaiter(void 0, void 0, void 0, function* () {
    const mealMetaobjectsInput = [];
    for (const [czechDayIndex, czechData] of CZECH_DAYS.entries()) {
        const dayData = data[czechDayIndex + 1];
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
});
const createMealMetaobjects = (mealMetaobjectsInputs) => __awaiter(void 0, void 0, void 0, function* () {
    for (const mealMetaobjectInput of mealMetaobjectsInputs) {
        try {
            const result = yield graphqlHelper_1.shopifyClient.request(metaobjects_1.metaobjectUpsertMutation, {
                handle: {
                    type: MENU_METAOBJECT_TYPE,
                    handle: mealMetaobjectInput.handle,
                },
                metaobject: mealMetaobjectInput,
            });
            if (result.metaobjectUpsert.userErrors && result.metaobjectUpsert.userErrors.length > 0) {
                console.error("Error creating meal metaobject:", mealMetaobjectInput, result.metaobjectUpsert.userErrors);
            }
        }
        catch (error) {
            console.error("Error creating meal metaobject:", error);
        }
    }
});
