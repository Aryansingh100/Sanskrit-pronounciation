import { useEffect, useState } from "react";

import {
    auth,
    onAuthStateChanged,
    signOut
} from "../firebase-config";

export function useAuth() {
    const [user, setUser] = useState(undefined);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        return unsubscribe;
    }, []);

    const signOutUser = () => {
        return signOut(auth);
    };

    return {
        user,
        signOutUser
    };
}