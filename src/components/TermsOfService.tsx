import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const CONTACT_EMAIL = "jjakmi@gmail.com";

export const TermsOfService: React.FC = () => {
  const navigate = useNavigate();
  const handleBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate("/");
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로 가기
        </button>

        <h1 className="text-3xl font-serif italic text-stone-900 mb-2">이용약관</h1>
        <p className="text-xs text-stone-400 uppercase tracking-widest font-bold mb-10">Terms of Service</p>

        <div className="space-y-8 text-sm text-stone-700 leading-relaxed">
          <section>
            <p className="text-stone-500">최종 업데이트: 2026년 5월 2일</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">1. 서비스 개요</h2>
            <p>Dada Task Organizer(이하 "서비스")는 개인 및 가족 단위의 태스크 관리를 위한 웹 애플리케이션입니다. 서비스를 이용함으로써 본 약관에 동의하는 것으로 간주합니다.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">2. 이용 자격</h2>
            <ul className="list-disc list-inside space-y-1 text-stone-600">
              <li>Google 계정을 보유한 만 14세 이상인 자</li>
              <li>본 약관에 동의한 자</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">3. 서비스 이용 규칙</h2>
            <p>사용자는 다음 행위를 하여서는 안 됩니다:</p>
            <ul className="list-disc list-inside space-y-1 text-stone-600">
              <li>타인의 계정을 무단으로 사용하는 행위</li>
              <li>서비스의 정상적인 운영을 방해하는 행위</li>
              <li>불법적인 목적으로 서비스를 이용하는 행위</li>
              <li>타인의 개인정보를 수집하거나 악용하는 행위</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">4. AI 기능 관련</h2>
            <p>서비스는 Gemini AI를 활용한 태스크 분석 기능을 제공합니다. AI 분석 결과는 참고용이며, 서비스 제공자는 AI 결과의 정확성에 대해 보증하지 않습니다.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">5. 서비스 변경 및 중단</h2>
            <p>서비스 제공자는 사전 공지 후 서비스의 내용을 변경하거나 중단할 수 있습니다. 불가피한 사정이 있는 경우 사전 공지 없이 서비스가 중단될 수 있습니다.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">6. 책임의 한계</h2>
            <p>서비스 제공자는 천재지변, 네트워크 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다. 사용자가 서비스에 등록한 데이터의 백업은 사용자 본인의 책임입니다.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">7. 계정 삭제</h2>
            <p>사용자는 언제든지 설정 화면을 통해 계정을 삭제할 수 있으며, 삭제 시 모든 데이터는 즉시 영구 삭제됩니다.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">8. 준거법</h2>
            <p>본 약관은 대한민국 법률에 따라 해석되며, 분쟁 발생 시 관할 법원은 서울중앙지방법원으로 합니다.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">9. 문의</h2>
            <p className="font-mono text-stone-600">{CONTACT_EMAIL}</p>
          </section>
        </div>
      </div>
    </div>
  );
};
