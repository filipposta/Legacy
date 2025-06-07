import React, { useState, useEffect } from 'react'
import { 
  doc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  collection, 
  where, 
  serverTimestamp 
} from 'firebase/firestore'
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage'
import { db, storage } from '../firebase'
import {
  AtSymbolIcon,
  UserIcon,
  GlobeAltIcon,
  CalendarIcon,
  DocumentTextIcon,
  PhotoIcon,
  PaintBrushIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface EditProfileProps {
  user: any;
  userData: any;
  onUpdate: (newUsername: string, newDisplayName: string) => Promise<boolean>;
  error: string;
  onSaveComplete?: () => void;
}

const EditProfile: React.FC<EditProfileProps> = ({ user, userData, onUpdate, error, onSaveComplete }) => {
  const [username, setUsername] = useState(userData?.username || "");
  const [displayName, setDisplayName] = useState(userData?.displayName || "");
  const [bio, setBio] = useState(userData?.bio || "");
  const [profileImage, setProfileImage] = useState(userData?.profileImage || userData?.profilePic || "");
  const [backgroundImage, setBackgroundImage] = useState(userData?.backgroundImage || userData?.backgroundUrl || "");
  const [nationality, setNationality] = useState(userData?.nationality || "");
  const [birthDate, setBirthDate] = useState(userData?.birthDate || "");
  const [isAdult, setIsAdult] = useState(userData?.isAdult || false);
  const [age, setAge] = useState(userData?.age || 0);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [togglingAdult, setTogglingAdult] = useState(false);
  
  // Add new states for file uploads
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string>("");
  const [backgroundPreview, setBackgroundPreview] = useState<string>("");

  // Add new states for username validation
  const [usernameValidating, setUsernameValidating] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'available' | 'taken' | 'auto-generated' | 'checking'>('available');
  const [originalUsername, setOriginalUsername] = useState("");

  // Comprehensive nationality options with flags
  const nationalities = [
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "CA", name: "Canada", flag: "🇨🇦" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
    { code: "DE", name: "Germany", flag: "🇩🇪" },
    { code: "FR", name: "France", flag: "🇫🇷" },
    { code: "IT", name: "Italy", flag: "🇮🇹" },
    { code: "ES", name: "Spain", flag: "🇪🇸" },
    { code: "JP", name: "Japan", flag: "🇯🇵" },
    { code: "CN", name: "China", flag: "🇨🇳" },
    { code: "IN", name: "India", flag: "🇮🇳" },
    { code: "BR", name: "Brazil", flag: "🇧🇷" },
    { code: "AU", name: "Australia", flag: "🇦🇺" },
    { code: "MX", name: "Mexico", flag: "🇲🇽" },
    { code: "RU", name: "Russia", flag: "🇷🇺" },
    { code: "KR", name: "South Korea", flag: "🇰🇷" },
    { code: "NL", name: "Netherlands", flag: "🇳🇱" },
    { code: "SE", name: "Sweden", flag: "🇸🇪" },
    { code: "NO", name: "Norway", flag: "🇳🇴" },
    { code: "DK", name: "Denmark", flag: "🇩🇰" },
    { code: "FI", name: "Finland", flag: "🇫🇮" },
    { code: "CH", name: "Switzerland", flag: "🇨🇭" },
    { code: "AT", name: "Austria", flag: "🇦🇹" },
    { code: "BE", name: "Belgium", flag: "🇧🇪" },
    { code: "PL", name: "Poland", flag: "🇵🇱" },
    { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
    { code: "HU", name: "Hungary", flag: "🇭🇺" },
    { code: "GR", name: "Greece", flag: "🇬🇷" },
    { code: "PT", name: "Portugal", flag: "🇵🇹" },
    { code: "IE", name: "Ireland", flag: "🇮🇪" },
    { code: "ZA", name: "South Africa", flag: "🇿🇦" },
    { code: "AR", name: "Argentina", flag: "🇦🇷" },
    { code: "CL", name: "Chile", flag: "🇨🇱" },
    { code: "CO", name: "Colombia", flag: "🇨🇴" },
    { code: "PE", name: "Peru", flag: "🇵🇪" },
    { code: "VE", name: "Venezuela", flag: "🇻🇪" },
    { code: "EG", name: "Egypt", flag: "🇪🇬" },
    { code: "MA", name: "Morocco", flag: "🇲🇦" },
    { code: "NG", name: "Nigeria", flag: "🇳🇬" },
    { code: "KE", name: "Kenya", flag: "🇰🇪" },
    { code: "TH", name: "Thailand", flag: "🇹🇭" },
    { code: "VN", name: "Vietnam", flag: "🇻🇳" },
    { code: "PH", name: "Philippines", flag: "🇵🇭" },
    { code: "ID", name: "Indonesia", flag: "🇮🇩" },
    { code: "MY", name: "Malaysia", flag: "🇲🇾" },
    { code: "SG", name: "Singapore", flag: "🇸🇬" },
    { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
    { code: "TR", name: "Turkey", flag: "🇹🇷" },
    { code: "IL", name: "Israel", flag: "🇮🇱" },
    { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
    { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
    { code: "RO", name: "Romania", flag: "🇷🇴" },
    { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
    { code: "HR", name: "Croatia", flag: "🇭🇷" },
    { code: "RS", name: "Serbia", flag: "🇷🇸" },
    { code: "SI", name: "Slovenia", flag: "🇸🇮" },
    { code: "SK", name: "Slovakia", flag: "🇸🇰" },
    { code: "LT", name: "Lithuania", flag: "🇱🇹" },
    { code: "LV", name: "Latvia", flag: "🇱🇻" },
    { code: "EE", name: "Estonia", flag: "🇪🇪" },
    { code: "IS", name: "Iceland", flag: "🇮🇸" },
    { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
    { code: "MT", name: "Malta", flag: "🇲🇹" },
    { code: "CY", name: "Cyprus", flag: "🇨🇾" },
    { code: "UA", name: "Ukraine", flag: "🇺🇦" },
    { code: "BY", name: "Belarus", flag: "🇧🇾" },
    { code: "MD", name: "Moldova", flag: "🇲🇩" },
    { code: "GE", name: "Georgia", flag: "🇬🇪" },
    { code: "AM", name: "Armenia", flag: "🇦🇲" },
    { code: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
    { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
    { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
    { code: "IR", name: "Iran", flag: "🇮🇷" },
    { code: "IQ", name: "Iraq", flag: "🇮🇶" },
    { code: "JO", name: "Jordan", flag: "🇯🇴" },
    { code: "LB", name: "Lebanon", flag: "🇱🇧" },
    { code: "SY", name: "Syria", flag: "🇸🇾" },
    { code: "PK", name: "Pakistan", flag: "🇵🇰" },
    { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
    { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
    { code: "MM", name: "Myanmar", flag: "🇲🇲" },
    { code: "KH", name: "Cambodia", flag: "🇰🇭" },
    { code: "LA", name: "Laos", flag: "🇱🇦" },
    { code: "NP", name: "Nepal", flag: "🇳🇵" },
    { code: "BT", name: "Bhutan", flag: "🇧🇹" },
    { code: "MV", name: "Maldives", flag: "🇲🇻" }
  ];

  // Calculate age from birth date
  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    if (userData) {
      setUsername(userData.username || "");
      setDisplayName(userData.displayName || "");
      setBio(userData.bio || "");
      setProfileImage(userData.profileImage || userData.profilePic || "");
      setBackgroundImage(userData.backgroundImage || userData.backgroundUrl || "");
      setNationality(userData.nationality || "");
      setBirthDate(userData.birthDate || "");
      setIsAdult(userData.isAdult || false);
      setAge(userData.age || 0);
    }
  }, [userData]);

  // Update age when birth date changes
  useEffect(() => {
    if (birthDate) {
      const calculatedAge = calculateAge(birthDate);
      setAge(calculatedAge);
    }
  }, [birthDate]);

  const showNotification = (message: string, type: "success" | "error" | "info" | "warning") => {
    const notification = document.createElement('div');
    const bgColor = {
      success: 'bg-green-500/80',
      error: 'bg-red-500/80', 
      info: 'bg-blue-500/80',
      warning: 'bg-yellow-500/80'
    }[type];
    
    notification.className = `fixed top-6 right-6 ${bgColor} text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] text-base font-semibold transition-all duration-300`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) notification.parentNode.removeChild(notification);
      }, 400);
    }, 3000);
  };

  const toggleAdultContent = async () => {
    if (togglingAdult) return;
    
    if (!isAdult && age >= 18) {
      const confirmed = window.confirm(
        "⚠️ ADULT CONTENT WARNING ⚠️\n\n" +
        "You are about to enable adult content access. This will:\n\n" +
        "✅ Show an 18+ badge on your profile\n" +
        "✅ Allow you to view adult content from other users\n" +
        "✅ Make your profile visible in adult searches\n" +
        "✅ Enable interactions with other 18+ verified users\n" +
        "✅ Allow you to post adult content\n\n" +
        "⚠️ IMPORTANT RESPONSIBILITIES:\n" +
        "• You confirm you are 18 years or older\n" +
        "• You will use this feature responsibly\n" +
        "• You understand this is for mature content only\n" +
        "• You can disable this at any time\n\n" +
        "Do you want to enable adult content access?"
      );
      
      if (confirmed) {
        setTogglingAdult(true);
        setIsAdult(true);
        showNotification("✅ Adult content enabled!", "success");
        setTogglingAdult(false);
      }
    } else if (isAdult) {
      const confirmed = window.confirm(
        "🔒 DISABLE ADULT CONTENT ACCESS?\n\n" +
        "This will immediately:\n\n" +
        "❌ Remove the 18+ badge from your profile\n" +
        "❌ Restrict your access to adult content\n" +
        "❌ Hide your profile from adult content searches\n" +
        "❌ Prevent viewing of 18+ verified profiles\n" +
        "❌ Limit your interactions with adult content\n\n" +
        "✅ You can re-enable this feature at any time\n" +
        "✅ Your profile will remain visible to all users\n\n" +
        "Continue with disabling adult content?"
      );
      
      if (confirmed) {
        setTogglingAdult(true);
        setIsAdult(false);
        showNotification("🔒 Adult content disabled.", "info");
        setTogglingAdult(false);
      }
    } else {
      showNotification(
        "🔒 Adult content access is only available for users 18 and older. Current age: " + 
        (age > 0 ? age + " years old" : "Not set"),
        "warning"
      );
    }
  };

  // Add automatic username uniqueness checker
  const generateUniqueUsername = async (baseUsername: string): Promise<string> => {
    let uniqueUsername = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
    let counter = 1;
    
    // If username is too short, pad it
    if (uniqueUsername.length < 3) {
      uniqueUsername = uniqueUsername.padEnd(3, '0');
    }
    
    while (true) {
      try {
        const usernameQuery = query(
          collection(db, "users"), 
          where("username", "==", uniqueUsername)
        );
        const snapshot = await getDocs(usernameQuery);
        
        // If no users found with this username, it's available
        if (snapshot.empty) {
          return uniqueUsername;
        }
        
        // If this is the current user's username, allow it
        if (snapshot.docs.length === 1 && snapshot.docs[0].id === user?.uid) {
          return uniqueUsername;
        }
        
        // Generate next variation
        uniqueUsername = `${baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}${counter}`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 999) {
          uniqueUsername = `user${Date.now()}`;
          break;
        }
      } catch (error) {
        console.error("Error checking username availability:", error);
        // Fallback to timestamp-based username
        return `user${Date.now()}`;
      }
    }
    
    return uniqueUsername;
  };

  // FIXED: Add back username validation to prevent duplicates
  const validateUsername = async (inputUsername: string) => {
    if (!inputUsername || inputUsername.length < 2) {
      setUsernameStatus('available');
      return;
    }
    
    setUsernameValidating(true);
    setUsernameStatus('checking');
    
    try {
      const cleanUsername = inputUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Check if this is the user's current username
      if (cleanUsername === userData?.username?.toLowerCase()) {
        setUsernameStatus('available');
        setUsernameValidating(false);
        return;
      }
      
      // Check if username is taken by someone else
      const usernameQuery = query(
        collection(db, "users"), 
        where("username", "==", cleanUsername)
      );
      const snapshot = await getDocs(usernameQuery);
      
      if (snapshot.empty) {
        // Username is available
        setUsernameStatus('available');
        // Clean the username but don't force change
        if (cleanUsername !== inputUsername) {
          setUsername(cleanUsername);
          showNotification("Username cleaned (removed special characters)", "info");
        }
      } else {
        // Check if the found user is the current user
        const foundUser = snapshot.docs[0];
        if (foundUser.id === user?.uid) {
          setUsernameStatus('available');
        } else {
          // Username is taken - don't auto-change, just show error
          setUsernameStatus('taken');
          showNotification(`Username "${cleanUsername}" is already taken. Please choose a different one.`, "error");
        }
      }
    } catch (error) {
      console.error("Error validating username:", error);
      setUsernameStatus('available');
      showNotification("Unable to check username availability", "warning");
    } finally {
      setUsernameValidating(false);
    }
  };

  // Re-enable debounced username validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username && username !== userData?.username) {
        validateUsername(username);
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [username, userData?.username]);

  const handleSave = async () => {
    if (!user || saving) return;
    
    // Check if username is taken before saving
    if (usernameStatus === 'taken') {
      showNotification("Cannot save: Username is already taken", "error");
      return;
    }
    
    setSaving(true);
    try {
      // Add retry logic for username validation
      if (username !== userData?.username) {
        setUsernameValidating(true);
        
        let validationAttempts = 0;
        let validationSuccess = false;
        
        while (validationAttempts < 3 && !validationSuccess) {
          try {
            const usernameQuery = query(
              collection(db, "users"), 
              where("username", "==", username.toLowerCase())
            );
            const snapshot = await getDocs(usernameQuery);
            
            if (!snapshot.empty && snapshot.docs[0].id !== user.uid) {
              showNotification("Username is taken by another user", "error");
              setUsernameValidating(false);
              setSaving(false);
              return;
            }
            validationSuccess = true;
          } catch (error) {
            validationAttempts++;
            console.warn(`Username validation attempt ${validationAttempts} failed:`, error);
            
            if (validationAttempts >= 3) {
              showNotification("Unable to validate username. Please try again.", "error");
              setUsernameValidating(false);
              setSaving(false);
              return;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        setUsernameValidating(false);
      }
      
      const finalUsername = username;
      
      console.log("✅ Saving with user's exact username:", finalUsername);
      
      // Retry profile update with exponential backoff
      let updateAttempts = 0;
      let updateSuccess = false;
      
      while (updateAttempts < 3 && !updateSuccess) {
        try {
          const success = await onUpdate(finalUsername, displayName);
          
          if (success) {
            // Calculate age first
            const calculatedAge = birthDate ? calculateAge(birthDate) : 0;
            
            // Database update with retry logic
            const updateTimestamp = Date.now();
            const forceRefreshToken = `${updateTimestamp}-${Math.random()}`;
            
            const imageUrl = profileImage || "";
            const bgImageUrl = backgroundImage || "";
            
            await updateDoc(doc(db, "users", user.uid), {
              bio: bio,
              profileImage: imageUrl,
              profilePic: imageUrl,
              backgroundImage: bgImageUrl,
              backgroundUrl: bgImageUrl,
              username: finalUsername,
              displayName: displayName,
              nationality: nationality,
              birthDate: birthDate,
              age: calculatedAge,
              isAdult: calculatedAge >= 18 ? isAdult : false,
              updatedAt: serverTimestamp(),
              lastModified: updateTimestamp,
              _forceRefresh: forceRefreshToken,
            });
            
            updateSuccess = true;
            
            // Wait for database commit
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verification with retry
            let verificationAttempts = 0;
            let verifiedData = null;
            
            while (verificationAttempts < 3 && !verifiedData) {
              try {
                const verifyDoc = await getDoc(doc(db, "users", user.uid));
                const savedData = verifyDoc.data();
                
                if (savedData && savedData._forceRefresh === forceRefreshToken) {
                  verifiedData = savedData;
                  break;
                }
              } catch (error) {
                console.warn(`Verification attempt ${verificationAttempts + 1} failed:`, error);
              }
              
              verificationAttempts++;
              if (verificationAttempts < 3) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            showNotification("✅ Profile updated successfully!", "success");
            
            // Dispatch refresh events
            const refreshData = {
              userId: user.uid,
              timestamp: updateTimestamp,
              profileImage: verifiedData?.profileImage || imageUrl,
              backgroundImage: verifiedData?.backgroundImage || bgImageUrl,
              verified: true,
              _forceRefresh: forceRefreshToken,
            };
            
            window.dispatchEvent(new CustomEvent('profileUpdated', { detail: refreshData }));
            
            setTimeout(() => {
              if (onSaveComplete) {
                onSaveComplete();
              }
            }, 4000);
          }
        } catch (error: any) {
          updateAttempts++;
          console.error(`Update attempt ${updateAttempts} failed:`, error);
          
          if (error.code === 'auth/network-request-failed' || 
              error.code === 'unavailable') {
            if (updateAttempts < 3) {
              showNotification(`Connection error. Retrying... (${updateAttempts}/3)`, "warning");
              await new Promise(resolve => setTimeout(resolve, 2000 * updateAttempts));
            } else {
              showNotification("❌ Network error. Please check your connection and try again.", "error");
              break;
            }
          } else {
            showNotification(`❌ Error updating profile: ${error.message}`, "error");
            break;
          }
        }
      }
      
    } catch (error: any) {
      console.error("Error updating profile:", error);
      showNotification("❌ Error updating profile", "error");
    } finally {
      setSaving(false);
    }
  };

  // Add file upload handlers
  const handleProfileImageUpload = async (file: File) => {
    if (!user || !file) return;
    
    setUploadingProfile(true);
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showNotification("Please select a valid image file", "error");
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showNotification("Image must be less than 5MB", "error");
        return;
      }
      
      const timestamp = Date.now();
      const fileName = `profile_${user.uid}_${timestamp}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, `profile-images/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setProfileImage(downloadURL);
      setProfileImageFile(null);
      setProfilePreview("");
      
      showNotification("✅ Profile image uploaded successfully!", "success");
    } catch (error) {
      console.error("Error uploading profile image:", error);
      showNotification("❌ Failed to upload profile image", "error");
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleBackgroundImageUpload = async (file: File) => {
    if (!user || !file) return;
    
    setUploadingBackground(true);
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showNotification("Please select a valid image file", "error");
        return;
      }
      
      // Validate file size (10MB max for backgrounds)
      if (file.size > 10 * 1024 * 1024) {
        showNotification("Background image must be less than 10MB", "error");
        return;
      }
      
      const timestamp = Date.now();
      const fileName = `background_${user.uid}_${timestamp}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, `background-images/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setBackgroundImage(downloadURL);
      setBackgroundImageFile(null);
      setBackgroundPreview("");
      
      showNotification("✅ Background image uploaded successfully!", "success");
    } catch (error) {
      console.error("Error uploading background image:", error);
      showNotification("❌ Failed to upload background image", "error");
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleProfileFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Automatically upload the file when selected
      handleProfileImageUpload(file);
    }
  };

  const handleBackgroundFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Automatically upload the file when selected
      handleBackgroundImageUpload(file);
    }
  };

  // Add state for nationality search
  const [nationalitySearch, setNationalitySearch] = useState("")
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false)

  // Filter nationalities based on search
  const filteredNationalities = nationalities.filter(nat =>
    nat.name.toLowerCase().includes(nationalitySearch.toLowerCase()) ||
    nat.code.toLowerCase().includes(nationalitySearch.toLowerCase())
  )

  // Get selected nationality display
  const selectedNationality = nationalities.find(nat => nat.code === nationality)

  // Update nationality search when nationality changes
  useEffect(() => {
    if (nationality) {
      const selected = nationalities.find(nat => nat.code === nationality)
      if (selected) {
        setNationalitySearch(`${selected.flag} ${selected.name}`)
      }
    }
  }, [nationality])

  // Close nationality dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.nationality-container')) {
        setShowNationalityDropdown(false)
      }
    }

    if (showNationalityDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNationalityDropdown])

  return (
    <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/50 to-blue-600/50 p-6 border-b border-white/20">
        <h3 className="text-2xl font-bold text-white flex items-center">
          <SparklesIcon className="w-6 h-6 mr-3 animate-pulse" />
          Edit Your Profile
        </h3>
        <p className="text-white/80 mt-2">Customize your profile to make it uniquely yours</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Username and Display Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center text-white font-medium text-sm">
              <AtSymbolIcon className="w-4 h-4 mr-2 text-purple-400" />
              Username
              {usernameValidating && (
                <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b border-white"></div>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full bg-white/10 backdrop-blur-md text-white px-4 py-3 rounded-xl border placeholder-white/50 focus:outline-none focus:ring-2 focus:bg-white/20 transition-all duration-300 ${
                  usernameStatus === 'available' ? 'border-green-500/50 focus:ring-green-500' :
                  usernameStatus === 'taken' ? 'border-red-500/50 focus:ring-red-500' :
                  usernameStatus === 'auto-generated' ? 'border-yellow-500/50 focus:ring-yellow-500' :
                  'border-white/20 focus:ring-purple-500'
                }`}
                placeholder="Enter your username"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                {usernameValidating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : usernameStatus === 'available' ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                ) : usernameStatus === 'taken' ? (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                ) : (
                  <AtSymbolIcon className="w-5 h-5 text-white/30" />
                )}
              </div>
            </div>
            
            {/* Username status indicator */}
            <div className="text-xs">
              {usernameStatus === 'available' && username && (
                <span className="text-green-400 flex items-center">
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  Username is available
                </span>
              )}
              {usernameStatus === 'taken' && (
                <span className="text-red-400 flex items-center">
                  <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                  Username is already taken
                </span>
              )}
              {usernameStatus === 'checking' && (
                <span className="text-blue-400 flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-400 mr-1"></div>
                  Checking availability...
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center text-white font-medium text-sm">
              <UserIcon className="w-4 h-4 mr-2 text-blue-400" />
              Display Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-white/20 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/20 transition-all duration-300"
                placeholder="Enter your display name"
              />
              <UserIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/30" />
            </div>
          </div>
        </div>

        {/* Nationality and Birth Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center text-white font-medium text-sm">
              <GlobeAltIcon className="w-4 h-4 mr-2 text-green-400" />
              Nationality
            </label>
            <div className="nationality-container relative">
              <input
                type="text"
                value={nationalitySearch}
                onChange={(e) => {
                  setNationalitySearch(e.target.value)
                  setShowNationalityDropdown(true)
                }}
                onFocus={() => setShowNationalityDropdown(true)}
                className="w-full bg-white/10 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-white/20 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white/20 transition-all duration-300"
                placeholder="Search for your nationality..."
              />
              
              {/* Dropdown */}
              {showNationalityDropdown && nationalitySearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto scroll-smooth">
                  {filteredNationalities.length > 0 ? (
                    filteredNationalities.slice(0, 10).map((nat) => (
                      <button
                        key={nat.code}
                        type="button"
                        onClick={() => {
                          setNationality(nat.code)
                          setNationalitySearch(`${nat.flag} ${nat.name}`)
                          setShowNationalityDropdown(false)
                        }}
                        className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-3 border-b border-gray-700 last:border-b-0"
                      >
                        <span className="text-xl">{nat.flag}</span>
                        <span className="text-sm">{nat.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-400 text-center">
                      No nationality found
                    </div>
                  )}
                </div>
              )}
              
              {/* Clear button */}
              {nationality && (
                <button
                  type="button"
                  onClick={() => {
                    setNationality("")
                    setNationalitySearch("")
                    setShowNationalityDropdown(false)
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center text-white font-medium text-sm">
              <CalendarIcon className="w-4 h-4 mr-2 text-yellow-400" />
              Birth Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white/20 transition-all duration-300"
              />
            </div>
            {age > 0 && (
              <p className="text-xs text-gray-300">
                You are {age} years old {isAdult ? "(Adult content enabled)" : "(Adult content disabled)"}
              </p>
            )}
          </div>
        </div>

        {/* Bio Field */}
        <div className="space-y-2">
          <label className="flex items-center text-white font-medium text-sm">
            <DocumentTextIcon className="w-4 h-4 mr-2 text-pink-400" />
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 500))}
            rows={4}
            className="w-full bg-white/10 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-white/20 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white/20 transition-all duration-300 resize-none"
            placeholder="Tell us about yourself..."
          />
          <div className="text-right text-white/50 text-xs">
            {bio.length}/500 characters
          </div>
        </div>

        {/* Profile Image Field */}
        <div className="space-y-2">
          <label className="flex items-center text-white font-medium text-sm">
            <PhotoIcon className="w-4 h-4 mr-2 text-purple-400" />
            Profile Image
          </label>
          
          {/* Current Image Preview */}
          {profileImage && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <div className="flex items-center space-x-4">
                <img 
                  src={profileImage} 
                  alt="Current profile" 
                  className="w-20 h-20 rounded-full object-cover border-2 border-purple-400 shadow-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-medium">Current Profile Image</p>
                  <p className="text-white/60 text-xs">Click "Choose New File" to replace</p>
                </div>
                <button
                  onClick={() => setProfileImage("")}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm transition-all duration-300"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* URL Input */}
          <div className="relative">
            <input
              type="url"
              value={profileImage}
              onChange={(e) => setProfileImage(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-white/20 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white/20 transition-all duration-300"
              placeholder="https://example.com/image.jpg or upload below"
            />
            <PhotoIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/30" />
          </div>

          {/* File Upload Section - Always Visible */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex flex-col space-y-3">
              <div className="text-white/80 text-sm font-medium">
                {profileImage ? "Upload New Image" : "Upload from Device"}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-32 h-32 rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                  {profilePreview ? (
                    <img src={profilePreview} alt="Preview" className="w-full h-full object-cover rounded-lg transition-all duration-300" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <PhotoIcon className="h-8 w-8 mb-1" />
                      <span className="text-xs">Preview</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileFileSelect}
                    className="hidden"
                    id="profile-upload"
                    disabled={uploadingProfile}
                  />
                  <label
                    htmlFor="profile-upload"
                    className={`cursor-pointer ${
                      profileImage 
                        ? 'bg-orange-600 hover:bg-orange-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 text-sm font-medium ${
                      uploadingProfile ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <PhotoIcon className="h-4 w-4" />
                    <span>{profileImage ? 'Choose New File' : 'Choose File'}</span>
                  </label>
                  <div className="text-xs text-gray-400 mt-1">
                    Max 5MB • JPG, PNG, GIF
                  </div>
                  {profileImage && (
                    <div className="text-xs text-orange-300 mt-1">
                      This will replace your current image
                    </div>
                  )}
                </div>
              </div>

              {/* Show upload status */}
              {uploadingProfile && (
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    <span className="text-blue-200 text-sm">Uploading profile image...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* New Upload Preview */}
          {profilePreview && (
            <div className="mt-3 p-3 bg-green-500/10 border border-green-400/30 rounded-xl">
              <div className="flex items-center space-x-3">
                <img 
                  src={profilePreview} 
                  alt="New profile preview" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-green-400 shadow-lg transition-all duration-300"
                />
                <div className="flex-1">
                  <p className="text-green-200 text-sm font-medium">New Profile Image Ready</p>
                  <p className="text-green-300/60 text-xs">Click "Save Profile" to apply changes</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Background Image Field */}
        <div className="space-y-2">
          <label className="flex items-center text-white font-medium text-sm">
            <PaintBrushIcon className="w-4 h-4 mr-2 text-blue-400" />
            Background Image
          </label>
          
          {/* Current Background Preview */}
          {backgroundImage && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <div className="flex flex-col space-y-3">
                <div className="text-white/80 text-sm font-medium">Current Background</div>
                <img 
                  src={backgroundImage} 
                  alt="Current background" 
                  className="w-full h-24 rounded-lg object-cover border border-white/20 shadow-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="flex justify-between items-center">
                  <p className="text-white/60 text-xs">Click "Choose New File" to replace</p>
                  <button
                    onClick={() => setBackgroundImage("")}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm transition-all duration-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* URL Input */}
          <div className="relative">
            <input
              type="url"
              value={backgroundImage}
              onChange={(e) => setBackgroundImage(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-white/20 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/20 transition-all duration-300"
              placeholder="https://example.com/background.jpg or upload below"
            />
            <PaintBrushIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/30" />
          </div>

          {/* File Upload Section - Always Visible */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex flex-col space-y-3">
              <div className="text-white/80 text-sm font-medium">
                {backgroundImage ? "Upload New Background" : "Upload from Device"}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-40 h-24 rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                  {backgroundPreview ? (
                    <img src={backgroundPreview} alt="Background Preview" className="w-full h-full object-cover rounded-lg transition-all duration-300" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <PaintBrushIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">Preview</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundFileSelect}
                    className="hidden"
                    id="background-upload"
                    disabled={uploadingBackground}
                  />
                  <label
                    htmlFor="background-upload"
                    className={`cursor-pointer ${
                      backgroundImage 
                        ? 'bg-orange-600 hover:bg-orange-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 text-sm font-medium ${
                      uploadingBackground ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <PaintBrushIcon className="h-4 w-4" />
                    <span>{backgroundImage ? 'Choose New File' : 'Choose File'}</span>
                  </label>
                  <div className="text-xs text-gray-400 mt-1">
                    Max 10MB • JPG, PNG, GIF
                  </div>
                  {backgroundImage && (
                    <div className="text-xs text-orange-300 mt-1">
                      This will replace your current background
                    </div>
                  )}
                </div>
              </div>

              {/* Show upload status */}
              {uploadingBackground && (
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    <span className="text-blue-200 text-sm">Uploading background image...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* New Upload Preview */}
          {backgroundPreview && (
            <div className="mt-3 p-3 bg-green-500/10 border border-green-400/30 rounded-xl">
              <div className="text-green-200 text-sm mb-2 font-medium">New Background Ready</div>
              <img 
                src={backgroundPreview} 
                alt="New background preview" 
                className="w-full h-24 rounded-lg object-cover border border-green-400/50 shadow-lg transition-all duration-300"
              />
              <div className="text-green-300/60 text-xs mt-2">Click "Save Profile" to apply changes</div>
            </div>
          )}
        </div>

        {/* Adult Content Toggle Section */}
        <div className="space-y-4">
          <label className="block text-white font-semibold">Adult Content Settings</label>
          <div className="bg-gradient-to-r from-red-500/10 to-red-500/10 border border-red-500/30 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-white font-medium mb-2">18+ Adult Content Access</h4>
                <p className="text-gray-300 text-sm mb-4">
                  Enable access to adult content and interactions with verified 18+ users.
                  {age < 18 && " (Only available for users 18 and older)"}
                </p>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={toggleAdultContent}
                    disabled={togglingAdult}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                      isAdult 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : age >= 18
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                          : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {togglingAdult ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <span>{isAdult ? '🔓 Enabled' : '🔒 Disabled'}</span>
                    )}
                  </button>
                  {isAdult && (
                    <div className="bg-red-500/20 px-3 py-1 rounded-full">
                      <span className="text-red-200 text-xs font-medium">18+ Active</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center space-x-3 p-4 bg-red-500/20 backdrop-blur-md border border-red-500/50 rounded-xl text-red-200">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Display */}
        {showSuccess && (
          <div className="flex items-center space-x-3 p-4 bg-green-500/20 backdrop-blur-md border border-green-500/50 rounded-xl text-green-200">
            <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span>Profile updated successfully!</span>
          </div>
        )}

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving || uploadingProfile || uploadingBackground || usernameValidating}
            className="w-full group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
          >
            {saving || uploadingProfile || uploadingBackground || usernameValidating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <CheckCircleIcon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                <span>Save Profile</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
