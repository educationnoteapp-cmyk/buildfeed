"use client";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
interface KingCrownProps {
  avatarUrl: string;
  fanHandle: string;
}
export default function KingSpot({ avatarUrl, fanHandle }: KingCrownProps) {
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-24 h-24">
        <img
          src={avatarUrl}
          alt={fanHandle}
          className="w-24 h-24 rounded-full border-4 border-yellow-400
          shadow-[0_0_25px_rgba(255,215,0,0.8)] object-cover"
        />
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 pointer-events-none">
          <DotLottieReact
            src="/crown.lottie"
            loop
            autoplay
            style={{ background: "transparent" }}
          />
        </div>
      </div>
      <p className="mt-4 text-yellow-400 font-bold text-lg">@{fanHandle}</p>
    </div>
  );
}
