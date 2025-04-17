// server/src/routes/returns.js
import express from "express";
import * as returnExchangeController from "../controllers/returnExchangeController.js";

const router = express.Router();

// 반품/교환 ID로 조회
// GET /api/returns/:returnExchangeId
router.get("/:returnExchangeId", returnExchangeController.getById);

// 주문 상품 ID로 반품/교환 조회
// GET /api/returns/order-item/:orderItemId
router.get(
  "/order-item/:orderItemId",
  returnExchangeController.getByOrderItemId
);

// 고객 ID로 반품/교환 목록 조회
// GET /api/returns/customer/:customerId
router.get("/customer/:customerId", returnExchangeController.getByCustomerId);

// 신규 반품/교환 생성
// POST /api/returns
router.post("/", returnExchangeController.create);

// 반품/교환 상태 업데이트
// PUT /api/returns/:returnExchangeId/status
router.put("/:returnExchangeId/status", returnExchangeController.updateStatus);

export default router;
