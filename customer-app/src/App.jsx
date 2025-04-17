// customer-app/src/App.jsx
import React, { useState, useEffect, useRef } from "react";
import { Phone } from "lucide-react";
import io from "socket.io-client";

// Vite 환경 변수 사용
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

function App() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);

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
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // 상대방 미디어 스트림 처리
      peerConnection.ontrack = event => {
        remoteAudioRef.current.srcObject = event.streams[0];
      };

      // ICE 후보 처리
      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          socketRef.current.emit("ice-candidate", {
            candidate: event.candidate,
            phoneNumber,
          });
        }
      };

      // 연결 상태 변경 처리
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
          setIsConnecting(false);
          setIsCallActive(true);
        }
      };

      return peerConnection;
    } catch (error) {
      console.error("WebRTC 설정 오류:", error);
      return null;
    }
  };

  // 전화 걸기
  const makeCall = async () => {
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      alert("유효한 전화번호를 입력해주세요");
      return;
    }

    setIsConnecting(true);

    // 소켓 연결
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    // WebRTC 설정
    const peerConnection = await setupWebRTC();
    if (!peerConnection) {
      setIsConnecting(false);
      return;
    }

    // 통화 요청
    socket.emit("call-request", { phoneNumber });

    // 통화 수락 처리
    socket.on("call-accepted", async ({ consultantId }) => {
      try {
        // Offer 생성
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Offer 전송
        socket.emit("offer", {
          offer: peerConnection.localDescription,
          phoneNumber,
          consultantId,
        });
      } catch (error) {
        console.error("Offer 생성 오류:", error);
        setIsConnecting(false);
      }
    });

    // Answer 처리
    socket.on("answer", async ({ answer }) => {
      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      } catch (error) {
        console.error("Answer 처리 오류:", error);
      }
    });

    // ICE 후보 처리
    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("ICE 후보 처리 오류:", error);
      }
    });

    // 통화 종료 처리
    socket.on("call-ended", () => {
      endCall();
    });

    // 통화 실패 처리
    socket.on("call-failed", () => {
      alert("현재 가능한 상담사가 없습니다. 잠시 후 다시 시도해주세요.");
      setIsConnecting(false);
      socket.disconnect();
    });
  };

  // 전화 끊기
  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.emit("end-call", { phoneNumber });
      socketRef.current.disconnect();
    }

    if (localAudioRef.current && localAudioRef.current.srcObject) {
      localAudioRef.current.srcObject
        .getTracks()
        .forEach(track => track.stop());
    }

    setIsCallActive(false);
    setIsConnecting(false);
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (isCallActive) {
        endCall();
      }
    };
  }, [isCallActive]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">고객 상담 전화</h1>

        <div className="mb-4">
          <label
            htmlFor="phoneNumber"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            전화번호 입력
          </label>
          <input
            type="tel"
            id="phoneNumber"
            placeholder="010-1234-5678"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            disabled={isCallActive || isConnecting}
          />
        </div>

        {!isCallActive && !isConnecting ? (
          <button
            onClick={makeCall}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center"
          >
            <Phone className="w-5 h-5 mr-2" />
            상담원 연결하기
          </button>
        ) : isConnecting ? (
          <button className="w-full bg-yellow-500 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center cursor-wait">
            연결 중...
          </button>
        ) : (
          <button
            onClick={endCall}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center"
          >
            통화 종료
          </button>
        )}

        {isCallActive && (
          <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md text-center">
            통화 중입니다...
          </div>
        )}

        <audio ref={localAudioRef} autoPlay muted className="hidden" />
        <audio ref={remoteAudioRef} autoPlay className="hidden" />
      </div>
    </div>
  );
}

export default App;
