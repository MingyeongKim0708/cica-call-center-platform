-- PostgreSQL 스키마

-- 테이블 삭제 (이미 존재하는 경우)
DROP TABLE IF EXISTS "return_exchange";
DROP TABLE IF EXISTS "order_items";
DROP TABLE IF EXISTS "orders";
DROP TABLE IF EXISTS "products";
DROP TABLE IF EXISTS "categories";
DROP TABLE IF EXISTS "consultations";
DROP TABLE IF EXISTS "staff";
DROP TABLE IF EXISTS "customers";

-- 고객 테이블 생성
CREATE TABLE "customers" (
    "customer_id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "join_date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 직원 테이블 생성
CREATE TABLE "staff" (
    "staff_id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "employee_number" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255) NOT NULL
);

-- 카테고리 테이블 생성
CREATE TABLE "categories" (
    "category_id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL
);

-- 상품 테이블 생성
CREATE TABLE "products" (
    "product_id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT, -- 설치여부, 설치비, 부분반품비용 등
    "price" INTEGER NOT NULL,
    "stock_quantity" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL REFERENCES "categories"("category_id"),
    "platform" VARCHAR(255) NOT NULL, -- 방송, 책자
    "active" BOOLEAN NOT NULL, -- 판매 중, 판매 안함
    "delivery_price" INTEGER,
    "returnable" BOOLEAN,
    "return_price" INTEGER,
    "exchangable" BOOLEAN,
    "exchange_price" INTEGER
);

-- 주문 테이블 생성
CREATE TABLE "orders" (
    "order_id" SERIAL PRIMARY KEY,
    "customer_id" INTEGER NOT NULL REFERENCES "customers"("customer_id"),
    "order_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(255), -- 접수, 처리중, 배송중, 완료, 취소
    "total_amount" INTEGER,
    "payment_method" VARCHAR(255)
);

-- 주문 상품 테이블 생성
CREATE TABLE "order_items" (
    "order_item_id" SERIAL PRIMARY KEY,
    "order_id" INTEGER NOT NULL REFERENCES "orders"("order_id"),
    "product_id" INTEGER NOT NULL REFERENCES "products"("product_id"),
    "quantity" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "status" VARCHAR(255) NOT NULL -- 정상, 교환중, 반품중, 취소
);

-- 상담 기록 테이블 생성
CREATE TABLE "consultations" (
    "consultation_id" SERIAL PRIMARY KEY,
    "customer_id" INTEGER NOT NULL REFERENCES "customers"("customer_id"),
    "staff_id" INTEGER NOT NULL REFERENCES "staff"("staff_id"),
    "consultation_date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "note" TEXT
);

-- 반품/교환 테이블 생성
CREATE TABLE "return_exchange" (
    "return_exchange_id" SERIAL PRIMARY KEY,
    "order_item_id" INTEGER NOT NULL REFERENCES "order_items"("order_item_id"),
    "type" VARCHAR(255) NOT NULL, -- 교환, 반품
    "reason" TEXT,
    "request_date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(255) NOT NULL, -- 접수, 처리중, 완료
    "fee_applied" INTEGER NOT NULL -- 비용이 안 든다면 0
);

-- 인덱스 생성
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_return_exchange_order_item_id ON return_exchange(order_item_id);

-- 샘플 데이터 삽입
INSERT INTO categories (name) VALUES 
('가전제품'),
('주방용품'),
('생활용품');

INSERT INTO customers (name, phone, address, email, join_date) VALUES
('홍길동', '010-1234-5678', '서울시 강남구 테헤란로 123, 456호', 'hong@example.com', '2023-01-15 10:00:00'),
('김철수', '010-9876-5432', '서울시 서초구 서초대로 789, 101호', 'kim@example.com', '2023-02-20 14:30:00'),
('이영희', '010-5555-7777', '경기도 성남시 분당구 판교로 42', 'lee@example.com', '2023-03-10 09:15:00');

INSERT INTO staff (name, employee_number, phone) VALUES
('박상담', 'EMP001', '010-1111-2222'),
('최도움', 'EMP002', '010-3333-4444');

INSERT INTO products (name, description, price, stock_quantity, category_id, platform, active, delivery_price, returnable, return_price, exchangable, exchange_price) VALUES
('스마트폰 케이스', '충격 방지 투명 케이스, 아이폰 13 Pro 호환', 25000, 100, 1, '방송', true, 2500, true, 2500, true, 2500),
('블루투스 이어폰', '노이즈 캔슬링 기능, 30시간 배터리 지속', 89000, 50, 1, '책자', true, 0, true, 5000, true, 5000),
('스마트워치', '건강 모니터링, GPS 탑재, 생활방수', 299000, 30, 1, '방송', true, 0, true, 10000, true, 10000);

INSERT INTO orders (customer_id, order_date, status, total_amount, payment_method) VALUES
(1, '2023-04-10 15:30:00', '완료', 25000, '신용카드'),
(2, '2023-03-25 11:45:00', '완료', 89000, '신용카드'),
(3, '2023-04-01 09:20:00', '배송중', 324000, '계좌이체'),
(1, '2023-04-15 16:30:00', '접수', 25000, '신용카드');

INSERT INTO order_items (order_id, product_id, quantity, subtotal, status) VALUES
(1, 1, 1, 25000, '정상'),
(2, 2, 1, 89000, '정상'),
(3, 3, 1, 299000, '정상'),
(4, 1, 1, 25000, '정상');