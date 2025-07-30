"use strict";
const sample_1 = {
    discountNode: {
        discount: {
            title: "FIT SUMMER",
            startsAt: "2025-07-29T12:12:18Z",
            endsAt: null,
            status: "ACTIVE",
            customerGets: {
                items: {
                    collections: {
                        edges: [
                            {
                                node: {
                                    id: "gid://shopify/Collection/497253744938",
                                },
                            },
                        ],
                    },
                },
                value: {
                    percentage: 0.2,
                },
            },
        },
    },
};
const metafield_json_sample = [
    {
        id: "gid://shopify/DiscountAutomaticNode/1234567890",
        status: "ACTIVE",
        starts_at: "2025-07-29T12:12:18Z",
        ends_at: null, // date or null
        discount_percentage: "20", // percentage value or null
        discount_amount: null, // amount value or null
        discount_type: "PERCENTAGE", // PERCENTAGE or FIXED
    },
];
const variants_array = [
    {
        id: "gid://shopify/ProductVariant/50434354577706",
        sku: "5D3000",
        metafields: {
            edges: [],
        },
    },
    {
        id: "gid://shopify/ProductVariant/50434354610474",
        sku: "10D3000",
        metafields: {
            edges: [],
        },
    },
];
