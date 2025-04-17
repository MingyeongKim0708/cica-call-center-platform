// server/src/routes/customers.js
import express from "express";
import * as customerController from "../controllers/customerController.js";

const router = express.Router();

// 전화번호로 고객 정보와 주문 목록 조회
// GET /api/customers/phone/:phoneNumber
router.get("/phone/:phoneNumber", customerController.getCustomerByPhone);

// 고객 ID로 고객 정보와 주문 목록 조회
// GET /api/customers/:customerId
router.get("/:customerId", customerController.getCustomerById);

// 새 고객 생성
// POST /api/customers
router.post("/", customerController.createCustomer);

// 고객 정보 업데이트
// PUT /api/customers/:customerId
router.put("/:customerId", customerController.updateCustomer);

// 상담 기록 추가
// POST /api/customers/consultations
router.post("/consultations", customerController.addConsultation);

// 고객의 상담 기록 조회
// GET /api/customers/:customerId/consultations
router.get("/:customerId/consultations", customerController.getConsultations);

export default router;
