// server/src/controllers/returnExchangeController.js
import ReturnExchange from "../models/ReturnExchange.js";
import Order from "../models/Order.js";

// 반품/교환 ID로 조회
export const getById = async (req, res, next) => {
  try {
    const { returnExchangeId } = req.params;

    const returnExchange = await ReturnExchange.findById(returnExchangeId);
    if (!returnExchange) {
      return res
        .status(404)
        .json({ error: "반품/교환 요청을 찾을 수 없습니다." });
    }

    res.json(returnExchange);
  } catch (error) {
    next(error);
  }
};

// 주문 상품 ID로 반품/교환 조회
export const getByOrderItemId = async (req, res, next) => {
  try {
    const { orderItemId } = req.params;

    const returnExchanges = await ReturnExchange.findByOrderItemId(orderItemId);

    res.json(returnExchanges);
  } catch (error) {
    next(error);
  }
};

// 신규 반품/교환 생성
export const create = async (req, res, next) => {
  try {
    const { order_item_id, type, reason, fee_applied } = req.body;

    // 필수 필드 검증
    if (!order_item_id || !type) {
      return res
        .status(400)
        .json({ error: "주문 상품 ID와 유형은 필수 항목입니다." });
    }

    // 주문 상품 존재 확인
    const orderItem = await Order.getOrderItemById(order_item_id);
    if (!orderItem) {
      return res.status(404).json({ error: "주문 상품을 찾을 수 없습니다." });
    }

    // 이미 진행 중인 반품/교환이 있는지 확인
    const existingReturns = await ReturnExchange.findByOrderItemId(
      order_item_id
    );
    const activeReturn = existingReturns.find(r => r.status !== "완료");
    if (activeReturn) {
      return res
        .status(409)
        .json({ error: "이미 진행 중인 반품/교환 요청이 있습니다." });
    }

    // 반품/교환 가능 상태인지 확인
    if (!["정상", "배송완료", "배송중"].includes(orderItem.status)) {
      return res
        .status(400)
        .json({ error: "현재 상태에서는 반품/교환 처리가 불가능합니다." });
    }

    // 교환 가능 여부 확인
    if (type === 1 && !orderItem.exchangable) {
      return res.status(400).json({ error: "교환이 불가능한 상품입니다." });
    }

    // 반품 가능 여부 확인
    if (type === 2 && !orderItem.returnable) {
      return res.status(400).json({ error: "반품이 불가능한 상품입니다." });
    }

    // 반품/교환 생성
    const returnExchange = await ReturnExchange.create({
      order_item_id,
      type,
      reason,
      fee_applied:
        fee_applied ||
        (type === 1 ? orderItem.exchange_price : orderItem.return_price),
    });

    res.status(201).json(returnExchange);
  } catch (error) {
    next(error);
  }
};

// 반품/교환 상태 업데이트
export const updateStatus = async (req, res, next) => {
  try {
    const { returnExchangeId } = req.params;
    const { status } = req.body;

    // 필수 필드 검증
    if (!status) {
      return res.status(400).json({ error: "상태는 필수 항목입니다." });
    }

    // 유효한 상태 값인지 확인
    if (!["접수", "처리중", "완료"].includes(status)) {
      return res.status(400).json({ error: "유효하지 않은 상태 값입니다." });
    }

    // 반품/교환 존재 확인
    const returnExchange = await ReturnExchange.findById(returnExchangeId);
    if (!returnExchange) {
      return res
        .status(404)
        .json({ error: "반품/교환 요청을 찾을 수 없습니다." });
    }

    // 상태 업데이트
    const updatedReturnExchange = await ReturnExchange.updateStatus(
      returnExchangeId,
      status
    );

    // 상태가 '완료'로 변경된 경우, 주문 상품 상태도 업데이트
    if (status === "완료") {
      const newStatus = returnExchange.type === 1 ? "교환완료" : "반품완료";
      await Order.updateOrderItemStatus(
        returnExchange.order_item_id,
        newStatus
      );
    }

    res.json(updatedReturnExchange);
  } catch (error) {
    next(error);
  }
};

// 고객 ID로 반품/교환 목록 조회
export const getByCustomerId = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    const returnExchanges = await ReturnExchange.findByCustomerId(customerId);

    res.json(returnExchanges);
  } catch (error) {
    next(error);
  }
};
