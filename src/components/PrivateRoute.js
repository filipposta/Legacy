import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { Navigate } from "react-router-dom";
const PrivateRoute = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    if (loading)
        return _jsx("div", { className: "p-8 text-center", children: "Loading..." });
    return user ? children : _jsx(Navigate, { to: "/login" });
};
export default PrivateRoute;
