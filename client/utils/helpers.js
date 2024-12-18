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
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_inquiries = exports.deleteInquiry = exports.updateInquiryStatus = exports.parseInquiryStatus = exports.convertDateToISOString = exports.convertDate = exports.getFutureBusinessDate = exports.getBusinessDatesCount = void 0;
const constants_1 = require("./constants");
const getBusinessDatesCount = (start, end) => {
    let count = 0;
    let startDate = new Date((0, exports.convertDate)(start));
    let endDate = new Date((0, exports.convertDate)(end));
    while (startDate < endDate) {
        const dayOfWeek = startDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6)
            count++;
        startDate.setDate(startDate.getDate() + 1);
    }
    return count;
};
exports.getBusinessDatesCount = getBusinessDatesCount;
const getFutureBusinessDate = (start, days) => {
    let count = 0;
    let startDate = new Date((0, exports.convertDate)(start));
    while (count < days) {
        startDate.setDate(startDate.getDate() + 1);
        if (startDate.getDay() != 0 && startDate.getDay() != 6)
            count++;
    }
    let future_year = new Date(startDate).getFullYear();
    let future_month = new Date(startDate).getMonth() + 1;
    let future_date = new Date(startDate).getDate();
    return `${future_date}-${future_month}-${future_year}`;
};
exports.getFutureBusinessDate = getFutureBusinessDate;
const convertDate = (date) => {
    let dateArray = date.split("-");
    return `${dateArray[1]}-${dateArray[0]}-${dateArray[2]}`;
};
exports.convertDate = convertDate;
const convertDateToISOString = (date) => {
    let dateArray = date.split("-");
    return `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}`;
};
exports.convertDateToISOString = convertDateToISOString;
const parseInquiryStatus = (status) => {
    let parsedString;
    switch (status) {
        case constants_1.STATUS.NEW:
            parsedString = constants_1.STATUS_STRINGS.NEW;
            break;
        case constants_1.STATUS.APPROVED:
            parsedString = constants_1.STATUS_STRINGS.APPROVED;
            break;
        case constants_1.STATUS.DECLINED:
            parsedString = constants_1.STATUS_STRINGS.DECLINED;
            break;
        default:
            parsedString = "";
    }
    return parsedString;
};
exports.parseInquiryStatus = parseInquiryStatus;
const updateInquiryStatus = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    let statusString;
    if (status == constants_1.STATUS.APPROVED)
        statusString = constants_1.STATUS.APPROVED;
    if (status == constants_1.STATUS.DECLINED)
        statusString = constants_1.STATUS.DECLINED;
    const body = {
        id: id,
        status: statusString,
    };
    const jsonBody = JSON.stringify(body);
    const res = yield fetch(process.env.NEXT_PUBLIC_URL_UPDATE_INQUIRIES, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_APP_SECRET_KEY}`,
            "Content-Type": "application/json",
        },
        body: jsonBody,
    });
    const message = yield res.json();
    return message;
});
exports.updateInquiryStatus = updateInquiryStatus;
const deleteInquiry = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const body = {
        id: id,
    };
    const jsonBody = JSON.stringify(body);
    const res = yield fetch(process.env.NEXT_PUBLIC_URL_DELETE_INQUIRIES, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_APP_SECRET_KEY}`,
            "Content-Type": "application/json",
        },
        body: jsonBody,
    });
    const message = yield res.json();
    return message;
});
exports.deleteInquiry = deleteInquiry;
const get_inquiries = () => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield fetch(process.env.NEXT_PUBLIC_URL_GET_INQUIRIES, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_APP_SECRET_KEY}`,
        },
    });
    const data = yield res.json();
    return data;
});
exports.get_inquiries = get_inquiries;
