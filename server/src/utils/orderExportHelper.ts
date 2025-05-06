export const getShippingInstructions = (order: any) => {
  const primaryInstructions = order.node?.customAttributes.find((attribute: any) => attribute.key === "primary_instructions" && attribute.value !== "");
  const secondaryInstructions = order.node?.customAttributes.find((attribute: any) => attribute.key === "secondary_instructions" && attribute.value !== "");
  const secondaryPhone = order.node?.customAttributes.find((attribute: any) => attribute.key === "secondary_phone" && attribute.value !== "");

  const shippingInstructions = [];

  if (primaryInstructions) {
    shippingInstructions.push("DOR1: " + primaryInstructions.value);
  }

  if (secondaryInstructions) {
    shippingInstructions.push("DOR2: " + (secondaryPhone ? secondaryPhone.value + "," : "") + " " + secondaryInstructions.value);
  }

  return shippingInstructions.join("\n");
};
