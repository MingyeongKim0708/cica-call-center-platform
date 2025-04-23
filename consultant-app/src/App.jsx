// consultant-app/src/App.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  User,
  ShoppingBag,
  CreditCard,
  MapPin,
  X,
} from "lucide-react";
import io from "socket.io-client";

// Vite 환경 변수 사용
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

function App() {
  const [isAvailable, setIsAvailable] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [consultantId] = useState(
    `consultant-${Math.floor(Math.random() * 1000)}`
  );

  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);

  // 컴포넌트 마운트 시 실행
  useEffect(() => {
    // Socket.io 연결
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    // 상담사 상태 업데이트
    socket.emit("consultant-status", {
      consultantId,
      isAvailable,
    });

    // 통화 요청 수신
    socket.on("incoming-call", async ({ phoneNumber }) => {
      if (isAvailable) {
        // 통화 요청 수락
        socket.emit("accept-call", {
          phoneNumber,
          consultantId,
        });

        setCurrentCall({ phoneNumber });

        // 고객 정보 요청
        fetchCustomerInfo(phoneNumber);

        // WebRTC 설정
        await setupWebRTC();
      } else {
        // 통화 요청 거절
        socket.emit("reject-call", { phoneNumber });
      }
    });

    // Offer 수신
    socket.on("offer", async ({ offer, phoneNumber }) => {
      try {
        if (!peerConnectionRef.current) {
          await setupWebRTC();
        }

        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );

        // Answer 생성
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        // Answer 전송
        socket.emit("answer", {
          answer: peerConnectionRef.current.localDescription,
          phoneNumber,
          consultantId,
        });

        setIsCallActive(true);
      } catch (error) {
        console.error("Offer 처리 오류:", error);
      }
    });

    // ICE 후보 수신
    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
      } catch (error) {
        console.error("ICE 후보 처리 오류:", error);
      }
    });

    // 통화 종료 수신
    socket.on("call-ended", () => {
      endCall();
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [consultantId, isAvailable]);

  // WebRTC 설정
  const setupWebRTC = async () => {
    try {
      // 미디어 스트림 획득
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localAudioRef.current.srcObject = stream;

      // WebRTC PeerConnection 설정
      const configuration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      };
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // 미디어 스트림을 PeerConnection에 추가
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // 상대방 미디어 스트림 처리
      peerConnection.ontrack = (event) => {
        remoteAudioRef.current.srcObject = event.streams[0];
      };

      // ICE 후보 처리
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && currentCall) {
          socketRef.current.emit("ice-candidate", {
            candidate: event.candidate,
            phoneNumber: currentCall.phoneNumber,
            consultantId,
          });
        }
      };

      // 연결 상태 변경 처리
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
          setIsCallActive(true);
        }
      };

      return peerConnection;
    } catch (error) {
      console.error("WebRTC 설정 오류:", error);
      return null;
    }
  };

  // 고객 정보 가져오기
  const fetchCustomerInfo = async (phoneNumber) => {
    try {
      const response = await fetch(`${API_URL}/customers/phone/${phoneNumber}`);
      console.log("logis:", response);

      if (!response.ok) {
        throw new Error("고객 정보를 가져오는데 실패했습니다.");
      }

      const data = await response.json();
      setCustomerInfo(data.customer);
      setOrderItems(data.orderItems);
    } catch (error) {
      console.error("고객 정보 조회 오류:", error);

      // API 연결 실패 시 테스트를 위한 Mock 데이터 사용
      const mockCustomerInfo = {
        name: "대실패",
        phone: phoneNumber,
        address: "서울시 강남구 테헤란로 123, 456호",
        email: "hong@example.com",
        customer_id: 1,
      };

      const mockOrderItems = [
        {
          order_item_id: 1,
          name: "스마트폰 케이스",
          price: 25000,
          order_date: "2023-04-10",
          status: "배송완료",
          return_price: 2500,
          exchange_price: 2500,
          returnable: true,
          exchangable: true,
          description: "충격 방지 투명 케이스, 아이폰 13 Pro 호환",
        },
        {
          order_item_id: 2,
          name: "블루투스 이어폰",
          price: 89000,
          order_date: "2023-03-25",
          status: "배송완료",
          return_price: 5000,
          exchange_price: 5000,
          returnable: true,
          exchangable: true,
          description: "노이즈 캔슬링 기능, 30시간 배터리 지속",
        },
        {
          order_item_id: 3,
          name: "스마트워치",
          price: 299000,
          order_date: "2023-04-01",
          status: "배송중",
          return_price: 10000,
          exchange_price: 10000,
          returnable: true,
          exchangable: true,
          description: "건강 모니터링, GPS 탑재, 생활방수",
        },
      ];

      setCustomerInfo(mockCustomerInfo);
      setOrderItems(mockOrderItems);
    }
  };

  // 상태 전환
  const toggleAvailability = () => {
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);

    if (socketRef.current) {
      socketRef.current.emit("consultant-status", {
        consultantId,
        isAvailable: newStatus,
      });
    }
  };

  // 전화 끊기
  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (socketRef.current && currentCall) {
      socketRef.current.emit("end-call", {
        phoneNumber: currentCall.phoneNumber,
        consultantId,
      });
    }

    if (localAudioRef.current && localAudioRef.current.srcObject) {
      localAudioRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop());
    }

    setIsCallActive(false);
    setCurrentCall(null);
    setCustomerInfo(null);
    setOrderItems([]);
    setSelectedItem(null);
  };

  // 상품 상세 정보 보기
  const viewItemDetails = (item) => {
    setSelectedItem(item);
  };

  // 상품 교환/반품 처리
  const processReturn = async (orderItemId, type) => {
    try {
      const item = orderItems.find(
        (item) => item.order_item_id === orderItemId
      );

      if (!item) {
        throw new Error("상품을 찾을 수 없습니다.");
      }

      const returnData = {
        order_item_id: orderItemId,
        type: type === "exchange" ? 1 : 2, // 교환(1), 반품(2)
        reason: "고객 요청",
        fee_applied:
          type === "exchange" ? item.exchange_price : item.return_price,
      };

      const response = await fetch(`${API_URL}/returns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(returnData),
      });

      if (!response.ok) {
        throw new Error("처리 중 오류가 발생했습니다.");
      }

      // 주문 아이템 상태 업데이트
      const updatedItems = orderItems.map((item) => {
        if (item.order_item_id === orderItemId) {
          return {
            ...item,
            status: type === "exchange" ? "교환접수" : "반품접수",
          };
        }
        return item;
      });

      setOrderItems(updatedItems);
      setSelectedItem(null);
      alert(
        `상품이 ${type === "exchange" ? "교환" : "반품"}으로 처리되었습니다.`
      );
    } catch (error) {
      console.error("교환/반품 처리 오류:", error);

      // API 연결 실패 시 클라이언트 측에서만 상태 업데이트 (테스트용)
      const updatedItems = orderItems.map((item) => {
        if (item.order_item_id === orderItemId) {
          return {
            ...item,
            status: type === "exchange" ? "교환접수" : "반품접수",
          };
        }
        return item;
      });

      setOrderItems(updatedItems);
      setSelectedItem(null);
      alert(
        `상품이 ${type === "exchange" ? "교환" : "반품"}으로 처리되었습니다.`
      );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-blue-600 text-white p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">
            상담사 대시보드 (ID: {consultantId})
          </h1>
          <div className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                isAvailable ? "bg-green-400" : "bg-red-400"
              }`}
            ></div>
            <span>{isAvailable ? "상담 가능" : "상담 중지"}</span>
            <button
              onClick={toggleAvailability}
              className="ml-4 px-3 py-1 bg-white text-blue-600 rounded-md text-sm font-medium"
              disabled={isCallActive}
            >
              상태 변경
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-grow overflow-hidden">
        {/* 통화 제어 패널 */}
        <div className="w-64 bg-gray-800 text-white p-4 flex flex-col">
          <h2 className="text-lg font-medium mb-4">통화 제어</h2>

          <div className="flex flex-col flex-grow justify-center items-center">
            {isCallActive ? (
              <>
                <div className="mb-4 text-center">
                  <div className="text-xl font-bold">
                    {customerInfo?.name || "고객"}
                  </div>
                  <div className="text-gray-400">
                    {currentCall?.phoneNumber || ""}
                  </div>
                  <div className="mt-2 px-2 py-1 bg-green-500 text-white rounded-full text-xs">
                    통화 중
                  </div>
                </div>
                <button
                  onClick={endCall}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 flex items-center justify-center mb-2"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                <span>통화 종료</span>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-4">
                  <Phone className="w-8 h-8 text-gray-400" />
                </div>
                <div className="text-center text-gray-400">
                  {isAvailable ? "통화 대기 중..." : "상담 중지 상태"}
                </div>
              </>
            )}
          </div>

          <div className="mt-auto">
            <audio ref={localAudioRef} autoPlay muted className="hidden" />
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
          </div>
        </div>

        {/* 고객 정보 및 주문 정보 */}
        <div className="flex-grow p-6 overflow-auto">
          {!isCallActive ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h2 className="text-xl font-medium">통화 연결 대기 중</h2>
                <p>고객이 전화를 걸면 여기에 정보가 표시됩니다.</p>
              </div>
            </div>
          ) : (
            <>
              {/* 고객 정보 */}
              {customerInfo && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    고객 정보
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        이름
                      </h3>
                      <p className="font-medium">{customerInfo.name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        전화번호
                      </h3>
                      <p className="font-medium">{customerInfo.phone}</p>
                    </div>
                    <div className="col-span-2">
                      <h3 className="text-sm font-medium text-gray-500 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        주소
                      </h3>
                      <p className="font-medium">{customerInfo.address}</p>
                    </div>
                    <div className="col-span-2">
                      <h3 className="text-sm font-medium text-gray-500 flex items-center">
                        <CreditCard className="w-4 h-4 mr-1" />
                        이메일
                      </h3>
                      <p className="font-medium">
                        {customerInfo.email || "정보 없음"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 주문 목록 */}
              {orderItems.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center">
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    구매 물품 목록
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            상품명
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            가격
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            구매일
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            상태
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            상세
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orderItems.map((item) => (
                          <tr
                            key={item.order_item_id}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">
                                {item.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.price.toLocaleString()}원
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.order_date}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  item.status === "배송완료"
                                    ? "bg-green-100 text-green-800"
                                    : item.status === "배송중"
                                    ? "bg-blue-100 text-blue-800"
                                    : item.status === "반품접수" ||
                                      item.status === "반품완료"
                                    ? "bg-red-100 text-red-800"
                                    : item.status === "교환접수" ||
                                      item.status === "교환완료"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => viewItemDetails(item)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                상세보기
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 상품 상세 정보 모달 */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">상품 상세 정보</h3>
              <button onClick={() => setSelectedItem(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">상품명</h4>
                <p className="font-medium">{selectedItem.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">가격</h4>
                  <p className="font-medium">
                    {selectedItem.price.toLocaleString()}원
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">구매일</h4>
                  <p className="font-medium">{selectedItem.order_date}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">상태</h4>
                  <p className="font-medium">{selectedItem.status}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">반품비</h4>
                  <p className="font-medium">
                    {selectedItem.return_price?.toLocaleString() || "해당 없음"}
                    원
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">상품 설명</h4>
                <p className="text-gray-700">{selectedItem.description}</p>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-2">
                {selectedItem.status !== "반품접수" &&
                  selectedItem.status !== "교환접수" &&
                  selectedItem.status !== "반품완료" &&
                  selectedItem.status !== "교환완료" && (
                    <>
                      {selectedItem.exchangable && (
                        <button
                          onClick={() =>
                            processReturn(
                              selectedItem.order_item_id,
                              "exchange"
                            )
                          }
                          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                        >
                          교환 처리
                        </button>
                      )}
                      {selectedItem.returnable && (
                        <button
                          onClick={() =>
                            processReturn(selectedItem.order_item_id, "return")
                          }
                          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                          반품 처리
                        </button>
                      )}
                    </>
                  )}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
