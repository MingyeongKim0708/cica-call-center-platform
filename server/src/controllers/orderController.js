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

// 신규 주문 생성
export const createOrder = async (req, res, next) => {
  try {
    const { customer_id, status, total_amount, payment_method, orderItems } =
      req.body;

    // 필수 필드 검증
    if (
      !customer_id ||
      !status ||
      !total_amount ||
      !payment_method ||
      !orderItems ||
      !orderItems.length
    ) {
      return res.status(400).json({
        error:
          "고객 ID, 상태, 총 금액, 결제 방법 및 주문 상품은 필수 항목입니다.",
      });
    }

    // 유효한 상태 값인지 확인
    if (!["접수", "처리중", "배송중", "완료"].includes(status)) {
      return res.status(400).json({ error: "유효하지 않은 상태 값입니다." });
    }

    // 고객 존재 확인 (Customer 모델에서 findById 메서드 사용)
    const Customer = (await import("../models/Customer.js")).default;
    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: "고객을 찾을 수 없습니다." });
    }

    // 주문 상품 유효성 검증
    const Product = (await import("../models/Product.js")).default;
    let calculatedTotal = 0;

    for (const item of orderItems) {
      if (
        !item.product_id ||
        !item.quantity ||
        !item.subtotal ||
        !item.status
      ) {
        return res.status(400).json({
          error:
            "모든 주문 상품은 상품 ID, 수량, 소계 및 상태를 포함해야 합니다.",
        });
      }

      // 상품 존재 확인 및 재고 확인
      const product = await Product.findById(item.product_id);
      if (!product) {
        return res.status(404).json({
          error: `상품 ID ${item.product_id}를 찾을 수 없습니다.`,
        });
      }

      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({
          error: `상품 ${product.name}의 재고가 부족합니다. 현재 재고: ${product.stock_quantity}`,
        });
      }

      // 소계 검증 (단가 * 수량 = 소계)
      const expectedSubtotal = product.price * item.quantity;
      if (expectedSubtotal !== item.subtotal) {
        return res.status(400).json({
          error: `상품 ${product.name}의 소계가 올바르지 않습니다. 예상: ${expectedSubtotal}, 요청: ${item.subtotal}`,
        });
      }

      calculatedTotal += item.subtotal;
    }

    // 총 금액 검증
    if (calculatedTotal !== total_amount) {
      return res.status(400).json({
        error: `총 금액이 올바르지 않습니다. 예상: ${calculatedTotal}, 요청: ${total_amount}`,
      });
    }

    // 주문 생성
    const order = await Order.create(
      { customer_id, status, total_amount, payment_method },
      orderItems
    );

    // 주문 생성 후 재고 감소
    for (const item of orderItems) {
      await Product.decreaseStock(item.product_id, item.quantity);
    }

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};
