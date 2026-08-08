import React, { useState, useEffect } from "react";
import { useAgentStore } from "../store/useAgentStore.js";
import { Home, ShoppingBag, Plus, User, ExternalLink, X, Check, LogOut, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export const Navbar: React.FC = () => {
  const { resetSession, customerProfile, setCustomerProfile } = useAgentStore();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  
  // OTP Passwordless Flow State
  const [step, setStep] = useState<"identifier" | "otp">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-load customer profile from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mrplus_customer_profile");
      if (saved) {
        setCustomerProfile(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error reading customer profile:", e);
    }
  }, [setCustomerProfile]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    // Simulate sending 6-digit OTP code to Shopify customer email/phone
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
      setInfoMsg(`A 6-digit verification code was sent to ${identifier.trim()}`);
    }, 1000);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;

    setLoading(true);
    setErrorMsg("");

    setTimeout(() => {
      setLoading(false);
      const isPhone = /^[0-9+ ]+$/.test(identifier);
      const extractedName = isPhone
        ? "Customer"
        : identifier.split("@")[0].replace(/[^a-zA-Z]/g, "") || "Customer";

      const formattedName = extractedName.charAt(0).toUpperCase() + extractedName.slice(1);

      const newProfile = {
        firstName: formattedName,
        email: !isPhone ? identifier.trim() : undefined,
        ordersCount: 1,
      };

      setCustomerProfile(newProfile);
      localStorage.setItem("mrplus_customer_profile", JSON.stringify(newProfile));
      setIsAccountModalOpen(false);
      setStep("identifier");
      setIdentifier("");
      setOtpCode("");
    }, 900);
  };

  const handleOpenStoreAccount = () => {
    window.open("https://shop.mrplus.in/account", "_blank");
  };

  const handleSignOut = () => {
    setCustomerProfile(null);
    localStorage.removeItem("mrplus_customer_profile");
    setStep("identifier");
    setIdentifier("");
    setOtpCode("");
    setIsAccountModalOpen(false);
  };

  return (
    <>
      <header className="fixed top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-50 flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3 rounded-full glass-capsule max-w-7xl mx-auto shadow-2xl transition-all duration-300">
        {/* Left: Logo & Tagline */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <img
            src="/White.png"
            alt="MR.PLUS"
            className="h-5 sm:h-7 w-auto object-contain cursor-pointer shrink-0"
            onClick={() => resetSession("blank")}
          />
          <span className="text-[11px] text-white/40 font-normal hidden lg:inline border-l border-white/10 pl-3">
            Kerala's First AI Shopping Experience
          </span>
        </div>

        {/* Center: Navigation Menu (Home & Shop) */}
        <nav className="flex items-center gap-0.5 sm:gap-2 bg-white/5 border border-white/5 px-1.5 sm:px-3 py-1 rounded-full shrink">
          <button
            onClick={() => resetSession("blank")}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
            title="Home"
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline sm:inline">Home</span>
          </button>

          <a
            href="https://shop.mrplus.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
            title="Shop Storefront"
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline sm:inline">Shop</span>
            <ExternalLink className="w-3 h-3 opacity-50 hidden sm:inline" />
          </a>
        </nav>

        {/* Right Actions: New Session & Account */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => resetSession("blank")}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black text-xs font-medium transition-all"
            title="Start fresh session"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">New Session</span>
          </button>

          {/* Customer Account Trigger */}
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-all"
            title="Shopify Customer Account"
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">
              {customerProfile?.firstName ? customerProfile.firstName : "Account"}
            </span>
            {customerProfile && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>
        </div>
      </header>

      {/* Clean Passwordless OTP Shopify Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-[#0E0E0E] border border-white/10 rounded-[28px] max-w-sm w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setIsAccountModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Shopify Account Login</h3>
                <p className="text-xs text-white/40">Passwordless 6-Digit OTP</p>
              </div>
            </div>

            {customerProfile ? (
              /* Connected Account State */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>Status</span>
                    <span className="text-white font-medium flex items-center gap-1">
                      <Check className="w-3 h-3 text-white" /> Authenticated
                    </span>
                  </div>
                  {customerProfile.firstName && (
                    <div className="text-sm font-bold text-white">
                      {customerProfile.firstName} {customerProfile.lastName || ""}
                    </div>
                  )}
                  {customerProfile.email && (
                    <div className="text-xs text-white/60 font-mono truncate">{customerProfile.email}</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleOpenStoreAccount}
                    className="flex-1 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:bg-white/90 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>View Store Orders</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : step === "identifier" ? (
              /* Step 1: Send OTP to Email or Phone */
              <div className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSendOtp} className="space-y-3">
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">Email or Phone Number</label>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="name@example.com or +919876543210"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !identifier.trim()}
                    className="w-full py-3 rounded-full bg-white text-black font-bold text-xs hover:bg-white/90 disabled:opacity-30 transition-all flex items-center justify-center gap-2 shadow-md mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send 6-Digit OTP Code</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-3 border-t border-white/5 text-center">
                  <button
                    type="button"
                    onClick={handleOpenStoreAccount}
                    className="text-xs text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto"
                  >
                    <span>Or open shop.mrplus.in account page</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Verify 6-Digit OTP Code */
              <div className="space-y-4">
                {infoMsg && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs">
                    {infoMsg}
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">Enter 6-Digit OTP Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="1 2 3 4 5 6"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-center text-base tracking-[0.4em] font-mono text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 4}
                    className="w-full py-3 rounded-full bg-white text-black font-bold text-xs hover:bg-white/90 disabled:opacity-30 transition-all flex items-center justify-center gap-2 shadow-md mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Login</span>
                        <Check className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setStep("identifier")}
                    className="text-xs text-white/40 hover:text-white transition-colors"
                  >
                    Change Email / Phone
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
