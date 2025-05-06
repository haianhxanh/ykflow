"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShippingInstructions = void 0;
const getShippingInstructions = (order) => {
    var _a, _b, _c;
    const primaryInstructions = (_a = order.node) === null || _a === void 0 ? void 0 : _a.customAttributes.find((attribute) => attribute.key === "primary_instructions" && attribute.value !== "");
    const secondaryInstructions = (_b = order.node) === null || _b === void 0 ? void 0 : _b.customAttributes.find((attribute) => attribute.key === "secondary_instructions" && attribute.value !== "");
    const secondaryPhone = (_c = order.node) === null || _c === void 0 ? void 0 : _c.customAttributes.find((attribute) => attribute.key === "secondary_phone" && attribute.value !== "");
    const shippingInstructions = [];
    if (primaryInstructions) {
        shippingInstructions.push("DOR1: " + primaryInstructions.value);
    }
    if (secondaryInstructions) {
        shippingInstructions.push("DOR2: " + (secondaryPhone ? secondaryPhone.value + "," : "") + " " + secondaryInstructions.value);
    }
    return shippingInstructions.join("\n");
};
exports.getShippingInstructions = getShippingInstructions;
