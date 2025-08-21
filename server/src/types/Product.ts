export type ProductInputs = ProductInput[];

export type ProductInput = {
  product: Product;
  media: Media[];
};

export type Product = {
  title: string;
  vendor: string;
  tags: string[];
  status: string;
};

export type Variant = {
  productTitle: string;
  barcode: string;
  price: number;
  sku: string;
  inventoryPolicy: string;
  inventoryItem: InventoryItem;
  optionValues: OptionValue[];
};

export type OptionValue = {
  optionName: string;
  name: string;
};

export type InventoryItem = {
  tracked: boolean;
  measurement: Measurement;
};

export type Measurement = {
  weight: Weight;
};

export type Weight = {
  unit: string;
  value: number;
};

export type Media = {
  mediaContentType: string;
  originalSource: string;
};
