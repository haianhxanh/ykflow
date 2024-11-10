"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLERGENS = exports.API_RESPONSES = exports.STATUS_STRINGS = exports.STATUS = exports.STRINGS = void 0;
exports.STRINGS = {
    ORDER_ATTR_START_DATE: "Datum začátku Yes Krabiček",
};
exports.STATUS = {
    NEW: "NEW",
    APPROVED: "APPROVED",
    DECLINED: "DECLINED",
};
exports.STATUS_STRINGS = {
    NEW: "Nový požadavek",
    APPROVED: "Vyhověno",
    DECLINED: "Zamítnuto",
    PENDING: "Čeká se na vyřízení",
};
exports.API_RESPONSES = {
    MISSING_DATE: "Vyplňte prosím datum počátku/konce pozastavení",
    MISSING_ORDER_ITEM: "Vyberte prosím krabičku, kterou si přejete pozastavit",
    MISSING_ORDER_CONTACT: "Zadejte emailovou adresu",
    MISSING_ORDER_ID: "Chybí ID objednávky",
    MISSING_ORDER_NAME: "Chybí číslo objednávky",
    PAST_DATE: "Začátek/konec pozastavení nemůže být dřív než začátek objednávky a musí být v budoucnosti",
    NOT_WORKING_DAY: "Začátek/konec pozastavení nesmí být víkend",
    INVALID_END_DATE: "Konec pozastavení musí být po datu začátku pozastavení",
    OUT_OF_RANGE: "Požadovaná data jsou mimo rozsah objednávky",
};
exports.ALLERGENS = "Mořské plody,Houby,Tofu,Ryby,Sója,Vepřové maso,Skořápkové plody,Arašídy,Koriandr,Rajčata,Červená řepa,Avokádo,Jehněčí maso,Kozí sýr,Paprika,Olivy,Jahody";
