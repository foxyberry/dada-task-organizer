import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로 가기
        </button>

        <h1 className="text-3xl font-serif italic text-stone-900 mb-2">개인정보처리방침</h1>
        <p className="text-xs text-stone-400 uppercase tracking-widest font-bold mb-10">Privacy Policy</p>

        <div className="prose prose-stone max-w-none space-y-8 text-sm text-stone-700 leading-relaxed">
          <section>
            <p className="text-stone-500">최종 업데이트: 2026년 5월 2일</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">1. 수집하는 개인정보</h2>
            <p>Dada Task Organizer(이하 "서비스")는 다음과 같은 정보를 수집합니다:</p>
            <ul className="list-disc list-inside space-y-1 text-stone-600">
              <li><strong>계정 정보:</strong> 이메일 주소, 이름 (Google 로그인 시 제공)</li>
              <li><strong>서비스 이용 데이터:</strong> 카테고리, 할 일(태스크), 마감일 등 사용자가 직접 입력한 데이터</li>
              <li><strong>가족 그룹 정보:</strong> 그룹 이름, 구성원 정보</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">2. 개인정보 수집 및 이용 목적</h2>
            <ul className="list-disc list-inside space-y-1 text-stone-600">
              <li>서비스 제공 및 운영</li>
              <li>사용자 인증 및 계정 관리</li>
              <li>AI 기반 태스크 분석 기능 제공 (Gemini API 활용)</li>
              <li>가족 공유 기능 제공</li>
              <li>서비스 품질 개선</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">3. 개인정보 보유 및 이용 기간</h2>
            <p>수집된 개인정보는 서비스 이용 기간 동안 보유합니다. 계정 삭제 시 모든 개인정보 및 서비스 이용 데이터는 즉시 삭제됩니다.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">4. 제3자 서비스</h2>
            <p>서비스는 다음 제3자 서비스를 이용합니다:</p>
            <ul className="list-disc list-inside space-y-1 text-stone-600">
              <li><strong>Firebase (Google):</strong> 인증 및 데이터 저장</li>
              <li><strong>Gemini API (Google):</strong> AI 태스크 분석</li>
              <li><strong>Google Cloud:</strong> 서버 호스팅</li>
            </ul>
            <p className="text-stone-500 text-xs">각 서비스의 개인정보처리방침은 해당 서비스 공식 사이트를 참고하시기 바랍니다.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">5. 사용자의 권리</h2>
            <p>사용자는 다음 권리를 가집니다:</p>
            <ul className="list-disc list-inside space-y-1 text-stone-600">
              <li>개인정보 열람, 수정, 삭제 요청</li>
              <li>계정 삭제를 통한 모든 데이터 삭제</li>
              <li>개인정보 처리 동의 철회</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">6. 개인정보 보호책임자</h2>
            <p>개인정보 관련 문의는 아래 이메일로 연락하시기 바랍니다:</p>
            <p className="font-mono text-stone-600">jjakmi@gmail.com</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">7. 방침 변경</h2>
            <p>본 방침이 변경될 경우 서비스 내 공지 또는 이메일을 통해 사전 고지합니다.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
