const models = {
  Cafe: {
    name: "cafe",
    columns: [
      "_id",
      "name",
      "address",
      "city",
      "state",
      "pincode",
      "openStatus",
      "createdAt",
      "updatedAt",
      "image",
      "items",
      "email",
      "phone",
    ],
  },
  Admin: {
    name: "admin",
    columns: [
      "_id",
      "name",
      "type",
      "provider",
      "cafe",
      "phone",
      "email",
      "createdAt",
      "updatedAt",
      "image",
    ],
    critical: ["password", "pin"],
  },
  Orders: {
    name: "orders",
    columns: [
      "_id",
      "cafe",
      "tableNumber",
      "status",
      "orderBy",
      "paymentStatus",
      "amount",
      "items",
      "createdAt",
      "updatedAt",
    ],
  },
  Item: {
    name: "item",
    columns: [
      "_id",
      "cafe",
      "category",
      "subCategory",
      "name",
      "price",
      "description",
      "foodChoice",
      "recommended",
      "inStock",
      "variant",
      "servingInfo",
      "portionSize",
      "tags",
      "image",
      "orderedCount",
      "createdAt",
      "updatedAt",
    ],
  },
};
const statusEnums = [
  "INITIALISED", // Session created
  "ORDERED", // Order placed
  "PREPARING", // Order is being prepared
  "PREPARED", // Order is prepared
  "SERVED", // Order is served
  "DINING", // Order is being consumed
  "COMPLETED", // Order is completed
];

module.exports = { models, statusEnums };
