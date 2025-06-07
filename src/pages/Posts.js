import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { auth, db, storage } from "../firebase";
import { collection, query, orderBy, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { HeartIcon, ChatBubbleOvalLeftEllipsisIcon, ShareIcon, PhotoIcon, LinkIcon, EllipsisVerticalIcon, MagnifyingGlassIcon, UserIcon, FireIcon, XMarkIcon, PencilIcon, TrashIcon, GifIcon, UserGroupIcon, GlobeAltIcon, NewspaperIcon, } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import logo from "../assets/logo.png";
// Giphy API key
const GIPHY_API_KEY = "106VuSed3O2odVxY5c3sr8bzI1Yp0Y71";
// Helper function to highlight search terms
function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm.trim())
        return text;
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-400 text-black px-1 rounded">$1</mark>');
}
// Format time function
function formatTime(timestamp) {
    if (!timestamp)
        return 'Just now';
    try {
        const date = timestamp?.toDate ? timestamp.toDate() :
            timestamp instanceof Date ? timestamp :
                new Date(timestamp);
        if (isNaN(date.getTime()))
            return 'Just now';
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        if (diffInMinutes < 1)
            return 'Just now';
        if (diffInMinutes < 60)
            return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440)
            return `${Math.floor(diffInMinutes / 60)}h ago`;
        if (diffInMinutes < 10080)
            return `${Math.floor(diffInMinutes / 1440)}d ago`;
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
    catch (error) {
        console.error("Error formatting time:", error);
        return 'Just now';
    }
}
// Get initials function
function getInitials(user) {
    if (!user || (!user.displayName && !user.username))
        return 'U';
    const name = user.displayName || user.username || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
function Posts() {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [newPost, setNewPost] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [newImageUrl, setNewImageUrl] = useState("");
    const [newVideoUrl, setNewVideoUrl] = useState("");
    const [showImageInput, setShowImageInput] = useState(false);
    const [showVideoInput, setShowVideoInput] = useState(false);
    const [commentInputs, setCommentInputs] = useState({});
    const [showComments, setShowComments] = useState({});
    const [postVisibility, setPostVisibility] = useState('public');
    const [imageFile, setImageFile] = useState(null);
    const [videoFile, setVideoFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [likingPosts, setLikingPosts] = useState(new Set());
    const [addingComments, setAddingComments] = useState(new Set());
    const [showDropdown, setShowDropdown] = useState({});
    const [trendingPosts, setTrendingPosts] = useState([]);
    const [showTrending, setShowTrending] = useState(false);
    const [showNews, setShowNews] = useState(false); // Add new state for news mode
    const [editingPost, setEditingPost] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [editingComment, setEditingComment] = useState(null);
    const [editCommentContent, setEditCommentContent] = useState("");
    // New states for GIF support
    const [showGifPicker, setShowGifPicker] = useState({});
    const [gifSearchQuery, setGifSearchQuery] = useState("");
    const [gifs, setGifs] = useState([]);
    const [loadingGifs, setLoadingGifs] = useState(false);
    const [selectedGif, setSelectedGif] = useState({});
    const [showPostGifPicker, setShowPostGifPicker] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    // Helper functions for video URLs
    const getYouTubeEmbedUrl = (url) => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? `https://www.youtube.com/embed/${match[1]}` : url;
    };
    const getVimeoEmbedUrl = (url) => {
        const regex = /vimeo\.com\/(?:.*\/)?(\d+)/;
        const match = url.match(regex);
        return match ? `https://player.vimeo.com/video/${match[1]}` : url;
    };
    const isValidVideoUrl = (url) => {
        try {
            const validUrl = new URL(url);
            const domain = validUrl.hostname.toLowerCase();
            // Check for supported video platforms
            const supportedDomains = [
                'youtube.com', 'www.youtube.com', 'youtu.be',
                'vimeo.com', 'www.vimeo.com',
                'drive.google.com', 'dropbox.com'
            ];
            // Check for direct video file extensions
            const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
            const hasVideoExtension = videoExtensions.some(ext => validUrl.pathname.toLowerCase().includes(ext));
            return supportedDomains.some(domain_check => domain.includes(domain_check)) || hasVideoExtension;
        }
        catch {
            return false;
        }
    };
    // Search GIFs from Giphy API
    const searchGifs = async (query, postKey) => {
        if (!query.trim()) {
            // If empty query, get trending GIFs
            setLoadingGifs(true);
            try {
                const response = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`);
                const data = await response.json();
                setGifs(data.data);
            }
            catch (error) {
                console.error("Error fetching trending GIFs:", error);
            }
            finally {
                setLoadingGifs(false);
            }
            return;
        }
        setLoadingGifs(true);
        try {
            const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&offset=0&rating=g&lang=en`);
            const data = await response.json();
            setGifs(data.data);
        }
        catch (error) {
            console.error("Error searching GIFs:", error);
        }
        finally {
            setLoadingGifs(false);
        }
    };
    // Handle GIF selection
    const handleGifSelect = (postKey, gifUrl) => {
        setSelectedGif({ ...selectedGif, [postKey]: gifUrl });
        setShowGifPicker({ ...showGifPicker, [postKey]: false });
    };
    // Handle GIF selection for posts
    const handlePostGifSelect = (gifUrl) => {
        setSelectedGif({ ...selectedGif, 'main-post': gifUrl });
        setShowPostGifPicker(false);
    };
    // Load initial trending GIFs
    useEffect(() => {
        const loadTrendingGifs = async () => {
            try {
                const response = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`);
                const data = await response.json();
                setGifs(data.data);
            }
            catch (error) {
                console.error("Error fetching trending GIFs:", error);
            }
        };
        loadTrendingGifs();
    }, []);
    // Load user profile
    const loadUserProfile = async (userId) => {
        try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                return {
                    uid: userId,
                    username: data.username || data.email?.split('@')[0] || "User",
                    displayName: data.displayName || data.username || data.email?.split('@')[0] || "User",
                    profilePic: data.profilePic || "",
                    email: data.email || "",
                    friends: data.friends || [],
                    role: data.role || "user",
                    backgroundUrl: data.backgroundUrl || ""
                };
            }
            return null;
        }
        catch (error) {
            console.error("Error loading user profile:", error);
            return null;
        }
    };
    // Get role badge component
    const getRoleBadge = (role) => {
        switch (role) {
            case "founder":
                return (_jsxs("div", { className: "flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-orange-500 px-2 py-1 rounded-full text-xs font-bold text-white shadow-lg", children: [_jsx(StarIconSolid, { className: "h-3 w-3" }), _jsx("span", { children: "FOUNDER" })] }));
            case "admin":
                return (_jsx("div", { className: "flex items-center space-x-1 bg-gradient-to-r from-red-500 to-red-500 px-2 py-1 rounded-full text-xs font-bold text-white shadow-lg", children: _jsx("span", { children: "ADMIN" }) }));
            case "moderator":
                return (_jsx("div", { className: "flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-blue-600 px-2 py-1 rounded-full text-xs font-bold text-white shadow-lg", children: _jsx("span", { children: "MOD" }) }));
            case "vip":
                return (_jsx("div", { className: "flex items-center space-x-1 bg-gradient-to-r from-purple-500 to-purple-600 px-2 py-1 rounded-full text-xs font-bold text-white shadow-lg", children: _jsx("span", { children: "VIP" }) }));
            default:
                return null;
        }
    };
    // Check if user can edit/delete post
    const canEditPost = (post) => {
        if (!user || !userProfile)
            return false;
        return post.authorId === user.uid || userProfile.role === 'founder';
    };
    // Check if user can delete comment
    const canDeleteComment = (comment, post) => {
        if (!user || !userProfile)
            return false;
        return (comment.authorId === user.uid ||
            post.authorId === user.uid ||
            userProfile.role === 'founder');
    };
    // Edit comment function
    const handleEditComment = async (postId, commentId, newContent) => {
        if (!newContent.trim() || editingComment)
            return;
        try {
            const postRef = doc(db, "posts", postId);
            const postSnap = await getDoc(postRef);
            if (!postSnap.exists()) {
                throw new Error("Post not found");
            }
            const postData = postSnap.data();
            const updatedComments = (postData.comments || []).map((comment) => {
                if (comment.id === commentId) {
                    return {
                        ...comment,
                        content: newContent.trim(),
                        editedAt: new Date()
                    };
                }
                return comment;
            });
            await updateDoc(postRef, {
                comments: updatedComments,
                lastUpdated: new Date()
            });
            setPosts(posts.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        comments: post.comments.map(comment => {
                            if (comment.id === commentId) {
                                return { ...comment, content: newContent.trim() };
                            }
                            return comment;
                        })
                    };
                }
                return post;
            }));
            alert("✅ Comment updated successfully!");
        }
        catch (error) {
            console.error("Error editing comment:", error);
            alert("❌ Error updating comment");
        }
    };
    // Delete comment
    const handleDeleteComment = async (postId, commentId) => {
        if (!window.confirm("Are you sure you want to delete this comment?"))
            return;
        try {
            const postRef = doc(db, "posts", postId);
            const postSnap = await getDoc(postRef);
            if (!postSnap.exists()) {
                throw new Error("Post not found");
            }
            const postData = postSnap.data();
            const updatedComments = (postData.comments || []).filter((comment) => comment.id !== commentId);
            await updateDoc(postRef, {
                comments: updatedComments,
                lastUpdated: new Date()
            });
            setPosts(posts.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        comments: post.comments.filter(comment => comment.id !== commentId)
                    };
                }
                return post;
            }));
            alert("✅ Comment deleted successfully!");
        }
        catch (error) {
            console.error("Error deleting comment:", error);
            alert("❌ Error deleting comment");
        }
    };
    // Edit post
    const handleEditPost = async (postId) => {
        if (!editContent.trim() || editingPost)
            return;
        try {
            const postRef = doc(db, "posts", postId);
            await updateDoc(postRef, {
                content: editContent.trim(),
                editedAt: new Date(),
                lastUpdated: new Date()
            });
            setPosts(posts.map((post) => {
                if (post.id === postId) {
                    return { ...post, content: editContent.trim() };
                }
                return post;
            }));
            setEditingPost(null);
            setEditContent("");
            alert("✅ Post updated successfully!");
        }
        catch (error) {
            console.error("Error editing post:", error);
            alert("❌ Error updating post");
        }
    };
    // Delete post
    const handleDeletePost = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this post?"))
            return;
        try {
            await deleteDoc(doc(db, "posts", postId));
            setPosts(posts.filter(post => post.id !== postId));
            alert("✅ Post deleted successfully!");
        }
        catch (error) {
            console.error("Error deleting post:", error);
            alert("❌ Error deleting post");
        }
    };
    // Share post handler
    const handleShare = async (post) => {
        try {
            const postUrl = `${window.location.origin}/user/${post.authorProfile.username}#post-${post.id}`;
            await navigator.clipboard.writeText(postUrl);
            // Show a dark, transparent notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-6 right-6 bg-black/80 text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] text-base font-semibold transition-all duration-300';
            notification.textContent = '✅ Post link copied to clipboard!';
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode)
                        notification.parentNode.removeChild(notification);
                }, 400);
            }, 2000);
        }
        catch (error) {
            alert('Failed to copy post link');
        }
    };
    // Add this function to handle news search
    const searchForNews = async (query) => {
        if (!query)
            return;
        setSearchQuery(query);
        setIsSearching(true);
        try {
            // Here you would integrate with a news API
            // For now, we'll just search existing posts for news-like content
            const newsKeywords = ['news', 'report', 'update', 'breaking', 'today', 'announced'];
            // Filter posts that may contain news
            const results = posts.filter(post => {
                // Check if post content contains the search query
                if (post.content.toLowerCase().includes(query.toLowerCase())) {
                    // Also check if post has news-like keywords
                    return newsKeywords.some(keyword => post.content.toLowerCase().includes(keyword.toLowerCase()));
                }
                return false;
            });
            setSearchResults(results);
            setShowSearchResults(true);
        }
        catch (error) {
            console.error('Error searching for news:', error);
        }
        finally {
            setIsSearching(false);
        }
    };
    // Enhanced comment handler with GIF support
    const handleAddComment = async (postId, index) => {
        const postKey = `${postId}-${index}`;
        const commentContent = commentInputs[postKey] || "";
        const gifUrl = selectedGif[postKey];
        // Allow empty comment content if a GIF is selected
        if ((!commentContent?.trim() && !gifUrl) || !user || !userProfile || addingComments.has(postKey))
            return;
        // Check if user is authenticated
        if (!user.uid) {
            alert("❌ You must be logged in to comment on posts");
            return;
        }
        // Add to adding comments set
        setAddingComments(prev => new Set(prev).add(postKey));
        try {
            const newComment = {
                id: `${Date.now()}_${user.uid}`,
                content: commentContent.trim(),
                authorId: user.uid,
                timestamp: new Date(),
                gifUrl: gifUrl || ""
            };
            const postRef = doc(db, "posts", postId);
            const postSnap = await getDoc(postRef);
            if (!postSnap.exists()) {
                throw new Error("Post not found");
            }
            const postData = postSnap.data();
            const currentComments = Array.isArray(postData.comments) ? postData.comments : [];
            const updatedComments = [...currentComments, newComment];
            await updateDoc(postRef, {
                comments: updatedComments,
                lastUpdated: serverTimestamp()
            });
            const commentWithProfile = {
                ...newComment,
                authorProfile: userProfile
            };
            setPosts(prevPosts => prevPosts.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        comments: [...post.comments, commentWithProfile]
                    };
                }
                return post;
            }));
            setCommentInputs({ ...commentInputs, [postKey]: "" });
            setSelectedGif({ ...selectedGif, [postKey]: "" });
        }
        catch (error) {
            console.error("Error adding comment:", error);
            // Handle specific error types
            if (error?.code === 'permission-denied') {
                alert("❌ Permission denied. Please check your account permissions and try logging out and back in.");
            }
            else if (error?.code === 'unauthenticated') {
                alert("❌ You must be logged in to comment. Please log in and try again.");
                navigate("/login");
            }
            else if (error?.code === 'unavailable') {
                alert("❌ Service temporarily unavailable. Please check your internet connection and try again.");
            }
            else if (error?.code === 'deadline-exceeded') {
                alert("❌ Request timed out. Please try again.");
            }
            else {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                alert(`❌ Error adding comment: ${errorMessage}`);
            }
        }
        finally {
            // Remove from adding comments set
            setAddingComments(prev => {
                const newSet = new Set(prev);
                newSet.delete(postKey);
                return newSet;
            });
        }
    };
    // User authentication effect
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                let profile = await loadUserProfile(currentUser.uid);
                if (!profile) {
                    const newProfile = {
                        uid: currentUser.uid,
                        username: currentUser.email?.split('@')[0] || "User",
                        displayName: currentUser.email?.split('@')[0] || "User",
                        profilePic: "",
                        email: currentUser.email || "",
                        friends: [],
                        role: "user",
                        backgroundUrl: ""
                    };
                    await setDoc(doc(db, "users", currentUser.uid), {
                        username: newProfile.username,
                        displayName: newProfile.displayName,
                        profilePic: newProfile.profilePic,
                        email: newProfile.email,
                        bio: "",
                        friends: [],
                        role: "user",
                        backgroundUrl: "",
                        createdAt: new Date()
                    });
                    profile = newProfile;
                }
                setUserProfile(profile);
                await loadPosts();
            }
            else {
                navigate("/login");
            }
        });
        return () => unsubscribe();
    }, [navigate]);
    // Load posts
    const loadPosts = async () => {
        try {
            setLoading(true);
            const postsQuery = query(collection(db, "posts"), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(postsQuery);
            const postsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const postData = docSnap.data();
                const authorProfile = await loadUserProfile(postData.authorId);
                // Ensure proper data types for likes
                const likes = typeof postData.likes === 'number' ? postData.likes : 0;
                const likedBy = Array.isArray(postData.likedBy) ? postData.likedBy : [];
                const commentsWithProfiles = await Promise.all((postData.comments || []).map(async (comment) => {
                    const commentAuthor = await loadUserProfile(comment.authorId);
                    return {
                        ...comment,
                        authorProfile: commentAuthor,
                        timestamp: comment.timestamp?.toDate ? comment.timestamp.toDate() : new Date(comment.timestamp)
                    };
                }));
                return {
                    id: docSnap.id,
                    ...postData,
                    authorProfile,
                    comments: commentsWithProfiles,
                    timestamp: postData.timestamp?.toDate ? postData.timestamp.toDate() : new Date(postData.timestamp),
                    visibility: postData.visibility || 'public',
                    likes,
                    likedBy,
                    reposts: typeof postData.reposts === 'number' ? postData.reposts : 0,
                    repostedBy: Array.isArray(postData.repostedBy) ? postData.repostedBy : []
                };
            }));
            setPosts(postsData.filter(post => post.authorProfile));
        }
        catch (error) {
            console.error("Error loading posts:", error);
            alert("❌ Error loading posts. Please refresh the page.");
        }
        finally {
            setLoading(false);
        }
    };
    // Handle image upload and other functions
    const handleImageUpload = async () => {
        if (!imageFile || !user)
            return "";
        setUploading(true);
        try {
            const imageRef = ref(storage, `postImages/${user.uid}/${Date.now()}_${imageFile.name}`);
            await uploadBytes(imageRef, imageFile);
            const downloadURL = await getDownloadURL(imageRef);
            return downloadURL;
        }
        catch (error) {
            console.error("Error uploading image:", error);
            return "";
        }
        finally {
            setUploading(false);
        }
    };
    // Handle video upload
    const handleVideoUpload = async () => {
        if (!videoFile || !user)
            return "";
        setUploading(true);
        try {
            const videoRef = ref(storage, `postVideos/${user.uid}/${Date.now()}_${videoFile.name}`);
            await uploadBytes(videoRef, videoFile);
            const downloadURL = await getDownloadURL(videoRef);
            return downloadURL;
        }
        catch (error) {
            console.error("Error uploading video:", error);
            return "";
        }
        finally {
            setUploading(false);
        }
    };
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                if (file.size > 10 * 1024 * 1024) {
                    alert('Image file size must be less than 10MB');
                    return;
                }
                setImageFile(file);
                setShowImageInput(false);
            }
            else if (file.type.startsWith('video/')) {
                if (file.size > 100 * 1024 * 1024) {
                    alert('Video file size must be less than 100MB');
                    return;
                }
                setVideoFile(file);
                setShowVideoInput(false);
            }
            else {
                alert('Please select an image or video file');
                return;
            }
        }
    };
    // Enhanced add post with video support
    const handleAddPost = async () => {
        const mainPostGif = selectedGif['main-post'];
        if (!newPost.trim() && !mainPostGif && !imageFile && !videoFile)
            return;
        if (!user || !userProfile || uploading)
            return;
        // Check if user is authenticated
        if (!user.uid) {
            alert("❌ You must be logged in to create posts");
            return;
        }
        try {
            setUploading(true);
            let imageUrl = newImageUrl;
            let videoUrl = newVideoUrl;
            if (imageFile) {
                imageUrl = await handleImageUpload();
            }
            if (videoFile) {
                videoUrl = await handleVideoUpload();
            }
            const postData = {
                content: newPost.trim(),
                authorId: user.uid,
                timestamp: new Date(),
                likes: 0,
                likedBy: [],
                comments: [],
                reposts: 0,
                repostedBy: [],
                imageUrl: imageUrl || "",
                gifUrl: mainPostGif || "",
                videoUrl: videoUrl || "",
                isRepost: false,
                visibility: postVisibility,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, "posts"), postData);
            const newPostWithProfile = {
                id: docRef.id,
                ...postData,
                authorProfile: userProfile,
                timestamp: new Date(),
                createdAt: new Date(),
                lastUpdated: new Date()
            };
            setPosts([newPostWithProfile, ...posts]);
            setNewPost("");
            setNewImageUrl("");
            setNewVideoUrl("");
            setImageFile(null);
            setVideoFile(null);
            setShowImageInput(false);
            setShowVideoInput(false);
            setPostVisibility('public');
            setSelectedGif({ ...selectedGif, 'main-post': "" });
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
        catch (error) {
            console.error("Error adding post:", error);
            if (error?.code === 'permission-denied') {
                alert("❌ Permission denied. Please check your account permissions.");
            }
            else if (error?.code === 'unauthenticated') {
                alert("❌ You must be logged in to create posts.");
                navigate("/login");
            }
            else {
                alert("❌ Error creating post. Please try again.");
            }
        }
        finally {
            setUploading(false);
        }
    };
    // Enhanced like handler with better permission error handling
    const handleLike = async (postId) => {
        if (!user || likingPosts.has(postId))
            return;
        // Check if user is authenticated
        if (!user.uid) {
            alert("❌ You must be logged in to like posts");
            return;
        }
        // Add to liking posts set to prevent double-clicks
        setLikingPosts(prev => new Set(prev).add(postId));
        try {
            const postRef = doc(db, "posts", postId);
            const postSnap = await getDoc(postRef);
            if (!postSnap.exists()) {
                throw new Error("Post not found");
            }
            const postData = postSnap.data();
            const currentLikedBy = Array.isArray(postData.likedBy) ? postData.likedBy : [];
            const hasLiked = currentLikedBy.includes(user.uid);
            const updatedLikedBy = hasLiked
                ? currentLikedBy.filter((uid) => uid !== user.uid)
                : [...currentLikedBy, user.uid];
            // Ensure we're sending clean data to Firestore with proper types
            const updateData = {
                likes: updatedLikedBy.length,
                likedBy: updatedLikedBy,
                lastUpdated: new Date()
            };
            // Use serverTimestamp for better consistency
            await updateDoc(postRef, {
                ...updateData,
                lastUpdated: serverTimestamp()
            });
            // Update local state optimistically
            setPosts(prevPosts => prevPosts.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        likes: updatedLikedBy.length,
                        likedBy: updatedLikedBy
                    };
                }
                return post;
            }));
        }
        catch (error) {
            console.error("Error updating like:", error);
            // Handle specific error types
            if (error?.code === 'permission-denied') {
                alert("❌ Permission denied. Please check your account permissions and try logging out and back in.");
                // Optionally redirect to login
                // navigate("/login")
            }
            else if (error?.code === 'unauthenticated') {
                alert("❌ You must be logged in to like posts. Please log in and try again.");
                navigate("/login");
            }
            else if (error?.code === 'unavailable') {
                alert("❌ Service temporarily unavailable. Please check your internet connection and try again.");
            }
            else if (error?.code === 'deadline-exceeded') {
                alert("❌ Request timed out. Please try again.");
            }
            else {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                alert(`❌ Error updating like: ${errorMessage}`);
            }
            // Reload posts to ensure consistency
            try {
                await loadPosts();
            }
            catch (reloadError) {
                console.error("Error reloading posts:", reloadError);
            }
        }
        finally {
            // Remove from liking posts set
            setLikingPosts(prev => {
                const newSet = new Set(prev);
                newSet.delete(postId);
                return newSet;
            });
        }
    };
    // Real-time search functionality
    useEffect(() => {
        const searchPosts = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                setShowSearchResults(false);
                return;
            }
            setIsSearching(true);
            setShowSearchResults(true);
            try {
                const searchTerm = searchQuery.toLowerCase();
                const results = posts.filter(post => {
                    const contentMatch = post.content.toLowerCase().includes(searchTerm);
                    const authorMatch = post.authorProfile?.username.toLowerCase().includes(searchTerm);
                    const displayNameMatch = post.authorProfile?.displayName.toLowerCase().includes(searchTerm);
                    return contentMatch || authorMatch || displayNameMatch;
                });
                setSearchResults(results);
            }
            catch (error) {
                console.error("Error searching posts:", error);
                setSearchResults([]);
            }
            finally {
                setIsSearching(false);
            }
        };
        const debounceTimer = setTimeout(searchPosts, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, posts]);
    // Clear search when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const target = event.target;
            if (!target.closest('.search-container')) {
                setShowSearchResults(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);
    // Trending posts logic: top 10 posts by likes
    const getTrendingPosts = () => {
        return [...posts]
            .sort((a, b) => b.likes - a.likes)
            .slice(0, 10);
    };
    // Filtered posts for display with visibility handling
    const filteredPosts = searchQuery.trim()
        ? posts.filter(post => {
            // First check visibility permissions
            if (post.visibility === 'friends' && post.authorId !== user?.uid) {
                // Only show friends-only posts if the user is a friend of the author
                if (!userProfile?.friends?.includes(post.authorId) &&
                    !post.authorProfile?.friends?.includes(user?.uid)) {
                    return false;
                }
            }
            return (post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.authorProfile?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.authorProfile?.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
        })
        : showTrending
            ? getTrendingPosts().filter(post => {
                // Apply visibility filtering for trending posts too
                if (post.visibility === 'friends' && post.authorId !== user?.uid) {
                    return userProfile?.friends?.includes(post.authorId) ||
                        post.authorProfile?.friends?.includes(user?.uid);
                }
                return true;
            })
            : posts.filter(post => {
                // Regular visibility filtering for all posts
                if (post.visibility === 'friends' && post.authorId !== user?.uid) {
                    return userProfile?.friends?.includes(post.authorId) ||
                        post.authorProfile?.friends?.includes(user?.uid);
                }
                return true;
            });
    // Show loading screen while initializing
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900", children: _jsxs("div", { className: "text-center p-8 bg-white/10 backdrop-blur-md rounded-2xl shadow-xl", children: [_jsx("div", { className: "animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-purple-500 mx-auto mb-6" }), _jsx("div", { className: "text-white text-xl font-semibold", children: "Loading your timeline..." })] }) }));
    }
    if (!user || !userProfile) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900", children: _jsx("div", { className: "text-white text-xl bg-white/10 backdrop-blur-md px-10 py-8 rounded-2xl shadow-2xl", children: "Connecting..." }) }));
    }
    // Fix navigation to profile page - REVISED APPROACH
    const navigateToProfile = () => {
        // Set localStorage flag to help with authentication persistence
        localStorage.setItem('userAuthenticated', 'true');
        // Use navigate with replace option to prevent history issues
        navigate("/profile", { replace: false });
    };
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900", children: [_jsx("header", { className: "fixed top-0 left-0 right-0 bg-black/60 backdrop-blur-lg z-50 border-b border-white/10", children: _jsxs("div", { className: "max-w-4xl mx-auto px-4 py-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("div", { onClick: (e) => {
                                        e.preventDefault();
                                        navigateToProfile();
                                    }, className: "w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 ring-2 ring-white/20 cursor-pointer", children: userProfile?.profilePic ? (_jsx("img", { src: userProfile.profilePic, alt: "Profile", className: "w-full h-full object-cover" })) : (_jsx("span", { className: "w-full h-full flex items-center justify-center text-white font-bold", children: getInitials(userProfile) })) }), _jsx("div", { className: "h-16 flex items-center", children: _jsx("img", { src: logo, alt: "Legacy", className: "h-full object-contain" }) })] }), _jsxs("div", { className: "relative max-w-md w-full hidden md:block search-container", children: [_jsx(MagnifyingGlassIcon, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), onFocus: () => {
                                        if (searchQuery.trim())
                                            setShowSearchResults(true);
                                    }, placeholder: "Search posts and users...", className: "w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all duration-200" })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("button", { onClick: () => {
                                        setShowTrending(!showTrending);
                                        setShowNews(false); // Turn off news when trending is toggled
                                    }, className: `p-2 rounded-full transition-colors ${showTrending ? 'bg-orange-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`, title: "Trending Posts", children: _jsx(FireIcon, { className: "h-5 w-5" }) }), _jsx("button", { onClick: () => {
                                        setShowNews(!showNews);
                                        setShowTrending(false); // Turn off trending when news is toggled
                                        if (!showNews) {
                                            // When enabling news mode, search for recent news
                                            searchForNews("latest news");
                                        }
                                        else {
                                            // When disabling, clear search
                                            setSearchQuery("");
                                            setShowSearchResults(false);
                                        }
                                    }, className: `p-2 rounded-full transition-colors ${showNews ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`, title: "News Search", children: _jsx(NewspaperIcon, { className: "h-5 w-5" }) }), _jsx("button", { onClick: (e) => {
                                        e.preventDefault();
                                        navigateToProfile();
                                    }, className: "p-2 rounded-full bg-white/10 text-gray-300 hover:bg-white/20 transition-colors", title: "Your Profile", children: _jsx(UserIcon, { className: "h-5 w-5" }) })] })] }) }), _jsx("div", { className: "pt-20 pb-10 px-4", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsx("div", { className: "md:hidden mb-6 search-container", children: _jsxs("div", { className: "relative", children: [_jsx(MagnifyingGlassIcon, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), onFocus: () => {
                                            if (searchQuery.trim())
                                                setShowSearchResults(true);
                                        }, placeholder: "Search posts and users...", className: "w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all duration-200" })] }) }), _jsx("div", { className: "bg-white/10 backdrop-blur-sm rounded-3xl overflow-hidden mb-8 border border-white/10 shadow-xl transition-transform hover:shadow-purple-500/5", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex items-start space-x-4", children: [_jsx("div", { className: "w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 flex-shrink-0", children: userProfile.profilePic ? (_jsx("img", { src: userProfile.profilePic, alt: "Your profile", className: "w-full h-full object-cover" })) : (_jsx("span", { className: "w-full h-full flex items-center justify-center text-white font-bold", children: getInitials(userProfile) })) }), _jsxs("div", { className: "flex-1", children: [_jsx("textarea", { value: newPost, onChange: (e) => setNewPost(e.target.value), placeholder: "What's on your mind?", className: "w-full p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm sm:text-base", rows: 3 }), showImageInput && (_jsx("div", { className: "mt-3", children: _jsx("input", { type: "url", placeholder: "Enter image URL", value: newImageUrl, onChange: (e) => setNewImageUrl(e.target.value), className: "w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" }) })), showVideoInput && (_jsxs("div", { className: "mt-3", children: [_jsx("input", { type: "url", placeholder: "Enter video URL (YouTube, Vimeo, direct links, etc.)", value: newVideoUrl, onChange: (e) => setNewVideoUrl(e.target.value), className: "w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" }), _jsx("div", { className: "mt-2 text-xs text-gray-400", children: "\uD83D\uDCA1 Tip: For YouTube videos, use youtu.be/VIDEO_ID or youtube.com/embed/VIDEO_ID format" })] })), imageFile && (_jsxs("div", { className: "mt-3 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between", children: [_jsxs("p", { className: "text-gray-300 text-sm truncate flex-1", children: ["\uD83D\uDCF8 ", imageFile.name] }), _jsx("button", { onClick: () => setImageFile(null), className: "ml-2 text-red-400 hover:text-red-300 p-1", children: _jsx(XMarkIcon, { className: "h-5 w-5" }) })] })), videoFile && (_jsxs("div", { className: "mt-3 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between", children: [_jsxs("p", { className: "text-gray-300 text-sm truncate flex-1", children: ["\uD83C\uDFA5 ", videoFile.name] }), _jsx("button", { onClick: () => setVideoFile(null), className: "ml-2 text-red-400 hover:text-red-300 p-1", children: _jsx(XMarkIcon, { className: "h-5 w-5" }) })] })), selectedGif['main-post'] && (_jsxs("div", { className: "mt-3 relative", children: [_jsx("img", { src: selectedGif['main-post'], alt: "Selected GIF", className: "max-h-48 rounded-lg border border-purple-400" }), _jsx("button", { className: "absolute top-2 right-2 bg-black/80 rounded-full p-1", onClick: () => setSelectedGif({ ...selectedGif, 'main-post': "" }), children: _jsx(XMarkIcon, { className: "h-4 w-4 text-white" }) })] }))] })] }), _jsxs("div", { className: "flex flex-col mt-5 pt-3 border-t border-white/5 space-y-3", children: [_jsxs("div", { className: "flex items-center space-x-2 flex-wrap", children: [_jsx("input", { ref: fileInputRef, type: "file", accept: "image/*,video/*", onChange: handleFileSelect, className: "hidden" }), _jsxs("button", { onClick: () => fileInputRef.current?.click(), className: "flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors", children: [_jsx(PhotoIcon, { className: "h-5 w-5" }), _jsx("span", { className: "text-sm", children: "Media" })] }), _jsxs("button", { onClick: () => setShowImageInput(!showImageInput), className: "flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors", children: [_jsx(LinkIcon, { className: "h-5 w-5" }), _jsx("span", { className: "text-sm", children: "Image URL" })] }), _jsxs("button", { onClick: () => setShowVideoInput(!showVideoInput), className: "flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors", children: [_jsx("svg", { className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" }) }), _jsx("span", { className: "text-sm", children: "Video URL" })] }), _jsxs("button", { onClick: () => setShowPostGifPicker(!showPostGifPicker), className: "flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors", children: [_jsx(GifIcon, { className: "h-5 w-5" }), _jsx("span", { className: "text-sm", children: "GIF" })] }), _jsxs("div", { className: "flex rounded-xl overflow-hidden border border-white/10", children: [_jsxs("button", { onClick: () => setPostVisibility('public'), className: `flex items-center space-x-1 px-3 py-1.5 text-sm transition-colors ${postVisibility === 'public'
                                                                    ? 'bg-purple-600 text-white font-medium'
                                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'}`, title: "Visible to everyone", children: [_jsx(GlobeAltIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Public" })] }), _jsxs("button", { onClick: () => setPostVisibility('friends'), className: `flex items-center space-x-1 px-3 py-1.5 text-sm transition-colors ${postVisibility === 'friends'
                                                                    ? 'bg-purple-600 text-white font-medium'
                                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'}`, title: "Only visible to your friends", children: [_jsx(UserGroupIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Friends" })] })] })] }), _jsx("div", { className: "flex justify-center", children: _jsxs("button", { onClick: handleAddPost, disabled: (!newPost.trim() && !selectedGif['main-post'] && !imageFile && !videoFile) || uploading, className: "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-purple-900/20", children: [uploading && (_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" })), _jsx("span", { children: uploading ? "Posting..." : "Share Post" })] }) })] }), showPostGifPicker && (_jsxs("div", { className: "mt-4 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10", children: [_jsxs("div", { className: "flex items-center mb-3", children: [_jsx("input", { type: "text", placeholder: "Search for GIFs...", value: gifSearchQuery, onChange: (e) => setGifSearchQuery(e.target.value), onKeyUp: (e) => {
                                                            if (e.key === 'Enter') {
                                                                searchGifs(gifSearchQuery, 'main-post');
                                                            }
                                                        }, className: "flex-1 p-2 text-sm bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:ring-1 focus:ring-purple-500" }), _jsx("button", { onClick: () => searchGifs(gifSearchQuery, 'main-post'), className: "ml-2 p-2 bg-purple-600 rounded-lg text-white", children: _jsx(MagnifyingGlassIcon, { className: "h-4 w-4" }) })] }), loadingGifs ? (_jsx("div", { className: "flex justify-center p-4", children: _jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent" }) })) : (_jsx("div", { className: "grid grid-cols-3 gap-2 max-h-60 overflow-y-auto", children: gifs.map((gif) => (_jsx("div", { className: "cursor-pointer hover:ring-2 hover:ring-purple-500 rounded", onClick: () => handlePostGifSelect(gif.images.fixed_height.url), children: _jsx("img", { src: gif.images.fixed_height.url, alt: gif.title, className: "w-full h-24 object-cover rounded" }) }, gif.id))) })), _jsxs("div", { className: "flex justify-between items-center mt-3 text-xs text-gray-400", children: [_jsx("span", { children: "Powered by GIPHY" }), _jsx("button", { onClick: () => setShowPostGifPicker(false), className: "text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded", children: "Close" })] })] }))] }) }), filteredPosts.length > 0 && (_jsxs("div", { className: "flex items-center justify-between mb-5", children: [_jsxs("div", { className: "text-sm font-medium text-gray-300", children: [showNews ? '📰 News Feed' : showTrending ? '🔥 Trending Now' : '✨ Latest Posts', " \u00B7 ", filteredPosts.length, " ", filteredPosts.length === 1 ? 'post' : 'posts'] }), _jsxs("button", { onClick: () => {
                                        setSearchQuery("");
                                        setShowSearchResults(false);
                                        setShowTrending(false);
                                        setShowNews(false); // Also reset news state
                                    }, className: `${searchQuery || showTrending || showNews ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} text-sm flex items-center space-x-1 text-gray-400 hover:text-white transition-opacity`, children: [_jsx(XMarkIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Clear Filters" })] })] })), _jsx("div", { className: "space-y-6", children: filteredPosts.map((post, index) => {
                                const postKey = `${post.id}-${index}`;
                                const isSearchResult = searchQuery.trim() && filteredPosts.length < posts.length;
                                const isLiking = likingPosts.has(post.id);
                                const isAddingComment = addingComments.has(postKey);
                                return (_jsxs("div", { id: `post-${post.id}`, className: `bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm rounded-3xl overflow-hidden border border-white/10 shadow-xl hover:shadow-purple-500/10 ${isSearchResult ? 'ring-2 ring-purple-500/30' : ''}`, style: {
                                        opacity: 1,
                                        visibility: 'visible',
                                        transition: 'none' // Remove problematic transitions
                                    }, children: [_jsxs("div", { className: "flex items-center justify-between p-4 sm:p-5", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("button", { onClick: () => navigate(`/user/${post.authorProfile.username}`), className: "w-11 h-11 rounded-full overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 ring-2 ring-white/10 hover:ring-white/30 transition-all", children: post.authorProfile?.profilePic ? (_jsx("img", { src: post.authorProfile.profilePic, alt: post.authorProfile.username, className: "w-full h-full object-cover" })) : (_jsx("span", { className: "w-full h-full flex items-center justify-center text-white font-bold", children: getInitials(post.authorProfile) })) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { onClick: () => navigate(`/user/${post.authorProfile.username}`), className: "font-semibold text-white hover:text-purple-300 transition-colors", children: post.authorProfile?.displayName || post.authorProfile?.username }), getRoleBadge(post.authorProfile?.role)] }), _jsxs("div", { className: "flex items-center text-gray-400 text-sm", children: [_jsxs("span", { children: ["@", post.authorProfile?.username] }), _jsx("span", { className: "mx-1.5", children: "\u2022" }), _jsx("span", { children: formatTime(post.timestamp) }), _jsx("span", { className: "mx-1.5", children: "\u2022" }), _jsx("span", { className: "text-xs px-2 py-0.5 bg-white/10 rounded-full", children: post.visibility === 'friends' ? 'Friends' : 'Public' })] })] })] }), _jsxs("div", { className: "relative", children: [_jsx("button", { onClick: () => setShowDropdown(prev => ({ ...prev, [postKey]: !prev[postKey] })), className: "p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors", children: _jsx(EllipsisVerticalIcon, { className: "h-5 w-5" }) }), showDropdown[postKey] && (_jsx("div", { className: "absolute right-0 top-full mt-2 w-56 bg-black/80 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl z-50 overflow-hidden", children: canEditPost(post) && (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => {
                                                                            setEditingPost(post.id);
                                                                            setEditContent(post.content);
                                                                            setShowDropdown(prev => ({ ...prev, [postKey]: false }));
                                                                        }, className: "w-full text-left px-4 py-3 text-blue-400 hover:bg-white/10 transition-colors flex items-center space-x-3", children: [_jsx(PencilIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Edit Post" })] }), _jsxs("button", { onClick: () => {
                                                                            handleDeletePost(post.id);
                                                                            setShowDropdown(prev => ({ ...prev, [postKey]: false }));
                                                                        }, className: "w-full text-left px-4 py-3 text-red-500 hover:bg-white/10 transition-colors flex items-center space-x-3", children: [_jsx(TrashIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Delete Post" })] })] })) }))] })] }), _jsx("div", { className: "px-5", children: editingPost === post.id ? (_jsxs("div", { className: "mb-4 space-y-3", children: [_jsx("textarea", { value: editContent, onChange: (e) => setEditContent(e.target.value), className: "w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500", rows: 3 }), _jsxs("div", { className: "flex space-x-2", children: [_jsx("button", { onClick: () => handleEditPost(post.id), className: "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors", children: "Save Changes" }), _jsx("button", { onClick: () => {
                                                                    setEditingPost(null);
                                                                    setEditContent("");
                                                                }, className: "bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors", children: "Cancel" })] })] })) : (_jsx("div", { className: "mb-5", children: _jsx("p", { className: "text-white text-base leading-relaxed whitespace-pre-wrap break-words", children: isSearchResult ? (_jsx("span", { dangerouslySetInnerHTML: {
                                                            __html: highlightSearchTerm(post.content, searchQuery)
                                                        } })) : (post.content) }) })) }), post.videoUrl && editingPost !== post.id && (_jsx("div", { className: "mt-3 relative", children: post.videoUrl.includes('youtube.com') || post.videoUrl.includes('youtu.be') ? (_jsx("div", { className: "aspect-video bg-black/20 rounded-lg overflow-hidden", children: _jsx("iframe", { src: getYouTubeEmbedUrl(post.videoUrl), className: "w-full h-full", frameBorder: "0", allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture", allowFullScreen: true, title: "YouTube video", loading: "lazy" }) })) : post.videoUrl.includes('vimeo.com') ? (_jsx("div", { className: "aspect-video bg-black/20 rounded-lg overflow-hidden", children: _jsx("iframe", { src: getVimeoEmbedUrl(post.videoUrl), className: "w-full h-full", frameBorder: "0", allow: "autoplay; fullscreen; picture-in-picture", allowFullScreen: true, title: "Vimeo video", loading: "lazy" }) })) : (_jsx("div", { className: "bg-black/20 rounded-lg overflow-hidden", children: _jsx("video", { src: post.videoUrl, controls: true, className: "w-full max-h-96 bg-black", preload: "metadata", style: { display: 'block', opacity: 1 }, onError: (e) => {
                                                        const target = e.currentTarget;
                                                        target.style.display = 'none';
                                                        const parent = target.parentElement;
                                                        if (parent && !parent.querySelector('.error-message')) {
                                                            const errorDiv = document.createElement('div');
                                                            errorDiv.className = 'error-message py-3 px-4 text-center text-red-400 bg-red-500/10 rounded-lg';
                                                            errorDiv.textContent = 'Video could not be loaded';
                                                            parent.appendChild(errorDiv);
                                                        }
                                                    }, children: "Your browser does not support the video tag." }) })) })), post.imageUrl && editingPost !== post.id && (_jsx("div", { className: "mt-3 relative bg-black/10 rounded-lg overflow-hidden", children: _jsx("img", { src: post.imageUrl, alt: "Post image", className: "w-full max-h-96 object-cover", style: {
                                                    display: 'block',
                                                    opacity: 1,
                                                    transition: 'none'
                                                }, onLoad: (e) => {
                                                    e.currentTarget.style.opacity = '1';
                                                }, onError: (e) => {
                                                    const target = e.currentTarget;
                                                    target.style.display = 'none';
                                                    const parent = target.parentElement;
                                                    if (parent && !parent.querySelector('.error-message')) {
                                                        const errorDiv = document.createElement('div');
                                                        errorDiv.className = 'error-message py-3 px-4 text-center text-red-400 bg-red-500/10 rounded-lg';
                                                        errorDiv.textContent = 'Image could not be loaded';
                                                        parent.appendChild(errorDiv);
                                                    }
                                                }, loading: "lazy" }) })), post.gifUrl && editingPost !== post.id && (_jsx("div", { className: "mt-3 relative bg-black/10 rounded-lg overflow-hidden", children: _jsx("img", { src: post.gifUrl, alt: "Post GIF", className: "w-full max-h-96 object-cover", style: {
                                                    display: 'block',
                                                    opacity: 1,
                                                    transition: 'none'
                                                }, onLoad: (e) => {
                                                    e.currentTarget.style.opacity = '1';
                                                }, onError: (e) => {
                                                    const target = e.currentTarget;
                                                    target.style.display = 'none';
                                                    const parent = target.parentElement;
                                                    if (parent && !parent.querySelector('.error-message')) {
                                                        const errorDiv = document.createElement('div');
                                                        errorDiv.className = 'error-message py-3 px-4 text-center text-red-400 bg-red-500/10 rounded-lg';
                                                        errorDiv.textContent = 'GIF could not be loaded';
                                                        parent.appendChild(errorDiv);
                                                    }
                                                }, loading: "lazy" }) })), _jsx("div", { className: "p-4 sm:p-5 flex flex-wrap items-center justify-between border-t border-white/10", children: _jsxs("div", { className: "flex items-center space-x-6", children: [_jsxs("button", { onClick: () => handleLike(post.id), disabled: isLiking, className: `flex items-center space-x-2 ${post.likedBy.includes(user?.uid || '')
                                                            ? 'text-red-500'
                                                            : 'text-gray-400 hover:text-red-400'} ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`, style: { transition: 'none' }, children: [isLiking ? (_jsx("div", { className: "animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" })) : (_jsx(HeartIcon, { className: `h-5 w-5 ${post.likedBy.includes(user?.uid || '') ? 'fill-current' : ''}` })), _jsx("span", { className: "font-medium", children: post.likes || 0 })] }), _jsxs("button", { onClick: () => setShowComments(prev => ({ ...prev, [postKey]: !prev[postKey] })), className: `flex items-center space-x-2 ${showComments[postKey]
                                                            ? 'text-blue-500'
                                                            : 'text-gray-400 hover:text-blue-400'}`, style: { transition: 'none' }, children: [_jsx(ChatBubbleOvalLeftEllipsisIcon, { className: "h-5 w-5" }), _jsx("span", { className: "font-medium", children: post.comments.length || 0 })] }), _jsxs("button", { onClick: () => handleShare(post), className: "flex items-center space-x-2 text-gray-400 hover:text-green-400", style: { transition: 'none' }, children: [_jsx(ShareIcon, { className: "h-5 w-5" }), _jsx("span", { className: "font-medium", children: "Share" })] })] }) }), showComments[postKey] && (_jsx("div", { className: "border-t border-white/10 bg-white/5", children: _jsxs("div", { className: "p-4 sm:p-5 space-y-4", children: [_jsxs("div", { className: "flex space-x-3", children: [_jsx("div", { className: "w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 flex-shrink-0", children: userProfile?.profilePic ? (_jsx("img", { src: userProfile.profilePic, alt: "Your profile", className: "w-full h-full object-cover", style: { opacity: 1, transition: 'none' } })) : (_jsx("span", { className: "w-full h-full flex items-center justify-center text-white text-xs font-bold", children: getInitials(userProfile) })) }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex space-x-2 mb-2", children: [_jsx("input", { type: "text", placeholder: "Add your comment...", value: commentInputs[postKey] || "", onChange: (e) => setCommentInputs({ ...commentInputs, [postKey]: e.target.value }), disabled: isAddingComment, className: "flex-1 p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm disabled:opacity-50", style: { transition: 'none' }, onKeyPress: (e) => {
                                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                                        e.preventDefault();
                                                                                        handleAddComment(post.id, index);
                                                                                    }
                                                                                } }), _jsx("button", { onClick: () => handleAddComment(post.id, index), disabled: isAddingComment || (!commentInputs[postKey]?.trim() && !selectedGif[postKey]), className: "bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium", style: { transition: 'none' }, children: isAddingComment ? (_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" })) : ("Comment") })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("button", { onClick: () => setShowGifPicker(prev => ({
                                                                                    ...prev,
                                                                                    [postKey]: !prev[postKey]
                                                                                })), className: "text-gray-400 hover:text-purple-400 flex items-center space-x-1 text-sm", title: "Add a GIF", style: { transition: 'none' }, children: [_jsx(GifIcon, { className: "h-5 w-5" }), _jsx("span", { children: "GIF" })] }), selectedGif[postKey] && (_jsxs("div", { className: "relative ml-2", children: [_jsx("img", { src: selectedGif[postKey], alt: "Selected GIF", className: "h-12 rounded border border-purple-400", style: { opacity: 1, transition: 'none' } }), _jsx("button", { className: "absolute -top-1 -right-1 bg-black/80 rounded-full p-0.5", onClick: () => setSelectedGif({ ...selectedGif, [postKey]: "" }), children: _jsx(XMarkIcon, { className: "h-3 w-3 text-white" }) })] }))] }), showGifPicker[postKey] && (_jsxs("div", { className: "mt-3 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10", children: [_jsxs("div", { className: "flex items-center mb-3", children: [_jsx("input", { type: "text", placeholder: "Search for GIFs...", value: gifSearchQuery, onChange: (e) => setGifSearchQuery(e.target.value), onKeyUp: (e) => {
                                                                                            if (e.key === 'Enter') {
                                                                                                searchGifs(gifSearchQuery, postKey);
                                                                                            }
                                                                                        }, className: "flex-1 p-2 text-sm bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:ring-1 focus:ring-purple-500" }), _jsx("button", { onClick: () => searchGifs(gifSearchQuery, postKey), className: "ml-2 p-2 bg-purple-600 rounded-lg text-white", children: _jsx(MagnifyingGlassIcon, { className: "h-4 w-4" }) })] }), loadingGifs ? (_jsx("div", { className: "flex justify-center p-4", children: _jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent" }) })) : (_jsx("div", { className: "grid grid-cols-3 gap-2 max-h-60 overflow-y-auto", children: gifs.map((gif) => (_jsx("div", { className: "cursor-pointer hover:ring-2 hover:ring-purple-500 rounded", onClick: () => handleGifSelect(postKey, gif.images.fixed_height.url), children: _jsx("img", { src: gif.images.fixed_height.url, alt: gif.title, className: "w-full h-24 object-cover rounded" }) }, gif.id))) })), _jsxs("div", { className: "flex justify-between items-center mt-3 text-xs text-gray-400", children: [_jsx("span", { children: "Powered by GIPHY" }), _jsx("button", { onClick: () => setShowGifPicker({ ...showGifPicker, [postKey]: false }), className: "text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded", children: "Close" })] })] }))] })] }), post.comments.length > 0 ? (_jsx("div", { className: "space-y-3", children: post.comments.map((comment) => (_jsxs("div", { className: "flex space-x-3 p-3 bg-white/5 rounded-2xl", children: [_jsx("div", { className: "w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 flex-shrink-0", children: comment.authorProfile?.profilePic ? (_jsx("img", { src: comment.authorProfile.profilePic, alt: comment.authorProfile.username, className: "w-full h-full object-cover", style: { opacity: 1, transition: 'none' } })) : (_jsx("span", { className: "w-full h-full flex items-center justify-center text-white text-xs font-bold", children: getInitials(comment.authorProfile) })) }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { onClick: () => navigate(`/user/${comment.authorProfile.username}`), className: "font-medium text-white hover:text-purple-300 text-sm", style: { transition: 'none' }, children: comment.authorProfile?.displayName || comment.authorProfile?.username }), _jsx("span", { className: "text-gray-400 text-xs", children: formatTime(comment.timestamp) })] }), canDeleteComment(comment, post) && (_jsx("button", { onClick: () => handleDeleteComment(post.id, comment.id), className: "text-red-500 hover:text-red-400 p-1 rounded-full hover:bg-white/10", title: "Delete comment", style: { transition: 'none' }, children: _jsx(TrashIcon, { className: "h-4 w-4" }) }))] }), comment.content && (_jsx("p", { className: "text-gray-200 text-sm mb-2", children: comment.content })), comment.gifUrl && (_jsx("img", { src: comment.gifUrl, alt: "GIF", className: "mt-1 max-h-32 rounded-lg", style: { opacity: 1, transition: 'none' } }))] })] }, comment.id))) })) : (_jsx("div", { className: "text-center py-4 text-gray-400 text-sm", children: "No comments yet. Be the first to comment!" }))] }) }))] }, postKey));
                            }) }), filteredPosts.length === 0 && (_jsx("div", { className: "bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-8 text-center shadow-xl", children: searchQuery.trim() ? (_jsxs("div", { className: "space-y-4", children: [_jsx(MagnifyingGlassIcon, { className: "h-16 w-16 text-gray-400 mx-auto" }), _jsx("h3", { className: "text-white text-xl font-semibold", children: "No posts found" }), _jsxs("p", { className: "text-gray-400", children: ["We couldn't find any posts matching \"", searchQuery, "\""] }), _jsx("button", { onClick: () => {
                                            setSearchQuery("");
                                            setShowSearchResults(false);
                                        }, className: "bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl transition-colors shadow-lg", children: "Clear Search" })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "bg-gradient-to-r from-purple-600 to-pink-600 h-20 w-20 rounded-full flex items-center justify-center mx-auto", children: _jsx(UserIcon, { className: "h-10 w-10 text-white" }) }), _jsx("h3", { className: "text-white text-xl font-semibold", children: "Welcome to Legacy!" }), _jsx("p", { className: "text-gray-400 max-w-md mx-auto", children: "Your timeline is empty. Create your first post or follow other users to see their posts here." })] })) }))] }) })] }));
}
export default Posts;
