// server/src/controllers/orderController.js
import Order from "../models/Order.js";

// 주문 ID로 주문 조회
export const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

// 주문의 상품 목록 조회
export const getOrderItems = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // 주문 존재 확인
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
    }

    const orderItems = await Order.getOrderItems(orderId);

    res.json(orderItems);
  } catch (error) {
    next(error);
  }
};

// 주문 상품 ID로 상품 조회
export const getOrderItemById = async (req, res, next) => {
  try {
    const { orderItemId } = req.params;

    const orderItem = await Order.getOrderItemById(orderItemId);
    if (!orderItem) {
      return res.status(404).json({ error: "주문 상품을 찾을 수 없습니다." });
    }

    res.json(orderItem);
  } catch (error) {
    next(error);
  }
};

// 주문 상품 상태 업데이트
export const updateOrderItemStatus = async (req, res, next) => {
  try {
    const { orderItemId } = req.params;
    const { status } = req.body;

    // 필수 필드 검증
    if (!status) {
      return res.status(400).json({ error: "상태는 필수 항목입니다." });
    }

    // 주문 상품 존재 확인
    const orderItem = await Order.getOrderItemById(orderItemId);
    if (!orderItem) {
      return res.status(404).json({ error: "주문 상품을 찾을 수 없습니다." });
    }

    // 상태 업데이트
    const updatedOrderItem = await Order.updateOrderItemStatus(
      orderItemId,
      status
    );

    res.json(updatedOrderItem);
  } catch (error) {
    next(error);
  }
};

// 주문 상태 업데이트
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // 필수 필드 검증
    if (!status) {
      return res.status(400).json({ error: "상태는 필수 항목입니다." });
    }

    // 유효한 상태 값인지 확인
    if (!["접수", "처리중", "배송중", "완료"].includes(status)) {
      return res.status(400).json({ error: "유효하지 않은 상태 값입니다." });
    }

    // 주문 존재 확인
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
    }

    // 상태 업데이트
    const updatedOrder = await Order.updateOrderStatus(orderId, status);

    res.json(updatedOrder);
  } catch (error) {
    next(error);
  }
};
