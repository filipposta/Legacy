import React, { useState, useEffect } from "react";
// Change back to named import and ensure we're importing from the .ts file
import { auth } from "../firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Use auth directly
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const features = [
    {
      icon: "🚀",
      title: "Premium Social Experience",
      description: "Connect with friends in a completely new way with our advanced social features."
    },
    {
      icon: "💬",
      title: "Real-time Chat",
      description: "Instant messaging with emojis, images, and group conversations."
    },
    {
      icon: "👥",
      title: "Friend Network",
      description: "Build your social circle and discover new connections."
    },
    {
      icon: "🎨",
      title: "Customizable Profiles",
      description: "Express yourself with personalized profiles and backgrounds."
    },
    {
      icon: "🔒",
      title: "Secure & Private",
      description: "Your data is protected with enterprise-grade security."
    },
    {
      icon: "📱",
      title: "Mobile Optimized",
      description: "Perfect experience across all your devices."
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-20 sm:h-24 lg:h-28">
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
              <img 
                src={logo} 
                alt="Legacy Logo" 
                className="h-16 sm:h-20 lg:h-24 w-auto object-contain"
              />
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-2 py-1 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2 rounded-full text-xs sm:text-sm lg:text-base font-bold">
                PREMIUM
              </span>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
              {user ? (
                <>
                  <button 
                    onClick={() => navigate("/posts")} 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2 rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm lg:text-base"
                  >
                    Posts
                  </button>
                  <button 
                    onClick={() => navigate("/profile")} 
                    className="border border-white/30 hover:bg-white/10 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm lg:text-base"
                  >
                    Profile
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => navigate("/login")} 
                    className="border border-white/30 hover:bg-white/10 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm lg:text-base"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => navigate("/register")} 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2 rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm lg:text-base"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-28 lg:pt-36 pb-16 sm:pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-6 sm:mb-8">
            <span className="inline-flex items-center bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full px-4 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm font-medium mb-6 sm:mb-8">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Premium Social Platform
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6">
            <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Welcome to the Future
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              of Social Connection
            </span>
          </h1>
          
          <p className="text-base sm:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4">
            Experience social networking like never before with Legacy Premium. 
            Connect, chat, and share in a beautiful, secure environment.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
            {!user ? (
              <>
                <button 
                  onClick={() => navigate("/register")} 
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                >
                  Start Your Journey
                </button>
                <button 
                  onClick={() => navigate("/login")} 
                  className="w-full sm:w-auto border-2 border-white/30 hover:bg-white/10 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all duration-200"
                >
                  Sign In
                </button>
              </>
            ) : (
              <button 
                onClick={() => navigate("/posts")} 
                className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
              >
                Go to Posts
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Premium Features
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto px-4">
              Discover what makes Legacy the ultimate social platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10"
              >
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{feature.icon}</div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-white">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
            <img 
              src={logo} 
              alt="Legacy Logo" 
              className="h-14 sm:h-18 lg:h-20 w-auto object-contain"
            />
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm sm:text-base font-bold">
              PREMIUM
            </span>
          </div>
          <p className="text-sm sm:text-base text-gray-400">
            © 2025 Legacy Premium. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Home;