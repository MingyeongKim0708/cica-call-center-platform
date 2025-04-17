// server/src/controllers/customerController.js
import Customer from "../models/Customer.js";

// 전화번호로 고객 정보와 주문 목록 조회
export const getCustomerByPhone = async (req, res, next) => {
  try {
    const { phoneNumber } = req.params;

    // 고객 정보 조회
    const customer = await Customer.findByPhone(phoneNumber);
    if (!customer) {
      return res.status(404).json({ error: "고객을 찾을 수 없습니다." });
    }

    // 고객의 주문 상품 목록 조회
    const orderItems = await Customer.getOrderItems(customer.customer_id);

    res.json({
      customer,
      orderItems,
    });
  } catch (error) {
    next(error);
  }
};

// 고객 ID로 고객 정보와 주문 목록 조회
export const getCustomerById = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    // 고객 정보 조회
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: "고객을 찾을 수 없습니다." });
    }

    // 고객의 주문 목록 조회
    const orders = await Customer.getOrders(customerId);

    // 고객의 상담 기록 조회
    const consultations = await Customer.getConsultations(customerId);

    res.json({
      customer,
      orders,
      consultations,
    });
  } catch (error) {
    next(error);
  }
};

// 새 고객 생성
export const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, address, email } = req.body;

    // 필수 필드 검증
    if (!name || !phone || !address) {
      return res
        .status(400)
        .json({ error: "이름, 전화번호, 주소는 필수 항목입니다." });
    }

    // 중복 확인
    const existingCustomer = await Customer.findByPhone(phone);
    if (existingCustomer) {
      return res.status(409).json({ error: "이미 등록된 전화번호입니다." });
    }

    // 새 고객 생성
    const customer = await Customer.create({ name, phone, address, email });

    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
};

// 고객 정보 업데이트
export const updateCustomer = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { name, phone, address, email } = req.body;

    // 필수 필드 검증
    if (!name || !phone || !address) {
      return res
        .status(400)
        .json({ error: "이름, 전화번호, 주소는 필수 항목입니다." });
    }

    // 고객 존재 확인
    const existingCustomer = await Customer.findById(customerId);
    if (!existingCustomer) {
      return res.status(404).json({ error: "고객을 찾을 수 없습니다." });
    }

    // 전화번호 중복 확인 (자신의 번호는 제외)
    if (phone !== existingCustomer.phone) {
      const phoneExists = await Customer.findByPhone(phone);
      if (phoneExists) {
        return res.status(409).json({ error: "이미 등록된 전화번호입니다." });
      }
    }

    // 고객 정보 업데이트
    const updatedCustomer = await Customer.update(customerId, {
      name,
      phone,
      address,
      email,
    });

    res.json(updatedCustomer);
  } catch (error) {
    next(error);
  }
};

// 상담 기록 추가
export const addConsultation = async (req, res, next) => {
  try {
    const { customer_id, staff_id, summary, note } = req.body;

    // 필수 필드 검증
    if (!customer_id || !staff_id) {
      return res
        .status(400)
        .json({ error: "고객ID와 상담사ID는 필수 항목입니다." });
    }

    // 상담 기록 추가
    const consultation = await Customer.addConsultation({
      customer_id,
      staff_id,
      summary,
      note,
    });

    res.status(201).json(consultation);
  } catch (error) {
    next(error);
  }
};

// 고객의 상담 기록 조회
export const getConsultations = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    // 고객 존재 확인
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: "고객을 찾을 수 없습니다." });
    }

    // 상담 기록 조회
    const consultations = await Customer.getConsultations(customerId);

    res.json(consultations);
  } catch (error) {
    next(error);
  }
};
