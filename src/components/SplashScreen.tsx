import Lottie from "lottie-react";
import emmaHome from "@/assets/emma-home.json";

/**
 * SplashScreen - Branded loading screen shown during app initialization.
 * Displays EMMA branding with Lottie animation while auth/session state is being resolved.
 */
export const SplashScreen = () => {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
      {/* Lottie Animation */}
      <div className="w-[180px] h-[180px]">
        <Lottie
          animationData={emmaHome}
          loop={false}
          autoplay={true}
        />
      </div>

      {/* App Name & Tagline */}
      <div className="text-center mt-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          EMMA
        </h1>
        <p className="text-lg text-gray-400 mt-2">
          Finally — fantasy football in the playoffs.
        </p>
      </div>
    </div>
  );
};
