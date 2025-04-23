// server/src/routes/orders.js
import express from "express";
import * as orderController from "../controllers/orderController.js";

const router = express.Router();

// 주문 ID로 주문 조회
// GET /api/orders/:orderId
router.get("/:orderId", orderController.getOrderById);

// 주문의 상품 목록 조회
// GET /api/orders/:orderId/items
router.get("/:orderId/items", orderController.getOrderItems);

// 주문 상품 ID로 상품 조회
// GET /api/orders/items/:orderItemId
router.get("/items/:orderItemId", orderController.getOrderItemById);

// 주문 상품 상태 업데이트
// PUT /api/orders/items/:orderItemId/status
router.put("/items/:orderItemId/status", orderController.updateOrderItemStatus);

// 주문 상태 업데이트
// PUT /api/orders/:orderId/status
router.put("/:orderId/status", orderController.updateOrderStatus);

// 새 주문 생성
// POST /api/orders
router.post("/", orderController.createOrder);

export default router;
